const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const trustap = require('../services/trustapService');

const REDIRECT_URI = `${process.env.API_BASE_URL || 'https://uat-api.trustdepo.com'}/api/seller/callback`;
const PAYOUT_PROFILE_URL = `https://app.stage.trustap.com/profile/payout/personal?edit=true&client_id=${process.env.TRUSTAP_CLIENT_ID}`;

// GET /api/seller/oauth-url  — returns the Trustap OAuth URL for seller setup
router.get('/oauth-url', authenticate, async (req, res) => {
  const state = `${req.user.id}:${Date.now()}`;
  const url = trustap.getSellerOAuthUrl(REDIRECT_URI, state);
  res.json({ url, payout_profile_url: PAYOUT_PROFILE_URL });
});

// GET /api/seller/callback  — Trustap redirects here after OAuth
// No authenticate middleware — this is a browser redirect from Trustap
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`https://uat-admin.trustdepo.com?seller_oauth=error&reason=${error}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  // state = "userId:timestamp"
  const userId = state.split(':')[0];
  if (!userId) return res.status(400).send('Invalid state');

  try {
    const tokens = await trustap.exchangeOAuthCode(code, REDIRECT_URI);
    const trustapSellerUserId = trustap.extractUserIdFromToken(tokens.id_token);

    await supabase
      .from('users')
      .update({ trustap_seller_user_id: trustapSellerUserId, role: 'seller' })
      .eq('id', userId);

    console.log(`[SellerOAuth] User ${userId} linked Trustap seller ID: ${trustapSellerUserId}`);

    // Redirect to Trustap payout profile page so seller can add bank details
    return res.redirect(`${PAYOUT_PROFILE_URL}&state=${userId}`);
  } catch (err) {
    console.error('[SellerOAuth] Error:', err.message);
    return res.status(500).send('Failed to complete seller setup. Please try again.');
  }
});

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

// POST /api/seller/setup-complete  — mark seller setup done (after payout profile)
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
