const { supabase } = require('../config/supabase');
const { insertAuditLog } = require('../utils/auditLog');
const { captureAndRelease, voidAuthorization } = require('./paymentController');

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

// POST /api/functions/createEscrow
// Body: { title, amount, receiver_email, receiver_name, notes?, release_date? }
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

    // Check receiver is a registered TrustDepo user
    const { data: receiverProfile } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('email', receiver_email.toLowerCase().trim())
      .maybeSingle();

    if (!receiverProfile) {
      return res.status(404).json({ error: 'This email is not registered on TrustDepo. The receiver must sign up first.' });
    }

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
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await insertAuditLog({
      actorName: profile.full_name || profile.email, actorEmail: profile.email,
      action: 'transaction_created', targetType: 'transaction',
      targetId: data.id, targetLabel: title,
      severity: 'low', details: { amount: Number(amount), receiver_email },
    });

    return res.status(201).json(data);
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

    // Fetch the transaction
    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txErr || !tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only parties involved can confirm
    const isSender = tx.sender_email === profile.email;
    const isReceiver = tx.receiver_email === profile.email;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: 'You are not a party to this transaction' });
    }

    if (['released', 'cancelled', 'disputed', 'paused'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot confirm a transaction with status: ${tx.status}` });
    }

    // Build update payload
    const updates = {};
    if (isSender) updates.sender_confirmed = true;
    if (isReceiver) updates.receiver_confirmed = true;

    // Determine new status
    const newSenderConfirmed = isSender ? true : tx.sender_confirmed;
    const newReceiverConfirmed = isReceiver ? true : tx.receiver_confirmed;

    // Sender confirming = buyer says "I received it" = trigger Stripe capture & release
    if (isSender) {
      const released = await captureAndRelease(transaction_id);
      if (released) {
        await insertAuditLog({
          actorName: profile.full_name || profile.email, actorEmail: profile.email,
          action: 'transaction_confirmed', targetType: 'transaction',
          targetId: transaction_id, targetLabel: tx.title || transaction_id,
          severity: 'low', details: { new_status: 'released', stripe_captured: true },
        });
        return res.json(released);
      }
      // No Stripe payment — fall through to normal status update
      updates.status = 'released';
    } else if (newReceiverConfirmed) {
      updates.status = 'receiver_confirmed';
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update(updates)
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await insertAuditLog({
      actorName: profile.full_name || profile.email, actorEmail: profile.email,
      action: 'transaction_confirmed', targetType: 'transaction',
      targetId: transaction_id, targetLabel: tx.title || transaction_id,
      severity: 'low', details: { new_status: data.status },
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

    // Void Stripe hold if transaction was funded via card
    await voidAuthorization(transaction_id);

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'cancelled' })
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await insertAuditLog({
      actorName: profile.full_name || profile.email, actorEmail: profile.email,
      action: 'transaction_cancelled', targetType: 'transaction',
      targetId: transaction_id, targetLabel: tx.title || transaction_id,
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

    const isParty = tx.sender_email === profile.email || tx.receiver_email === profile.email;
    if (!isParty) {
      return res.status(403).json({ error: 'You are not a party to this transaction' });
    }

    if (['released', 'cancelled', 'disputed'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot dispute a transaction with status: ${tx.status}` });
    }

    const updatePayload = { status: 'disputed', dispute_reason: reason.trim() };
    if (file_url) updatePayload.dispute_file_url = file_url;

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update(updatePayload)
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Create admin dispute record with ticket number
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
      actorName: profile.full_name || profile.email, actorEmail: profile.email,
      action: 'dispute_filed', targetType: 'dispute',
      targetId: transaction_id, targetLabel: ticketNumber,
      severity: 'high', details: { reason: reason.trim(), amount: tx.amount, ticket_number: ticketNumber },
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
      return res.status(400).json({ error: 'amount must be at least AED 2' });
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { createEscrow, confirmEscrow, cancelEscrow, disputeEscrow, withdrawalRequest };
