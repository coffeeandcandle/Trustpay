const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/user/connect/add-bank
// Body: { account_holder_name, iban }
// Creates a Stripe Custom Connect account and attaches the IBAN as external account
async function addBankAccount(req, res, next) {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured' });

    const { account_holder_name, iban } = req.body;

    if (!account_holder_name?.trim() || !iban?.trim()) {
      return res.status(400).json({ error: 'Account holder name and IBAN are required' });
    }

    const cleanIban = iban.trim().toUpperCase().replace(/\s/g, '');
    if (cleanIban.length < 15) {
      return res.status(400).json({ error: 'Please enter a valid IBAN' });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, email, full_name, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', req.user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (profile.stripe_connect_onboarded) {
      return res.status(400).json({ error: 'Bank account already connected' });
    }

    let accountId = profile.stripe_connect_account_id;

    // Create Custom Connect account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'GB',
        email: profile.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.ip || '127.0.0.1',
        },
        business_profile: {
          mcc: '7372',
          url: 'https://trustdepo.com',
        },
        metadata: { user_id: req.user.id, user_email: profile.email },
      });

      accountId = account.id;

      await supabase
        .from('users')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', req.user.id);
    }

    // Add IBAN as external bank account
    await stripe.accounts.createExternalAccount(accountId, {
      external_account: {
        object: 'bank_account',
        country: 'GB',
        currency: 'gbp',
        account_number: cleanIban,
        account_holder_name: account_holder_name.trim(),
        account_holder_type: 'individual',
      },
    });

    // Mark as onboarded
    await supabase
      .from('users')
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_onboarded: true,
      })
      .eq('id', req.user.id);

    return res.json({ success: true, accountId });
  } catch (err) {
    console.error('Stripe Connect error:', err.message, err.code, err.param);
    if (err.type && err.message) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

// GET /api/user/connect/status
async function getConnectStatus(req, res, next) {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', req.user.id)
      .single();

    return res.json({
      connected: !!profile?.stripe_connect_account_id,
      onboarded: profile?.stripe_connect_onboarded || false,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { addBankAccount, getConnectStatus };
