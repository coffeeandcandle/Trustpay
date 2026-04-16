const { supabase } = require('../config/supabase');

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

    if (profile.email === receiver_email) {
      return res.status(400).json({ error: 'You cannot create an escrow with yourself' });
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert({
        title,
        amount: Number(amount),
        sender_id: req.user.id,
        sender_email: profile.email,
        sender_name: profile.full_name || profile.email,
        receiver_email,
        receiver_name: receiver_name || null,
        notes: notes || null,
        release_date: release_date || null,
        status: 'pending_deposit',
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

    if (['released', 'cancelled', 'disputed'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot confirm a transaction with status: ${tx.status}` });
    }

    // Build update payload
    const updates = {};
    if (isSender) updates.sender_confirmed = true;
    if (isReceiver) updates.receiver_confirmed = true;

    // Determine new status
    const newSenderConfirmed = isSender ? true : tx.sender_confirmed;
    const newReceiverConfirmed = isReceiver ? true : tx.receiver_confirmed;

    if (newSenderConfirmed && newReceiverConfirmed) {
      updates.status = 'released';
    } else if (newSenderConfirmed) {
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/functions/disputeEscrow
// Body: { transaction_id, reason }
async function disputeEscrow(req, res, next) {
  try {
    const { transaction_id, reason } = req.body;

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

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'disputed', dispute_reason: reason.trim() })
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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

    if (!amount || isNaN(amount) || Number(amount) < 100) {
      return res.status(400).json({ error: 'amount must be at least AED 100' });
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
