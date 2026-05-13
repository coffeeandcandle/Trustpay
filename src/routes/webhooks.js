/**
 * Webhook routes — /api/webhooks/*
 *
 * Design principles:
 *   1. Always respond 200 immediately — processing is async after the response.
 *   2. Deduplicate via webhook_events (UNIQUE provider+event_id) — prevents double-processing on retries.
 *   3. Guard terminal states — never transition out of 'released' or 'cancelled'.
 *   4. Auto-accept deposit on funding event (seller-side Trustap confirmation).
 *   5. Record payout_settled flag when funds are released.
 *   6. All state changes are audit-logged.
 */
const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { getProvider } = require('../services/payments');
const { insertAuditLog } = require('../utils/auditLog');
const logger = require('../utils/logger');

// Terminal states — no transition allowed out of these
const TERMINAL_STATES = new Set(['released', 'cancelled']);

// Maps provider event types to our internal transaction status + optional flags
const EVENT_HANDLERS = {
  // Trustap canonical event names
  'p2p.transaction.funded':             { status: 'funded',           autoAccept: true  },
  'p2p.transaction.handover_confirmed': { status: 'sender_confirmed', autoAccept: false },
  'p2p.transaction.funds_released':     { status: 'released',         payout: true      },
  'p2p.transaction.complained':         { status: 'disputed',         autoAccept: false },
  // Legacy / alternative event names
  'deposit_paid':                       { status: 'funded',           autoAccept: true  },
  'payment_completed':                  { status: 'funded',           autoAccept: true  },
  'deposit_received':                   { status: 'funded',           autoAccept: true  },
  'transaction_released':               { status: 'released',         payout: true      },
  'payout_released':                    { status: 'released',         payout: true      },
};

// ── POST /api/webhooks/trustap ─────────────────────────────────────────────────
router.post('/trustap', async (req, res) => {
  // Respond immediately — Trustap expects 2xx or it will retry
  res.status(200).json({ received: true });

  // Process after response to avoid timeout issues
  setImmediate(() => handleTrustapEvent(req.body).catch((err) => {
    logger.error('Webhook', 'Unhandled error in Trustap event handler', { error: err });
  }));
});

async function handleTrustapEvent(event) {
  const eventType = String(event?.event || event?.type || '');
  const txId      = String(event?.data?.id || event?.transaction_id || event?.data?.transaction_id || '');
  const eventId   = String(event?.id || event?.event_id || '');

  if (!eventType) {
    logger.warn('Webhook', 'Received event with no type — discarding', { event });
    return;
  }

  logger.info('Webhook', 'Received Trustap event', { eventType, txId, eventId });

  // Use eventId if provided, otherwise build a deterministic key from type+txId+timestamp
  // to avoid false deduplication on events without IDs
  const dedupeKey = eventId || `${eventType}:${txId}:${Date.now()}`;

  // ── Deduplication — insert row; skip if already exists ────────────────────
  const { error: insertErr } = await supabase
    .from('webhook_events')
    .insert({
      provider:   'trustap',
      event_id:   dedupeKey,
      event_type: eventType,
      payload:    event,
    });

  if (insertErr?.code === '23505') {
    // Unique constraint violation — already processed or in-flight
    logger.info('Webhook', 'Duplicate event — skipping', { eventType, dedupeKey });
    return;
  }

  if (insertErr) {
    // Non-duplicate DB error — log but continue processing
    logger.error('Webhook', 'Failed to insert webhook_event row', { error: insertErr });
  }

  // ── Find local transaction ────────────────────────────────────────────────
  if (!txId) {
    logger.warn('Webhook', 'Event has no transaction ID — cannot process', { eventType });
    await markProcessed(dedupeKey, 'no_transaction_id');
    return;
  }

  const { data: tx } = await supabase
    .from('escrow_transactions')
    .select('id, status, trustap_seller_id, title, receiver_email')
    .eq('trustap_transaction_id', txId)
    .maybeSingle();

  if (!tx) {
    logger.warn('Webhook', 'No local transaction for Trustap ID', { txId, eventType });
    await markProcessed(dedupeKey, 'transaction_not_found');
    return;
  }

  // ── Route to handler ──────────────────────────────────────────────────────
  const handler = EVENT_HANDLERS[eventType];
  if (!handler) {
    logger.info('Webhook', 'No handler for event type — recording only', { eventType });
    await markProcessed(dedupeKey);
    return;
  }

  // ── Guard terminal states ─────────────────────────────────────────────────
  if (TERMINAL_STATES.has(tx.status) && handler.status !== 'released') {
    logger.info('Webhook', 'Skipping — transaction in terminal state', {
      localId:   tx.id,
      current:   tx.status,
      attempted: handler.status,
    });
    await markProcessed(dedupeKey);
    return;
  }

  // ── Apply status update ───────────────────────────────────────────────────
  const updates = { status: handler.status };

  if (handler.payout) {
    updates.payout_settled    = true;
    updates.payout_settled_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from('escrow_transactions')
    .update(updates)
    .eq('id', tx.id);

  if (updateErr) {
    logger.error('Webhook', 'Failed to update transaction status', { txId: tx.id, error: updateErr });
    await markProcessed(dedupeKey, updateErr.message);
    return;
  }

  // ── Auto-accept deposit on Trustap (seller side) ──────────────────────────
  if (handler.autoAccept && tx.trustap_seller_id && tx.status === 'pending_deposit') {
    try {
      await getProvider().acceptDeposit(txId, tx.trustap_seller_id);
      logger.info('Webhook', 'Auto-accepted deposit on Trustap', { txId });
    } catch (err) {
      // Non-fatal — log and continue; seller can manually accept via app
      logger.error('Webhook', 'Auto-acceptDeposit failed', { txId, error: err });
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await insertAuditLog({
    actorName:   'trustap_webhook',
    actorEmail:  'webhook@trustap.com',
    action:      `webhook_${eventType.replace(/\./g, '_')}`,
    targetType:  'transaction',
    targetId:    tx.id,
    targetLabel: tx.title || tx.id,
    severity:    handler.payout ? 'medium' : 'low',
    details:     { eventType, trustapTxId: txId, newStatus: handler.status },
  }).catch(() => {}); // audit log is best-effort; don't fail the webhook

  // ── Mark processed ────────────────────────────────────────────────────────
  await markProcessed(dedupeKey);

  logger.info('Webhook', 'Event processed', {
    eventType,
    localTxId:  tx.id,
    newStatus:  handler.status,
    payout:     handler.payout || false,
  });
}

async function markProcessed(eventId, errorMessage) {
  const update = {
    processed:    true,
    processed_at: new Date().toISOString(),
  };
  if (errorMessage) update.processing_error = String(errorMessage);

  await supabase
    .from('webhook_events')
    .update(update)
    .eq('provider', 'trustap')
    .eq('event_id', eventId);
}

module.exports = router;
