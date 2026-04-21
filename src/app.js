require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const functionsRoutes = require('./routes/functions');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security headers
app.use(helmet());

// ── CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  'https://trustdepo.com',
  'https://www.trustdepo.com',
  'https://admin.trustdepo.com',
  'http://51.21.197.111:3000',
  'http://51.21.197.111:4000',
  'http://localhost:5100',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Body parsing (raw for Stripe webhook, json for everything else)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Reset Password page (linked from Supabase reset email)
app.get('/reset-password', (req, res) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net; img-src 'self' data:;"
  );
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password — Trustdepo</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
    .card { background: #13131f; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 40px 32px; width: 100%; max-width: 400px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .logo-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { color: #fff; font-size: 18px; font-weight: 700; }
    h1 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    p { color: #64748b; font-size: 14px; margin-bottom: 28px; }
    label { display: block; color: #94a3b8; font-size: 13px; font-weight: 500; margin-bottom: 7px; }
    input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 13px 14px; color: #fff; font-size: 15px; margin-bottom: 16px; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #10b981; }
    button { width: 100%; background: #10b981; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; border-radius: 10px; padding: 12px 14px; font-size: 14px; margin-bottom: 16px; display: none; }
    .success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #10b981; border-radius: 10px; padding: 16px 14px; font-size: 14px; text-align: center; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">🛡️</div>
      <span class="logo-text">Trustdepo</span>
    </div>
    <h1>Reset Password</h1>
    <p>Enter your new password below.</p>
    <div class="error" id="error"></div>
    <div class="success" id="success">
      ✅ Password updated successfully! You can now sign in with your new password.
    </div>
    <div id="form">
      <label>New Password</label>
      <input type="password" id="password" placeholder="Min 6 characters" />
      <label>Confirm Password</label>
      <input type="password" id="confirm" placeholder="Repeat new password" />
      <button id="btn" onclick="handleReset()">Update Password</button>
    </div>
  </div>

  <script>
    const sbClient = window.supabase.createClient('${supabaseUrl}', '${supabaseAnonKey}');

    // Parse URL hash on load
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlError = hashParams.get('error');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    (async function init() {
      if (urlError) {
        document.getElementById('form').style.display = 'none';
        const errorEl = document.getElementById('error');
        const desc = hashParams.get('error_description') || '';
        errorEl.textContent = desc.replace(/\\+/g, ' ') || 'This reset link is invalid or has expired.';
        errorEl.style.display = 'block';
        document.querySelector('p').textContent = 'Please go back to the app and request a new password reset link.';
        return;
      }
      if (accessToken) {
        // Set the session so updateUser works
        await sbClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' });
      } else {
        document.getElementById('form').style.display = 'none';
        document.getElementById('error').textContent = 'Invalid reset link. Please request a new one from the app.';
        document.getElementById('error').style.display = 'block';
      }
    })();

    async function handleReset() {
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;
      const errorEl = document.getElementById('error');
      const btn = document.getElementById('btn');

      errorEl.style.display = 'none';

      if (!password || !confirm) {
        errorEl.textContent = 'Please fill in both fields.';
        errorEl.style.display = 'block'; return;
      }
      if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        errorEl.style.display = 'block'; return;
      }
      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.style.display = 'block'; return;
      }

      btn.disabled = true;
      btn.textContent = 'Updating...';

      const { error } = await sbClient.auth.updateUser({ password });
      if (error) {
        errorEl.textContent = error.message || 'Failed to update password.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Update Password';
      } else {
        document.getElementById('form').style.display = 'none';
        document.getElementById('success').style.display = 'block';
      }
    }
  </script>
</body>
</html>`);
});

// ── API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/functions', functionsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);

// ── 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler
app.use(errorHandler);

module.exports = app;
