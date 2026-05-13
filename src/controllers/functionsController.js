const { supabase } = require('../config/supabase');
const { insertAuditLog } = require('../utils/auditLog');
const trustap = require('../services/trustapService');
const {
  sendPaymentSuccessToSender,
  sendPaymentReceivedToReceiver,
  sendTransactionReleasedToSender,
  sendTransactionReleasedToReceiver,
} = require('../utils/email');

// Helper — get user profile
async function getProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) throw Object.assign(new Error('User profile not found'), { status: 404 });
  return data;
}

// Get or create Trustap guest user ID for a TrustDepo user.
// Stores the Trustap user ID in the users table for reuse.
async function getOrCreateTrustapUser(profile, ip = '0.0.0.0') {
  if (profile.trustap_user_id) return profile.trustap_user_id;

  const nameParts = (profile.full_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || 'User';
  const lastName  = nameParts.slice(1).join(' ') || 'User';

  const { id } = await trustap.createGuestUser(profile.email, firstName, lastName, ip);
  const trustapId = String(id);

  await supabase
    .from('users')
    .update({ trustap_user_id: trustapId })
    .eq('id', profile.id);

  return trustapId;
}

// POST /api/functions/createEscrow
// Body: { title, amount, receiver_email, receiver_name?, notes?, release_date? }
async function createEscrow(req, res, next) {
  try {
    const { title, amount, receiver_email, receiver_name, notes, release_date } = req.body;

    if (!title || !amount || !receiver_email) {
      return res.status(400).json({ error: 'title, amount, and receiver_email are required' });
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const profile = await getProfile(req.user.id);

    if (profile.email === receiver_email.toLowerCase().trim()) {
      return res.status(400).json({ error: 'You cannot create a transaction with yourself' });
    }

    const { data: receiverProfile } = await supabase
      .from('users')
      .select('id, full_name, email, trustap_user_id')
      .eq('email', receiver_email.toLowerCase().trim())
      .maybeSingle();

    if (!receiverProfile) {
      return res.status(404).json({
        error: 'This email is not registered on TrustDepo. The receiver must sign up first.',
      });
    }

    const clientIp = req.ip || req.socket?.remoteAddress || '0.0.0.0';

    // Get / create Trustap guest users for both parties
    // sender = buyer (pays), receiver = seller (receives funds)
    console.log('[Trustap] creating/fetching guest users...');
    const [buyerTrustapId, sellerTrustapId] = await Promise.all([
      getOrCreateTrustapUser(profile, clientIp),
      getOrCreateTrustapUser(receiverProfile, '0.0.0.0'),
    ]);
    console.log('[Trustap] buyer:', buyerTrustapId, '| seller:', sellerTrustapId);

    // Amount in smallest currency unit (pence for GBP)
    const priceInPence = Math.round(Number(amount) * 100);

    // Get Trustap fee for this amount
    const trustapCurrency = process.env.TRUSTAP_CURRENCY || 'gbp';
    console.log('[Trustap] getting charge for', priceInPence, trustapCurrency + '...');
    const chargeInfo = await trustap.getCharge(priceInPence, trustapCurrency);
    console.log('[Trustap] charge:', JSON.stringify(chargeInfo));

    // Create P2P transaction with both parties as guest users (card payment)
    console.log('[Trustap] creating P2P transaction...');
    const trustapTx = await trustap.createP2PTransaction({
      sellerTrustapId,
      buyerTrustapId,
      description: title,
      currency: trustapCurrency,
      depositPrice:            chargeInfo.price,
      depositCharge:           chargeInfo.charge,
      chargeCalculatorVersion: chargeInfo.charge_calculator_version,
      chargeConfig:            chargeInfo.charge_config,
    });

    // Get Stripe client secret so buyer can pay via card
    let stripeClientSecret = null;
    try {
      const secretData = await trustap.getStripeClientSecret(trustapTx.id, buyerTrustapId);
      stripeClientSecret = secretData.client_secret;
    } catch (e) {
      console.warn('[Trustap] getStripeClientSecret failed:', e.message);
    }

    // Persist in our DB
    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert({
        title,
        amount: Number(amount),
        sender_id: req.user.id,
        sender_email: profile.email,
        sender_name: profile.full_name || profile.email,
        receiver_email: receiver_email.toLowerCase().trim(),
        receiver_name: receiverProfile.full_name || receiver_name || null,
        notes: notes || null,
        release_date: release_date || null,
        status: 'pending_deposit',
        trustap_transaction_id: String(trustapTx.id),
        trustap_buyer_id: buyerTrustapId,
        trustap_seller_id: sellerTrustapId,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await insertAuditLog({
      actorName: profile.full_name || profile.email,
      actorEmail: profile.email,
      action: 'transaction_created',
      targetType: 'transaction',
      targetId: data.id,
      targetLabel: title,
      severity: 'low',
      details: { amount: Number(amount), receiver_email, trustap_transaction_id: trustapTx.id },
    });

    // Send email notifications (fire-and-forget)
    Promise.all([
      sendPaymentReceivedToReceiver({
        to: receiverProfile.email,
        name: receiverProfile.full_name || receiverProfile.email,
        senderName: profile.full_name || profile.email,
        amount: Number(amount),
        title,
        transactionId: data.id,
        date: data.created_at || new Date(),
      }),
    ]).catch(err => console.error('[EMAIL] createEscrow email error:', err.message));

    return res.status(201).json({ ...data, stripe_client_secret: stripeClientSecret });
  } catch (err) {
    next(err);
  }
}

// POST /api/functions/confirmEscrow
// Body: { transaction_id }
async function confirmEscrow(req, res, next) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    const profile = await getProfile(req.user.id);

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txErr || !tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const isSender   = tx.sender_email === profile.email;
    const isReceiver = tx.receiver_email === profile.email;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: 'You are not a party to this transaction' });
    }

    if (['released', 'cancelled', 'disputed', 'paused'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot confirm a transaction with status: ${tx.status}` });
    }

    // Both parties must confirm handover — triggers fund release on Trustap
    const userTrustapId = isSender ? tx.trustap_buyer_id : tx.trustap_seller_id;
    if (tx.trustap_transaction_id && userTrustapId) {
      try {
        await trustap.confirmHandover(tx.trustap_transaction_id, userTrustapId);
      } catch (e) {
        console.error('[Trustap] confirmHandover failed:', e.message);
      }
    }

    // Build update payload
    const updates = {};
    if (isSender)   updates.sender_confirmed   = true;
    if (isReceiver) updates.receiver_confirmed = true;

    const newSenderConfirmed   = isSender   ? true : tx.sender_confirmed;
    const newReceiverConfirmed = isReceiver ? true : tx.receiver_confirmed;

    // Both confirmed → release
    if (newSenderConfirmed && newReceiverConfirmed) {
      updates.status = 'released';
    } else if (isSender) {
      updates.status = 'sender_confirmed';
    } else if (newReceiverConfirmed) {
      updates.status = 'receiver_confirmed';
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update(updates)
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Send release emails when fully released
    if (data.status === 'released') {
      const releasePayload = {
        amount: data.amount,
        title: data.title || 'Secure Payment',
        transactionId: data.id,
        date: new Date(),
      };
      Promise.all([
        sendTransactionReleasedToSender({
          ...releasePayload,
          to: data.sender_email,
          name: data.sender_name || data.sender_email,
        }),
        sendTransactionReleasedToReceiver({
          ...releasePayload,
          to: data.receiver_email,
          name: data.receiver_name || data.receiver_email,
          senderName: data.sender_name || data.sender_email,
        }),
      ]).catch(err => console.error('[EMAIL] confirmEscrow email error:', err.message));
    }

    await insertAuditLog({
      actorName: profile.full_name || profile.email,
      actorEmail: profile.email,
      action: 'transaction_confirmed',
      targetType: 'transaction',
      targetId: transaction_id,
      targetLabel: tx.title || transaction_id,
      severity: 'low',
      details: { new_status: data.status },
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/functions/cancelEscrow
// Body: { transaction_id }
async function cancelEscrow(req, res, next) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    const profile = await getProfile(req.user.id);

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txErr || !tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const isParty = tx.sender_email === profile.email || tx.receiver_email === profile.email;
    if (!isParty) {
      return res.status(403).json({ error: 'You are not a party to this transaction' });
    }

    if (['released', 'cancelled'].includes(tx.status)) {
      return res.status(400).json({ error: `Transaction is already ${tx.status}` });
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'cancelled' })
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await insertAuditLog({
      actorName: profile.full_name || profile.email,
      actorEmail: profile.email,
      action: 'transaction_cancelled',
      targetType: 'transaction',
      targetId: transaction_id,
      targetLabel: tx.title || transaction_id,
      severity: 'medium',
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/functions/disputeEscrow
// Body: { transaction_id, reason, file_url? }
async function disputeEscrow(req, res, next) {
  try {
    const { transaction_id, reason, file_url } = req.body;

    if (!transaction_id || !reason) {
      return res.status(400).json({ error: 'transaction_id and reason are required' });
    }
    if (reason.trim().length < 10) {
      return res.status(400).json({ error: 'Dispute reason must be at least 10 characters' });
    }

    const profile = await getProfile(req.user.id);

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txErr || !tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const isSender   = tx.sender_email === profile.email;
    const isReceiver = tx.receiver_email === profile.email;
    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: 'You are not a party to this transaction' });
    }

    if (['released', 'cancelled', 'disputed'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot dispute a transaction with status: ${tx.status}` });
    }

    // File complaint on Trustap
    const userTrustapId = isSender ? tx.trustap_buyer_id : tx.trustap_seller_id;
    if (tx.trustap_transaction_id && userTrustapId) {
      try {
        await trustap.complain(tx.trustap_transaction_id, userTrustapId, reason.trim());
      } catch (e) {
        console.error('[Trustap] complain failed:', e.message);
      }
    }

    const updatePayload = { status: 'disputed', dispute_reason: reason.trim() };
    if (file_url) updatePayload.dispute_file_url = file_url;

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update(updatePayload)
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const ticketNumber = `DSP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await supabase.from('disputes').insert({
      ticket_number: ticketNumber,
      transaction_id: String(transaction_id),
      user_email: profile.email,
      amount: tx.amount,
      reason: reason.trim(),
      description: reason.trim(),
      priority: 'medium',
      status: 'open',
    });

    await insertAuditLog({
      actorName: profile.full_name || profile.email,
      actorEmail: profile.email,
      action: 'dispute_filed',
      targetType: 'dispute',
      targetId: transaction_id,
      targetLabel: ticketNumber,
      severity: 'high',
      details: { reason: reason.trim(), amount: tx.amount, ticket_number: ticketNumber },
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/functions/getPaymentSecret?transaction_id=...
// Returns a fresh Stripe client secret for a pending_deposit transaction (buyer only)
async function getPaymentSecret(req, res, next) {
  try {
    const { transaction_id } = req.query;
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id is required' });

    const profile = await getProfile(req.user.id);

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txErr || !tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.sender_email !== profile.email) return res.status(403).json({ error: 'Only the sender can pay' });
    if (tx.status !== 'pending_deposit') return res.status(400).json({ error: 'Transaction is not pending payment' });
    if (!tx.trustap_transaction_id || !tx.trustap_buyer_id) return res.status(400).json({ error: 'Payment not available for this transaction' });

    const secretData = await trustap.getStripeClientSecret(tx.trustap_transaction_id, tx.trustap_buyer_id);
    return res.json({ stripe_client_secret: secretData.client_secret });
  } catch (err) {
    next(err);
  }
}

// POST /api/functions/acceptDeposit
// Body: { transaction_id }
// Called by the receiver (seller) after the buyer has completed card payment
async function acceptDeposit(req, res, next) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    const profile = await getProfile(req.user.id);

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txErr || !tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (tx.receiver_email !== profile.email) {
      return res.status(403).json({ error: 'Only the receiver can accept the deposit' });
    }

    if (tx.status !== 'pending_deposit') {
      return res.status(400).json({ error: `Cannot accept deposit for a transaction with status: ${tx.status}` });
    }

    if (tx.trustap_transaction_id && tx.trustap_seller_id) {
      try {
        await trustap.acceptDeposit(tx.trustap_transaction_id, tx.trustap_seller_id);
      } catch (e) {
        console.error('[Trustap] acceptDeposit failed:', e.message);
      }
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'funded' })
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await insertAuditLog({
      actorName: profile.full_name || profile.email,
      actorEmail: profile.email,
      action: 'deposit_accepted',
      targetType: 'transaction',
      targetId: transaction_id,
      targetLabel: tx.title || transaction_id,
      severity: 'low',
      details: { new_status: 'funded' },
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/functions/withdrawalRequest
// Body: { amount }
async function withdrawalRequest(req, res, next) {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || Number(amount) < 2) {
      return res.status(400).json({ error: 'amount must be at least £2' });
    }

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: req.user.id,
        amount: Number(amount),
        status: 'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { createEscrow, getPaymentSecret, acceptDeposit, confirmEscrow, cancelEscrow, disputeEscrow, withdrawalRequest };
