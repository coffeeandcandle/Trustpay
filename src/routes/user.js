const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getBankAccounts, addBankAccount, deleteBankAccount, lookupByUsername, savePushToken, getMyDisputes, startChat, getChatMessages, sendChatMessage } = require('../controllers/userController');
const { addBankAccount: addConnectBankAccount, getConnectStatus } = require('../controllers/connectController');

router.use(authenticate);

router.get('/lookup', lookupByUsername);
router.post('/connect/add-bank', addConnectBankAccount);
router.get('/connect/status', getConnectStatus);
router.get('/bank-accounts', getBankAccounts);
router.post('/bank-accounts', addBankAccount);
router.delete('/bank-accounts/:id', deleteBankAccount);
router.put('/push-token', savePushToken);
router.get('/disputes', getMyDisputes);
router.post('/chat/start', startChat);
router.get('/chat/messages', getChatMessages);
router.post('/chat/messages', sendChatMessage);

module.exports = router;
