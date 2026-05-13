const PaymentProvider = require('./PaymentProvider');
const trustap = require('../trustapService');

/**
 * Trustap implementation of PaymentProvider.
 * All Trustap-specific API shapes are confined to this file and trustapService.js.
 * Controllers must only call the abstract interface methods defined in PaymentProvider.
 */
class TrustapProvider extends PaymentProvider {
  get name() { return 'trustap'; }

  async createUser(profile) {
    const nameParts = (profile.full_name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName  = nameParts.slice(1).join(' ') || 'User';
    const { id } = await trustap.createGuestUser(
      profile.email,
      firstName,
      lastName,
      profile.ip          || '0.0.0.0',
      profile.country_code || 'GB',
    );
    return { providerId: String(id) };
  }

  async getCharge(amount, currency) {
    return trustap.getCharge(amount, currency);
  }

  async createEscrowTransaction(params) {
    return trustap.createP2PTransaction(params);
  }

  async getPaymentSecret(providerTxId, buyerProviderId) {
    return trustap.getStripeClientSecret(String(providerTxId), buyerProviderId);
  }

  async acceptDeposit(providerTxId, sellerProviderId) {
    return trustap.acceptDeposit(String(providerTxId), sellerProviderId);
  }

  async confirmHandover(providerTxId, userProviderId) {
    return trustap.confirmHandover(String(providerTxId), userProviderId);
  }

  async dispute(providerTxId, userProviderId, description) {
    return trustap.complain(String(providerTxId), userProviderId, description);
  }

  async getTransaction(providerTxId) {
    return trustap.getTransaction(String(providerTxId));
  }

  getSellerOnboardingUrl(redirectUri, state) {
    return trustap.getSellerOAuthUrl(redirectUri, state);
  }

  async completeSellerOnboarding(code, redirectUri) {
    const tokens = await trustap.exchangeOAuthCode(code, redirectUri);
    const trustapSellerId = trustap.extractUserIdFromToken(tokens.id_token);
    return { trustapSellerId };
  }
}

module.exports = TrustapProvider;
