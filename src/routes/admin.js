const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const {
  getDashboard,
  getUsers,
  updateUserStatus,
  getTransactions,
  getDisputes,
  updateDispute,
  getReports,
  createReport,
  getNotifications,
  createNotification,
  getConversations,
  createConversation,
  updateConversation,
  getMessages,
  createMessage,
  getTickets,
  updateTicket,
  getAuditLogs,
  getAdminUsers,
  inviteAdmin,
  updateAdminRole,
} = require('../controllers/adminController');

// Middleware: fetch the user's profile from public.users and attach it to the request.
// Also checks that the user has role 'admin' or 'view_only'.
async function isAdmin(req, res, next) {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Access denied: user profile not found' });
    }

    if (profile.role !== 'admin' && profile.role !== 'view_only') {
      return res.status(403).json({ error: 'Access denied: admin or view_only role required' });
    }

    // Attach profile so controllers can use it for audit logs
    req.adminProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

// All admin routes require authentication + admin role check
router.use(authenticate, isAdmin);

router.get('/dashboard', getDashboard);

router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

router.get('/transactions', getTransactions);

router.get('/disputes', getDisputes);
router.put('/disputes/:id', updateDispute);

router.get('/reports', getReports);
router.post('/reports', createReport);

router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.put('/conversations/:id', updateConversation);

router.get('/messages', getMessages);
router.post('/messages', createMessage);

router.get('/tickets', getTickets);
router.put('/tickets/:id', updateTicket);

router.get('/audit-logs', getAuditLogs);

router.get('/admins', getAdminUsers);
router.post('/admins/invite', inviteAdmin);
router.put('/admins/:id/role', updateAdminRole);

module.exports = router;
