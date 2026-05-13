/**
 * Payment provider registry and factory.
 *
 * To add a new provider:
 *   1. Implement a class extending PaymentProvider
 *   2. Register it here: providers['my_provider'] = new MyProvider()
 *   3. Set PAYMENT_PROVIDER=my_provider in env
 */
const TrustapProvider = require('./TrustapProvider');

const providers = {
  trustap: new TrustapProvider(),
  // stripe_connect: new StripeConnectProvider(),   // future
  // mangopay:       new MangopayProvider(),         // future
};

const DEFAULT_PROVIDER = process.env.PAYMENT_PROVIDER || 'trustap';

/**
 * @param {string} [name]  Provider key; defaults to PAYMENT_PROVIDER env var
 * @returns {import('./PaymentProvider')}
 */
function getProvider(name) {
  const key = name || DEFAULT_PROVIDER;
  const provider = providers[key];
  if (!provider) throw new Error(`Unknown payment provider: "${key}"`);
  return provider;
}

module.exports = { getProvider };
