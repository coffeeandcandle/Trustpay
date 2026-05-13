const BASE_URL = process.env.TRUSTAP_BASE_URL || 'https://dev.stage.trustap.com';

// Trustap APIKey = HTTP Basic Auth with API key as username and no password.
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

// Create a Trustap guest user (APIKey auth)
// Returns { id, email, ... }
async function createGuestUser(email, firstName, lastName, ip = '0.0.0.0', countryCode = 'GB') {
  return call('POST', '/api/v1/guest_users', {
    body: {
      email,
      first_name: firstName || 'User',
      last_name:  lastName  || 'User',
      country_code: countryCode,
      tos_acceptance: {
        ip,
        unix_timestamp: Math.floor(Date.now() / 1000),
      },
    },
  });
}

// Get Trustap fee for a P2P bank-transfer transaction
// price: amount in smallest currency unit (e.g. 1000 = £10.00)
// Returns { price, charge, charge_calculator_version, charge_config, currency, ... }
async function getCharge(price, currency = 'gbp') {
  const qs = new URLSearchParams({
    price: String(price),
    currency,
    payment_method: 'bank_transfer',
  });
  return call('GET', `/api/v1/p2p/charge?${qs}`);
}

// Create P2P transaction with both parties as guest users (APIKey auth).
// Uses create_with_guest_user — seller creates, buyer is pre-joined.
// Returns the full p2p.Transaction object.
async function createP2PTransactionWithGuests({
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
    deposit_payment_method:    'bank_transfer',
    skip_remainder:            true,
  };
  console.log('[Trustap] create_with_guest_user body:', JSON.stringify(requestBody));
  return call('POST', '/api/v1/p2p/me/transactions/create_with_guest_user', {
    body: requestBody,
  });
}

// Get bank transfer details so buyer knows where to send funds
// Returns { account_number, sort_code, reference, bank_name, ... }
async function getBankTransferDetails(trustapTxId) {
  return call('GET', `/api/v1/p2p/transactions/${trustapTxId}/bank_transfer_details`);
}

// Accept deposit — called by seller (guest) to confirm buyer's bank transfer arrived
async function acceptDeposit(trustapTxId, sellerTrustapId) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/accept_deposit_with_guest_seller`, {
    trustapUser: sellerTrustapId,
  });
}

// Confirm handover — called by buyer or seller (guest) to release funds
async function confirmHandover(trustapTxId, userTrustapId) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/confirm_handover_with_guest_user`, {
    trustapUser: userTrustapId,
  });
}

// Submit complaint — works for either guest buyer or guest seller
async function complain(trustapTxId, userTrustapId, description) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/complain`, {
    trustapUser: userTrustapId,
    body: { description },
  });
}

// Get P2P transaction details
async function getP2PTransaction(trustapTxId) {
  return call('GET', `/api/v1/p2p/transactions/${trustapTxId}`);
}

module.exports = {
  createGuestUser,
  getCharge,
  createP2PTransactionWithGuests,
  getBankTransferDetails,
  acceptDeposit,
  confirmHandover,
  complain,
  getP2PTransaction,
};
