const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getBankAccounts, addBankAccount, deleteBankAccount } = require('../controllers/userController');

router.use(authenticate);

router.get('/bank-accounts', getBankAccounts);
router.post('/bank-accounts', addBankAccount);
router.delete('/bank-accounts/:id', deleteBankAccount);

module.exports = router;
