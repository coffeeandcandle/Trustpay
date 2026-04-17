const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getBankAccounts, addBankAccount, deleteBankAccount, lookupByUsername } = require('../controllers/userController');

router.use(authenticate);

router.get('/lookup', lookupByUsername);
router.get('/bank-accounts', getBankAccounts);
router.post('/bank-accounts', addBankAccount);
router.delete('/bank-accounts/:id', deleteBankAccount);

module.exports = router;
