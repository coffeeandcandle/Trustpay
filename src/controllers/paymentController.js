const Stripe = require('stripe');
const { supabase } = require('../config/supabase');
const { insertAuditLog } = require('../utils/auditLog');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PLATFORM_FEE_PERCENT = 0.02; // 2%

// POST /api/payments/create-payment-intent
// Body: { amount, transaction_id }
// Authorises the card but does NOT capture — money stays held until release
async function createPaymentIntent(req, res, next) {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured' });
    const { amount, transaction_id } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    const amountInCents = Math.round(Number(amount) * 100);
    if (amountInCents < 200) {
      return res.status(400).json({ error: 'Minimum amount is £2.00' });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', req.user.id)
      .single();

    // Verify the transaction belongs to this user and is still pending
    const { data: tx } = await supabase
      .from('escrow_transactions')
      .select('id, status, amount, title')
      .eq('id', transaction_id)
      .eq('sender_email', profile.email)
      .single();

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (tx.status !== 'pending_deposit') {
      return res.status(400).json({ error: 'Transaction is already funded or completed' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'gbp',
      capture_method: 'manual', // Hold the funds — do NOT capture yet
      metadata: {
        transaction_id,
        user_id: req.user.id,
        user_email: profile?.email || '',
        title: tx.title || '',
      },
    });

    return res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/fund-transaction
// Body: { transaction_id, payment_intent_id }
// Called after Stripe authorization succeeds — marks transaction as funded
async function fundTransaction(req, res, next) {
  try {
    const { transaction_id, payment_intent_id } = req.body;

    if (!transaction_id || !payment_intent_id) {
      return res.status(400).json({ error: 'transaction_id and payment_intent_id are required' });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', req.user.id)
      .single();

    // Verify the PaymentIntent is authorized
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (pi.status !== 'requires_capture') {
      return res.status(400).json({ error: 'Payment has not been authorized yet' });
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'funded',
        stripe_payment_intent_id: payment_intent_id,
      })
      .eq('id', transaction_id)
      .eq('sender_email', profile.email)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await insertAuditLog({
      actorName: profile.full_name || profile.email,
      actorEmail: profile.email,
      action: 'transaction_funded',
      targetType: 'transaction',
      targetId: transaction_id,
      targetLabel: data.title || transaction_id,
      severity: 'low',
      details: { amount: data.amount, payment_intent_id },
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// Called internally when buyer confirms receipt — captures Stripe hold
// Returns updated transaction
async function captureAndRelease(transaction_id) {
  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('id', transaction_id)
    .single();

  if (!tx?.stripe_payment_intent_id) return null;

  const amount = Number(tx.amount);
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT * 100) / 100;
  const sellerAmount = Math.round((amount - platformFee) * 100) / 100;

  // Capture the full authorized amount
  await stripe.paymentIntents.capture(tx.stripe_payment_intent_id);

  const { data } = await supabase
    .from('escrow_transactions')
    .update({
      status: 'released',
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      sender_confirmed: true,
      receiver_confirmed: true,
    })
    .eq('id', transaction_id)
    .select()
    .single();

  return data;
}

// Called internally when transaction is cancelled — voids Stripe hold
async function voidAuthorization(transaction_id) {
  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('stripe_payment_intent_id, status')
    .eq('id', transaction_id)
    .single();

  if (!tx?.stripe_payment_intent_id) return;
  if (tx.status === 'released') return;

  try {
    await stripe.paymentIntents.cancel(tx.stripe_payment_intent_id);
  } catch {
    // If already captured/cancelled, ignore
  }
}

// POST /api/payments/webhook
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.canceled') {
    // If payment voided, make sure transaction is cancelled
    const pi = event.data.object;
    const transaction_id = pi.metadata?.transaction_id;
    if (transaction_id) {
      await supabase
        .from('escrow_transactions')
        .update({ status: 'cancelled' })
        .eq('id', transaction_id)
        .eq('status', 'funded');
    }
  }

  res.json({ received: true });
}

module.exports = { createPaymentIntent, fundTransaction, captureAndRelease, voidAuthorization, handleWebhook };
