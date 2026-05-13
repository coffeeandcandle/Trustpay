const BASE_URL = process.env.TRUSTAP_BASE_URL || 'https://dev.stage.trustap.com';

// Trustap APIKey = HTTP Basic Auth with API key as username, no password.
function basicAuth() {
  return `Basic ${Buffer.from(`${process.env.TRUSTAP_API_KEY}:`).toString('base64')}`;
}

async function call(method, path, { body, trustapUser } = {}) {
  const headers = {
    Authorization: basicAuth(),
    Accept: 'application/json',
  };
  if (trustapUser) headers['Trustap-User'] = String(trustapUser);
  const opts = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    const msg = `Trustap ${method} ${path} → ${res.status}: ${data.error || data.message || 'unknown'}`;
    throw Object.assign(new Error(msg), { status: res.status, trustapData: data });
  }
  return data;
}

// ── Guest users ────────────────────────────────────────────────────────────────

async function createGuestUser(email, firstName, lastName, ip = '0.0.0.0', countryCode = 'GB') {
  return call('POST', '/api/v1/guest_users', {
    body: {
      email,
      first_name:   firstName || 'User',
      last_name:    lastName  || 'User',
      country_code: countryCode,
      tos_acceptance: {
        ip,
        unix_timestamp: Math.floor(Date.now() / 1000),
      },
    },
  });
}

// ── P2P (F2F) transactions with card payment ───────────────────────────────────

// GET /api/v1/p2p/charge  (card is the default payment method)
async function getCharge(price, currency = 'gbp') {
  const qs = new URLSearchParams({ price: String(price), currency });
  return call('GET', `/api/v1/p2p/charge?${qs}`);
}

// POST /api/v1/p2p/me/transactions/create_with_guest_user  (APIKey)
// Both buyer and seller are guest users. Card payment — Stripe client secret returned separately.
async function createP2PTransaction({
  sellerTrustapId,
  buyerTrustapId,
  description,
  currency = 'gbp',
  depositPrice,
  depositCharge,
  chargeCalculatorVersion,
  chargeConfig = 1,
}) {
  const requestBody = {
    seller_id:                 sellerTrustapId,
    buyer_id:                  buyerTrustapId,
    creator_role:              'seller',
    currency,
    description,
    deposit_price:             depositPrice,
    deposit_charge:            depositCharge,
    deposit_charge_seller:     0,
    charge_calculator_version: chargeCalculatorVersion,
    deposit_charge_config:     chargeConfig,
    skip_remainder:            true,
  };
  console.log('[Trustap] createP2PTransaction body:', JSON.stringify(requestBody));
  return call('POST', '/api/v1/p2p/me/transactions/create_with_guest_user', { body: requestBody });
}

// GET /api/v1/p2p/transactions/{id}/deposit_stripe_client_secret
// Returns { client_secret } — used by mobile to present Stripe payment sheet
async function getStripeClientSecret(trustapTxId, buyerTrustapId) {
  return call('GET', `/api/v1/p2p/transactions/${trustapTxId}/deposit_stripe_client_secret`, {
    trustapUser: buyerTrustapId,
  });
}

// POST /api/v1/p2p/transactions/{id}/accept_deposit_with_guest_seller
// Seller confirms buyer's card payment was received
async function acceptDeposit(trustapTxId, sellerTrustapId) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/accept_deposit_with_guest_seller`, {
    trustapUser: sellerTrustapId,
  });
}

// POST /api/v1/p2p/transactions/{id}/confirm_handover_with_guest_user
// Both buyer and seller must confirm — triggers fund release
async function confirmHandover(trustapTxId, userTrustapId) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/confirm_handover_with_guest_user`, {
    trustapUser: userTrustapId,
  });
}

// POST /api/v1/p2p/transactions/{id}/complain  (APIKey + Trustap-User, works for both parties)
async function complain(trustapTxId, userTrustapId, description) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/complain`, {
    trustapUser: userTrustapId,
    body: { description },
  });
}

// GET /api/v1/p2p/transactions/{id}
async function getTransaction(trustapTxId) {
  return call('GET', `/api/v1/p2p/transactions/${trustapTxId}`);
}

// ── Seller OAuth ───────────────────────────────────────────────────────────────

const SSO_BASE = 'https://sso.trustap.com/auth/realms/trustap-stage';

// Build the OAuth authorization URL — redirect seller to this URL to create full account
function getSellerOAuthUrl(redirectUri, state) {
  const clientId = process.env.TRUSTAP_CLIENT_ID;
  const scopes = [
    'openid', 'profile',
    'p2p_tx:offline_accept_deposit',
    'p2p_tx:offline_claim',
    'p2p_tx:offline_confirm_handover',
    'p2p_tx:offline_complain',
  ].join(' ');
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         scopes,
    state:         state || '',
  });
  return `${SSO_BASE}/protocol/openid-connect/auth?${params}`;
}

// Exchange OAuth code for token — returns { access_token, id_token, refresh_token }
async function exchangeOAuthCode(code, redirectUri) {
  const params = new URLSearchParams({
    client_id:     process.env.TRUSTAP_CLIENT_ID,
    client_secret: process.env.TRUSTAP_CLIENT_SECRET,
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
  });
  const res = await fetch(`${SSO_BASE}/protocol/openid-connect/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'OAuth token exchange failed');
  return data;
}

// Extract full Trustap user ID from id_token JWT (sub claim)
function extractUserIdFromToken(idToken) {
  const payload = idToken.split('.')[1];
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return decoded.sub;
}

// POST /api/v1/p2p/transactions/{id}/claim_for_seller
async function claimForSeller(trustapTxId, sellerFullUserId) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/claim_for_seller`, {
    trustapUser: sellerFullUserId,
  });
}

module.exports = {
  createGuestUser,
  getCharge,
  createP2PTransaction,
  getStripeClientSecret,
  acceptDeposit,
  confirmHandover,
  complain,
  getTransaction,
  getSellerOAuthUrl,
  exchangeOAuthCode,
  extractUserIdFromToken,
  claimForSeller,
};
