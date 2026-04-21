const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createPaymentIntent, fundTransaction, handleWebhook } = require('../controllers/paymentController');

// Stripe webhook — raw body, no auth
router.post('/webhook', handleWebhook);

router.use(authenticate);

router.post('/create-payment-intent', createPaymentIntent);
router.post('/fund-transaction', fundTransaction);

module.exports = router;
