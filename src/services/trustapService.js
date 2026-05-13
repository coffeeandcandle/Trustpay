const BASE_URL = process.env.TRUSTAP_BASE_URL || 'https://dev.stage.trustap.com';
const TOKEN_URL =
  process.env.TRUSTAP_TOKEN_URL ||
  'https://sso.stage.trustap.com/auth/realms/trustap/protocol/openid-connect/token';

let _token = null;
let _tokenExp = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExp - 30_000) return _token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.TRUSTAP_CLIENT_ID,
      client_secret: process.env.TRUSTAP_CLIENT_SECRET,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trustap auth failed (${res.status}): ${text}`);
  }
  const { access_token, expires_in } = await res.json();
  _token = access_token;
  _tokenExp = Date.now() + expires_in * 1000;
  return _token;
}

async function call(method, path, { body, trustapUser } = {}) {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
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
    const msg = data.error || data.message || `Trustap ${method} ${path} → HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, trustapData: data });
  }
  return data;
}

// Create a Trustap guest user
// Returns { id, email, created_at }
async function createGuestUser(email, firstName, lastName, ip = '0.0.0.0') {
  return call('POST', '/api/v1/guest_users', {
    body: {
      email,
      first_name: firstName || 'User',
      last_name: lastName || 'User',
      tos_acceptance: {
        ip,
        unix_timestamp: Math.floor(Date.now() / 1000),
      },
    },
  });
}

// Get Trustap fee for a P2P transaction
// priceInSmallestUnit: e.g. 1000 = £10.00 in GBP
// Returns { price, charge, charge_calculator_version, currency, ... }
async function getCharge(priceInSmallestUnit, currency = 'gbp') {
  const qs = new URLSearchParams({ currency, price: String(priceInSmallestUnit) });
  return call('GET', `/api/v1/p2p/charge?${qs}`);
}

// Create P2P transaction on behalf of seller
// Returns { id, join_code, status, deposit_pricing, ... }
async function createP2PTransaction(sellerTrustapId, {
  description,
  currency = 'gbp',
  depositPrice,
  depositCharge,
  chargeCalculatorVersion,
}) {
  return call('POST', '/api/v1/p2p/me/transactions', {
    body: {
      role: 'seller',
      currency,
      description,
      deposit_price: depositPrice,
      deposit_charge: depositCharge,
      charge_calculator_version: chargeCalculatorVersion,
    },
    trustapUser: sellerTrustapId,
  });
}

// Buyer joins the transaction using join_code
async function joinTransaction(joinCode, buyerTrustapId) {
  return call(
    'POST',
    `/api/v1/p2p/transactions_by_join_code/${encodeURIComponent(joinCode)}/join`,
    { trustapUser: buyerTrustapId }
  );
}

// Get Stripe client secret for buyer deposit payment
// Returns { client_secret }
async function getDepositClientSecret(trustapTxId, buyerTrustapId) {
  return call(
    'GET',
    `/api/v1/p2p/transactions/${trustapTxId}/deposit_stripe_client_secret`,
    { trustapUser: buyerTrustapId }
  );
}

// Get bank transfer payment details for buyer
// Returns { account_number, sort_code, reference, bank_name, ... }
async function getBankTransferDetails(trustapTxId, buyerTrustapId) {
  return call(
    'GET',
    `/api/v1/p2p/transactions/${trustapTxId}/bank_transfer_details`,
    { trustapUser: buyerTrustapId }
  );
}

// Confirm handover (called by buyer or seller)
async function confirmHandover(trustapTxId, userTrustapId) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/confirm_handover`, {
    trustapUser: userTrustapId,
  });
}

// File a complaint / dispute
async function complain(trustapTxId, userTrustapId, description) {
  return call('POST', `/api/v1/p2p/transactions/${trustapTxId}/complain`, {
    body: { description },
    trustapUser: userTrustapId,
  });
}

// Get P2P transaction details
async function getP2PTransaction(trustapTxId, userTrustapId) {
  return call('GET', `/api/v1/p2p/transactions/${trustapTxId}`, {
    trustapUser: userTrustapId,
  });
}

// Set payout bank account for a user (required before withdrawal)
// routingNumber = sort code for UK accounts
async function setPayoutBankAccount(userTrustapId, { accountHolderName, accountNumber, routingNumber }) {
  return call('POST', '/api/v1/me/debit_account', {
    body: {
      type: 'bank',
      bank_details: {
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        routing_number: routingNumber,
      },
    },
    trustapUser: userTrustapId,
  });
}

// Get user's available balance in Trustap
// Returns { available: [{ amount, currency }] }
async function getBalance(userTrustapId) {
  return call('GET', '/api/v1/me/balances', { trustapUser: userTrustapId });
}

module.exports = {
  createGuestUser,
  getCharge,
  createP2PTransaction,
  joinTransaction,
  getDepositClientSecret,
  getBankTransferDetails,
  confirmHandover,
  complain,
  getP2PTransaction,
  setPayoutBankAccount,
  getBalance,
};
