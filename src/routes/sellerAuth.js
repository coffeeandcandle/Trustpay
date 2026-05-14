/**
 * Seller onboarding routes — /api/seller/*
 *
 * State machine:
 *   buyer ──► seller_pending ──► seller_verified
 *                           └──► seller_rejected
 *   (admin only) seller_verified ──► seller_suspended
 *
 * OAuth flow:
 *   POST /start-onboarding  → generate CSRF state token → return Trustap OAuth URL
 *   GET  /callback          → Trustap redirects here → verify state → exchange code
 *                           → set seller_verified → redirect to deep link in app
 *   GET  /status            → return current seller_status for the logged-in user
 *   POST /cancel-onboarding → revert seller_pending back to buyer
 */
const router = require('express').Router();
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { getProvider } = require('../services/payments');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const REDIRECT_URI    = `${process.env.API_BASE_URL || 'https://uat-api.trustdepo.com'}/api/seller/callback`;
const APP_RETURN_BASE = `${process.env.API_BASE_URL || 'https://uat-api.trustdepo.com'}/api/seller/return`;

// CSRF state token TTL: 30 minutes
const TOKEN_TTL_MS = 30 * 60 * 1000;

// Serve an HTML page that does a client-side JS redirect to the return URL.
// This ensures onShouldStartLoadWithRequest fires on both iOS and Android
// (server-side 302 redirects are silently followed by Android WebView).
function jsRedirect(res, url) {
  const encoded = JSON.stringify(url);
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#0a0a0f;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;color:#fff;text-align:center}</style></head><body><p style="color:#94a3b8;font-size:15px">Returning to app...</p><script>window.location.replace(${encoded});</script></body></html>`);
}

// ── POST /api/seller/start-onboarding ────────────────────────────────────────
router.post('/start-onboarding', authenticate, async (req, res) => {
  try {
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, seller_status, seller_onboarding_token, seller_onboarding_started_at')
      .eq('id', req.user.id)
      .single();

    if (fetchErr || !user) return res.status(404).json({ error: 'User not found' });

    // ── Already verified — idempotent success ──
    if (user.seller_status === 'seller_verified') {
      return res.json({ status: 'seller_verified', message: 'Seller account already active' });
    }

    // ── Suspended — blocked ──
    if (user.seller_status === 'seller_suspended') {
      return res.status(403).json({ error: 'Your seller account has been suspended. Please contact support.' });
    }

    // ── Pending with valid token — resume existing flow ──
    if (
      user.seller_status === 'seller_pending' &&
      user.seller_onboarding_token &&
      user.seller_onboarding_started_at
    ) {
      const elapsed = Date.now() - new Date(user.seller_onboarding_started_at).getTime();
      if (elapsed < TOKEN_TTL_MS) {
        const url = getProvider().getSellerOnboardingUrl(REDIRECT_URI, user.seller_onboarding_token);
        logger.info('SellerOnboarding', 'Resuming existing onboarding', { userId: req.user.id });
        return res.json({ url, status: 'seller_pending', resumed: true });
      }
      // Expired token — fall through to generate fresh one
    }

    // ── Start fresh onboarding ──
    const stateToken = `${req.user.id}:${crypto.randomBytes(16).toString('hex')}`;

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        seller_status:              'seller_pending',
        seller_onboarding_token:    stateToken,
        seller_onboarding_started_at: new Date().toISOString(),
      })
      .eq('id', req.user.id);

    if (updateErr) throw updateErr;

    const url = getProvider().getSellerOnboardingUrl(REDIRECT_URI, stateToken);

    logger.info('SellerOnboarding', 'Started seller onboarding', { userId: req.user.id });
    return res.json({ url, status: 'seller_pending', resumed: false });
  } catch (err) {
    logger.error('SellerOnboarding', 'start-onboarding failed', { error: err });
    return res.status(500).json({ error: 'Failed to start seller onboarding. Please try again.' });
  }
});

// ── GET /api/seller/callback ─────────────────────────────────────────────────
// No authenticate middleware — this is a browser redirect from Trustap OAuth.
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  const redirectError = (reason) =>
    jsRedirect(res, `${APP_RETURN_BASE}?status=error&reason=${encodeURIComponent(reason)}`);

  if (error) {
    logger.warn('SellerOnboarding', 'OAuth returned error', { error, error_description });
    return redirectError(error_description || error);
  }

  if (!code || !state) return redirectError('missing_params');

  try {
    const userId = state.split(':')[0];
    if (!userId) return redirectError('invalid_state');

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, seller_status, seller_onboarding_token, seller_onboarding_started_at')
      .eq('id', userId)
      .single();

    if (fetchErr || !user) return redirectError('user_not_found');

    // CSRF state check
    if (user.seller_onboarding_token !== state) {
      logger.warn('SellerOnboarding', 'State token mismatch — possible CSRF', { userId });
      return redirectError('invalid_state');
    }

    // Token TTL check
    const elapsed = Date.now() - new Date(user.seller_onboarding_started_at).getTime();
    if (elapsed > TOKEN_TTL_MS) {
      await supabase
        .from('users')
        .update({ seller_status: 'buyer', seller_onboarding_token: null })
        .eq('id', userId);
      logger.warn('SellerOnboarding', 'Onboarding token expired', { userId });
      return redirectError('session_expired');
    }

    // Exchange OAuth code for Trustap tokens — retry once on transient errors
    const { trustapSellerId } = await withRetry(
      () => getProvider().completeSellerOnboarding(code, REDIRECT_URI),
      { maxAttempts: 2 }
    );

    // Persist verified seller state
    await supabase
      .from('users')
      .update({
        seller_status:                  'seller_verified',
        trustap_seller_user_id:         trustapSellerId,
        seller_onboarding_token:        null,
        seller_onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);

    logger.info('SellerOnboarding', 'Seller verified', { userId, trustapSellerId });
    // Embed the Trustap profile URL as a `next` param so the mobile WebView can
    // navigate there directly (avoids a second redirect chain that can be dropped).
    const profileUrl = process.env.TRUSTAP_PROFILE_URL ||
      `https://app.stage.trustap.com/profile/payout/personal?edit=true&client_id=${process.env.TRUSTAP_CLIENT_ID}`;
    return jsRedirect(res, `${APP_RETURN_BASE}?status=verified&next=${encodeURIComponent(profileUrl)}`);
  } catch (err) {
    logger.error('SellerOnboarding', 'OAuth callback failed', { error: err });
    return redirectError('internal_error');
  }
});

// ── GET /api/seller/return ────────────────────────────────────────────────────
// The WebView intercepts this URL before it loads via onShouldStartLoadWithRequest.
// This endpoint only serves users who open the link in a real browser.
router.get('/return', (req, res) => {
  const status = req.query.status === 'verified' ? 'verified' : 'error';
  const emoji  = status === 'verified' ? '✅' : '❌';
  const msg    = status === 'verified' ? 'Seller account verified! You can return to the app.' : 'Verification failed. Please try again in the app.';
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0f;font-family:-apple-system,sans-serif;color:#fff;text-align:center;padding:24px}</style></head><body><div><div style="font-size:56px;margin-bottom:16px">${emoji}</div><p style="color:#94a3b8">${msg}</p></div></body></html>`);
});

// ── GET /api/seller/status ────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('seller_status, trustap_seller_user_id, seller_setup_complete, seller_onboarding_started_at, seller_onboarding_completed_at')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || {});
});

// ── POST /api/seller/cancel-onboarding ───────────────────────────────────────
// Allow user to abandon a pending onboarding and revert to buyer.
router.post('/cancel-onboarding', authenticate, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('seller_status')
    .eq('id', req.user.id)
    .single();

  if (!user || user.seller_status !== 'seller_pending') {
    return res.status(400).json({ error: 'No pending onboarding to cancel' });
  }

  await supabase
    .from('users')
    .update({ seller_status: 'buyer', seller_onboarding_token: null })
    .eq('id', req.user.id);

  return res.json({ seller_status: 'buyer' });
});

module.exports = router;
