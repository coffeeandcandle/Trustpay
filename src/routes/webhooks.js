const router = require('express').Router();
const { supabase } = require('../config/supabase');
const trustap = require('../services/trustapService');
const { insertAuditLog } = require('../utils/auditLog');

// POST /api/webhooks/trustap
// Trustap sends event notifications here (no auth — verified by event type + transaction lookup)
router.post('/trustap', async (req, res) => {
  try {
    const event = req.body;
    console.log('[Webhook] Trustap event:', JSON.stringify(event));

    const trustapTxId = event?.transaction_id || event?.data?.transaction_id || event?.id;
    const eventType   = event?.event || event?.type || event?.status;

    if (!trustapTxId || !eventType) {
      return res.status(200).json({ received: true });
    }

    // Find matching transaction in our DB
    const { data: tx } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('trustap_transaction_id', String(trustapTxId))
      .maybeSingle();

    if (!tx) {
      console.warn('[Webhook] No transaction found for trustap_transaction_id:', trustapTxId);
      return res.status(200).json({ received: true });
    }

    // deposit_paid — buyer completed card payment
    if (['deposit_paid', 'payment_completed', 'deposit_received'].includes(eventType)) {
      if (tx.status === 'pending_deposit') {
        // Auto-accept deposit on Trustap then mark funded
        if (tx.trustap_seller_id) {
          try {
            await trustap.acceptDeposit(String(trustapTxId), tx.trustap_seller_id);
          } catch (e) {
            console.error('[Webhook] acceptDeposit failed:', e.message);
          }
        }

        await supabase
          .from('escrow_transactions')
          .update({ status: 'funded' })
          .eq('id', tx.id);

        await insertAuditLog({
          actorName: 'trustap_webhook',
          actorEmail: 'webhook@trustap.com',
          action: 'deposit_paid_webhook',
          targetType: 'transaction',
          targetId: tx.id,
          targetLabel: tx.title || tx.id,
          severity: 'low',
          details: { event: eventType, trustap_transaction_id: trustapTxId },
        });

        console.log('[Webhook] Transaction', tx.id, 'marked as funded');
      }
    }

    // transaction_released — Trustap released funds to seller
    if (['transaction_released', 'payout_released'].includes(eventType)) {
      if (!['released', 'cancelled'].includes(tx.status)) {
        await supabase
          .from('escrow_transactions')
          .update({ status: 'released' })
          .eq('id', tx.id);

        console.log('[Webhook] Transaction', tx.id, 'marked as released');
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    return res.status(200).json({ received: true }); // always 200 to prevent Trustap retries
  }
});

module.exports = router;
