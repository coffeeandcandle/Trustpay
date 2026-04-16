const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  getMe,
  updateMe,
  deleteMe,
  verifyOtp,
  resendOtp,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.delete('/me', authenticate, deleteMe);

module.exports = router;
