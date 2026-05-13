/**
 * Retry a function with exponential backoff + jitter.
 *
 * @param {() => Promise<any>} fn          - Async function to retry
 * @param {object}             options
 * @param {number}             options.maxAttempts  - Max total attempts (default 3)
 * @param {number}             options.baseDelayMs  - Base delay in ms (default 300)
 * @param {number}             options.factor       - Backoff multiplier (default 2)
 * @param {number}             options.jitterMs     - Random jitter ceiling in ms (default 100)
 * @param {(err: Error) => boolean} options.shouldRetry - Predicate; defaults to isRetriable
 */
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    factor      = 2,
    jitterMs    = 100,
    shouldRetry = isRetriable,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!shouldRetry(err) || attempt === maxAttempts) throw err;

      const delay = baseDelayMs * Math.pow(factor, attempt - 1) + Math.random() * jitterMs;
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Default retry predicate.
 * Retries on network errors (no status) and 5xx responses (except 501).
 * Never retries 4xx (client errors).
 */
function isRetriable(err) {
  const status = err.status || err.statusCode;
  if (!status) return true;           // network / timeout / DNS error
  return status >= 500 && status !== 501;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { withRetry, isRetriable };
