/**
 * Abstract payment provider interface.
 *
 * Concrete implementations:
 *   TrustapProvider  — current default
 *   (future) StripeConnectProvider, MangopayProvider, WiseProvider, AdyenProvider
 *
 * All methods receive plain JS objects and return standardised response shapes.
 * Business logic in controllers/services must ONLY depend on this interface —
 * never on Trustap-specific API shapes — so providers are hot-swappable.
 */
class PaymentProvider {
  /** @returns {string} Provider identifier, e.g. 'trustap' */
  get name() {
    throw new Error(`${this.constructor.name} must implement 'name'`);
  }

  /**
   * Create or retrieve a user account with the provider.
   * @param {{ email, full_name, ip, country_code }} profile
   * @returns {{ providerId: string }}
   */
  async createUser(_profile) {
    throw new Error(`${this.constructor.name}.createUser() not implemented`);
  }

  /**
   * Calculate fee breakdown for a given amount / currency.
   * @param {number} amountInSmallestUnit  e.g. pence for GBP
   * @param {string} currency              e.g. 'gbp'
   * @returns {{ price, charge, chargeCalculatorVersion, chargeConfig }}
   */
  async getCharge(_amount, _currency) {
    throw new Error(`${this.constructor.name}.getCharge() not implemented`);
  }

  /**
   * Create an escrow transaction with both parties.
   * @param {{ sellerProviderId, buyerProviderId, description, currency,
   *            depositPrice, depositCharge, chargeCalculatorVersion, chargeConfig }} params
   * @returns {{ id, ... }}  Provider transaction object
   */
  async createEscrowTransaction(_params) {
    throw new Error(`${this.constructor.name}.createEscrowTransaction() not implemented`);
  }

  /**
   * Get the Stripe (or equivalent) client secret for the payment sheet.
   * @param {string} providerTxId
   * @param {string} buyerProviderId
   * @returns {{ client_secret: string }}
   */
  async getPaymentSecret(_providerTxId, _buyerProviderId) {
    throw new Error(`${this.constructor.name}.getPaymentSecret() not implemented`);
  }

  /**
   * Seller confirms buyer's payment has been received.
   * @param {string} providerTxId
   * @param {string} sellerProviderId
   */
  async acceptDeposit(_providerTxId, _sellerProviderId) {
    throw new Error(`${this.constructor.name}.acceptDeposit() not implemented`);
  }

  /**
   * A party confirms handover (both must confirm to release funds).
   * @param {string} providerTxId
   * @param {string} userProviderId
   */
  async confirmHandover(_providerTxId, _userProviderId) {
    throw new Error(`${this.constructor.name}.confirmHandover() not implemented`);
  }

  /**
   * File a dispute/complaint.
   * @param {string} providerTxId
   * @param {string} userProviderId
   * @param {string} description
   */
  async dispute(_providerTxId, _userProviderId, _description) {
    throw new Error(`${this.constructor.name}.dispute() not implemented`);
  }

  /**
   * Get provider-side transaction details.
   * @param {string} providerTxId
   * @returns {object}
   */
  async getTransaction(_providerTxId) {
    throw new Error(`${this.constructor.name}.getTransaction() not implemented`);
  }

  /**
   * Generate the URL to redirect/open for seller OAuth / hosted onboarding.
   * @param {string} redirectUri  Backend callback URL
   * @param {string} state        CSRF state token
   * @returns {string}            Authorization URL
   */
  getSellerOnboardingUrl(_redirectUri, _state) {
    throw new Error(`${this.constructor.name}.getSellerOnboardingUrl() not implemented`);
  }

  /**
   * Complete seller onboarding after OAuth code callback.
   * @param {string} code         OAuth authorization code
   * @param {string} redirectUri  Must match what was passed to getSellerOnboardingUrl
   * @returns {{ trustapSellerId: string }}
   */
  async completeSellerOnboarding(_code, _redirectUri) {
    throw new Error(`${this.constructor.name}.completeSellerOnboarding() not implemented`);
  }
}

module.exports = PaymentProvider;
