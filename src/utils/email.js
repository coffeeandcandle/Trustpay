const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'TrustDepo <noreply@trustdepo.com>';

function formatAmount(amount) {
  return `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #13131f; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; }
    .header-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 14px; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 700; margin: 0; }
    .header p { color: rgba(255,255,255,0.75); font-size: 13px; margin: 6px 0 0; }
    .body { padding: 28px 32px; }
    .greeting { color: #e2e8f0; font-size: 15px; margin-bottom: 20px; line-height: 1.6; }
    .detail-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .detail-row:last-child { border-bottom: none; padding-bottom: 0; }
    .detail-label { color: #94a3b8; font-size: 13px; }
    .detail-value { color: #e2e8f0; font-size: 13px; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
    .amount-highlight { color: #10b981; font-size: 22px; font-weight: 700; text-align: center; margin: 20px 0; }
    .note { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 10px; padding: 14px 16px; margin: 20px 0; color: #6ee7b7; font-size: 13px; line-height: 1.6; }
    .footer { text-align: center; padding: 20px 32px 28px; color: #475569; font-size: 12px; line-height: 1.7; }
    .footer a { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="color:#10b981;font-size:18px;font-weight:700;letter-spacing:1px;">TRUSTDEPO</span>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>TrustDepo · Secure payments, simplified</p>
      <p><a href="https://trustdepo.com">trustdepo.com</a> · <a href="https://trustdepo.com/support">Support</a></p>
      <p style="margin-top:8px;color:#334155;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Email: Payment Successful (to sender after payment is authorised) ────────
async function sendPaymentSuccessToSender({ to, name, amount, title, transactionId, date }) {
  const html = baseTemplate(`
    <div class="header">
      <div class="header-icon">✅</div>
      <h1>Payment Successful</h1>
      <p>Your payment has been authorised and secured</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name || 'there'},</p>
      <p class="greeting">Your payment of <strong style="color:#10b981;">${formatAmount(amount)}</strong> has been successfully authorised and is now held securely in TrustDepo. The funds will be released to the recipient once both parties confirm the transaction.</p>
      <div class="amount-highlight">${formatAmount(amount)}</div>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">Transaction</span>
          <span class="detail-value">${title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID</span>
          <span class="detail-value" style="font-family:monospace;font-size:12px;">${transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount</span>
          <span class="detail-value">${formatAmount(amount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDate(date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color:#10b981;">Secured ✓</span>
        </div>
      </div>
      <div class="note">
        💡 <strong>What happens next?</strong> Once both parties confirm the transaction is complete, the funds will be released to the recipient. You can track the status in the TrustDepo app.
      </div>
    </div>
  `);

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Payment Successful — ${formatAmount(amount)} secured`,
    html,
  });
}

// ── Email: Payment Received (to receiver after payment is authorised) ────────
async function sendPaymentReceivedToReceiver({ to, name, amount, title, transactionId, senderName, date }) {
  const html = baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
      <div class="header-icon">💰</div>
      <h1>Payment Incoming</h1>
      <p>Funds have been secured for your transaction</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name || 'there'},</p>
      <p class="greeting"><strong style="color:#60a5fa;">${senderName || 'Someone'}</strong> has secured a payment of <strong style="color:#10b981;">${formatAmount(amount)}</strong> for you through TrustDepo. The funds are held safely and will be released to you once the transaction is confirmed.</p>
      <div class="amount-highlight" style="color:#60a5fa;">${formatAmount(amount)}</div>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">Transaction</span>
          <span class="detail-value">${title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID</span>
          <span class="detail-value" style="font-family:monospace;font-size:12px;">${transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount</span>
          <span class="detail-value">${formatAmount(amount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">From</span>
          <span class="detail-value">${senderName || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDate(date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color:#60a5fa;">Held in Escrow ✓</span>
        </div>
      </div>
      <div class="note" style="background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.2);color:#93c5fd;">
        💡 <strong>What happens next?</strong> Once both parties confirm the transaction, the funds will be credited to your TrustDepo account. You can then withdraw them to your bank account.
      </div>
    </div>
  `);

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Payment Incoming — ${formatAmount(amount)} secured for you`,
    html,
  });
}

// ── Email: Transaction Released (to both parties) ────────────────────────────
async function sendTransactionReleasedToSender({ to, name, amount, title, transactionId, date }) {
  const html = baseTemplate(`
    <div class="header">
      <div class="header-icon">🎉</div>
      <h1>Transaction Complete</h1>
      <p>Payment has been released successfully</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name || 'there'},</p>
      <p class="greeting">Your transaction has been completed and the payment of <strong style="color:#10b981;">${formatAmount(amount)}</strong> has been released to the recipient.</p>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">Transaction</span>
          <span class="detail-value">${title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID</span>
          <span class="detail-value" style="font-family:monospace;font-size:12px;">${transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Released</span>
          <span class="detail-value">${formatAmount(amount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Completed</span>
          <span class="detail-value">${formatDate(date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color:#10b981;">Released ✓</span>
        </div>
      </div>
    </div>
  `);

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Transaction Complete — ${formatAmount(amount)} released`,
    html,
  });
}

async function sendTransactionReleasedToReceiver({ to, name, amount, title, transactionId, senderName, date }) {
  const html = baseTemplate(`
    <div class="header">
      <div class="header-icon">🎉</div>
      <h1>Funds Released!</h1>
      <p>Payment has been credited to your account</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name || 'there'},</p>
      <p class="greeting">Great news! The payment of <strong style="color:#10b981;">${formatAmount(amount)}</strong> from <strong>${senderName || 'the sender'}</strong> has been released and credited to your TrustDepo account.</p>
      <div class="amount-highlight">${formatAmount(amount)}</div>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">Transaction</span>
          <span class="detail-value">${title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID</span>
          <span class="detail-value" style="font-family:monospace;font-size:12px;">${transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Credited</span>
          <span class="detail-value">${formatAmount(amount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">From</span>
          <span class="detail-value">${senderName || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Completed</span>
          <span class="detail-value">${formatDate(date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color:#10b981;">Credited ✓</span>
        </div>
      </div>
      <div class="note">
        💡 You can now withdraw your funds to your bank account from the TrustDepo app.
      </div>
    </div>
  `);

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Funds Released — ${formatAmount(amount)} credited to your account`,
    html,
  });
}

module.exports = {
  sendPaymentSuccessToSender,
  sendPaymentReceivedToReceiver,
  sendTransactionReleasedToSender,
  sendTransactionReleasedToReceiver,
};
