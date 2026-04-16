const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listTransactions, getTransaction } = require('../controllers/transactionController');

router.use(authenticate);

router.get('/', listTransactions);
router.get('/:id', getTransaction);

module.exports = router;
