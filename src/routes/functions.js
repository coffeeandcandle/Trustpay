const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  createEscrow,
  confirmPayment,
  getPaymentSecret,
  acceptDeposit,
  confirmEscrow,
  cancelEscrow,
  disputeEscrow,
  withdrawalRequest,
} = require('../controllers/functionsController');

router.use(authenticate);

router.post('/createEscrow', createEscrow);
router.post('/confirmPayment', confirmPayment);
router.get('/getPaymentSecret', getPaymentSecret);
router.post('/acceptDeposit', acceptDeposit);
router.post('/confirmEscrow', confirmEscrow);
router.post('/cancelEscrow', cancelEscrow);
router.post('/disputeEscrow', disputeEscrow);
router.post('/withdrawalRequest', withdrawalRequest);

module.exports = router;
