const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// POST /api/seller/set-role  — set user role (buyer or seller)
router.post('/set-role', authenticate, async (req, res) => {
  const { role } = req.body;
  if (!['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error: 'role must be buyer or seller' });
  }
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ role });
});

// POST /api/seller/setup-complete  — mark seller onboarding done
router.post('/setup-complete', authenticate, async (req, res) => {
  const { error } = await supabase
    .from('users')
    .update({ seller_setup_complete: true })
    .eq('id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// GET /api/seller/status  — returns seller setup status for current user
router.get('/status', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('users')
    .select('role, trustap_seller_user_id, seller_setup_complete')
    .eq('id', req.user.id)
    .single();
  return res.json(data || {});
});

module.exports = router;
