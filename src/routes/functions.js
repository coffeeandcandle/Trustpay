const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  createEscrow,
  confirmEscrow,
  cancelEscrow,
  disputeEscrow,
  withdrawalRequest,
} = require('../controllers/functionsController');

router.use(authenticate);

router.post('/createEscrow', createEscrow);
router.post('/confirmEscrow', confirmEscrow);
router.post('/cancelEscrow', cancelEscrow);
router.post('/disputeEscrow', disputeEscrow);
router.post('/withdrawalRequest', withdrawalRequest);

module.exports = router;
