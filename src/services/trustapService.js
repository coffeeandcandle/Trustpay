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

// POST /api/v1/guest_users
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

// ── Online transactions ────────────────────────────────────────────────────────
// These are /api/v1/transactions/... (no p2p prefix), using field names without
// the "deposit_" prefix.

// GET /api/v1/charge
// Returns { charge, charge_seller, charge_calculator_version, charge_config, currency, price, ... }
async function getCharge(price, currency = 'gbp') {
  const qs = new URLSearchParams({
    price:          String(price),
    currency,
    payment_method: 'bank_transfer',
  });
  return call('GET', `/api/v1/charge?${qs}`);
}

// POST /api/v1/me/transactions/create_with_guest_user  (APIKey, no Trustap-User needed)
// Returns basic.Transaction { id, join_code, status, ... }
async function createTransaction({
  sellerTrustapId,
  buyerTrustapId,
  description,
  currency = 'gbp',
  price,
  charge,
  chargeSeller,
  chargeCalculatorVersion,
  chargeConfig = 1,
}) {
  const requestBody = {
    seller_id:                 sellerTrustapId,
    buyer_id:                  buyerTrustapId,
    creator_role:              'seller',
    currency,
    description,
    price,
    charge,
    charge_seller:             chargeSeller || 0,
    charge_calculator_version: chargeCalculatorVersion,
    charge_config:             chargeConfig,
    payment_method:            'bank_transfer',
  };
  console.log('[Trustap] createTransaction body:', JSON.stringify(requestBody));
  return call('POST', '/api/v1/me/transactions/create_with_guest_user', { body: requestBody });
}

// GET /api/v1/transactions/{id}/bank_transfer_details
async function getBankTransferDetails(trustapTxId) {
  return call('GET', `/api/v1/transactions/${trustapTxId}/bank_transfer_details`);
}

// POST /api/v1/transactions/{id}/accept_payment_with_guest_seller  (APIKey + Trustap-User)
// Called by seller to acknowledge payment received (only needed if require_seller_acceptance feature is on)
async function acceptPayment(trustapTxId, sellerTrustapId) {
  return call('POST', `/api/v1/transactions/${trustapTxId}/accept_payment_with_guest_seller`, {
    trustapUser: sellerTrustapId,
  });
}

// POST /api/v1/transactions/{id}/confirm_delivery_with_guest_buyer  (APIKey + Trustap-User)
// Called by buyer to confirm delivery and release funds to seller
async function confirmDelivery(trustapTxId, buyerTrustapId) {
  return call('POST', `/api/v1/transactions/${trustapTxId}/confirm_delivery_with_guest_buyer`, {
    trustapUser: buyerTrustapId,
  });
}

// POST /api/v1/transactions/{id}/complain_with_guest_buyer  (APIKey + Trustap-User)
async function complain(trustapTxId, buyerTrustapId, description) {
  return call('POST', `/api/v1/transactions/${trustapTxId}/complain_with_guest_buyer`, {
    trustapUser: buyerTrustapId,
    body: { description },
  });
}

// POST /api/v1/transactions/{id}/cancel_with_guest_user  (APIKey + Trustap-User)
async function cancelTransaction(trustapTxId, userTrustapId) {
  return call('POST', `/api/v1/transactions/${trustapTxId}/cancel_with_guest_user`, {
    trustapUser: userTrustapId,
  });
}

// GET /api/v1/transactions/{id}
async function getTransaction(trustapTxId) {
  return call('GET', `/api/v1/transactions/${trustapTxId}`);
}

module.exports = {
  createGuestUser,
  getCharge,
  createTransaction,
  getBankTransferDetails,
  acceptPayment,
  confirmDelivery,
  complain,
  cancelTransaction,
  getTransaction,
};
