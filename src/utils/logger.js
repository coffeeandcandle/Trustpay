/**
 * Structured JSON logger.
 * Set LOG_LEVEL env var to 'debug' | 'info' (default) | 'warn' | 'error'.
 *
 * Output format:
 *   {"ts":"2025-…","level":"info","ctx":"Webhook","msg":"Processed event","meta":{…}}
 */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, context, message, meta = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    ts:    new Date().toISOString(),
    level,
    ctx:   context,
    msg:   message,
  };

  // Serialize Error objects cleanly
  if (meta && typeof meta === 'object') {
    const cleanMeta = { ...meta };
    if (cleanMeta.error instanceof Error) {
      cleanMeta.error = {
        message: cleanMeta.error.message,
        stack:   process.env.NODE_ENV !== 'production' ? cleanMeta.error.stack : undefined,
      };
    }
    if (Object.keys(cleanMeta).length) entry.meta = cleanMeta;
  }

  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  debug: (ctx, msg, meta) => log('debug', ctx, msg, meta),
  info:  (ctx, msg, meta) => log('info',  ctx, msg, meta),
  warn:  (ctx, msg, meta) => log('warn',  ctx, msg, meta),
  error: (ctx, msg, meta) => log('error', ctx, msg, meta),
};
