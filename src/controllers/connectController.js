const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/user/connect/add-bank
// Body: { account_holder_name, iban }
// Creates a Stripe Custom Connect account and attaches the IBAN as external account
async function addBankAccount(req, res, next) {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured' });

    const { account_holder_name, account_number, sort_code, iban } = req.body;

    if (!account_holder_name?.trim()) {
      return res.status(400).json({ error: 'Account holder name is required' });
    }
    if (!account_number?.trim() && !iban?.trim()) {
      return res.status(400).json({ error: 'Account number or IBAN is required' });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, email, full_name, phone, date_of_birth, address, city, passport_number, emirates_id, stripe_connect_account_id, stripe_connect_onboarded')
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
      const nameParts = (profile.full_name || 'Test User').trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Parse date_of_birth (stored as YYYY-MM-DD or DD/MM/YYYY)
      let dob = { day: 1, month: 1, year: 1990 };
      if (profile.date_of_birth) {
        const parts = profile.date_of_birth.includes('-')
          ? profile.date_of_birth.split('-')
          : profile.date_of_birth.split('/');
        if (parts.length === 3) {
          const isISO = parts[0].length === 4;
          dob = isISO
            ? { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) }
            : { day: Number(parts[0]), month: Number(parts[1]), year: Number(parts[2]) };
        }
      }

      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'GB',
        email: profile.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        individual: {
          first_name: firstName,
          last_name: lastName,
          email: profile.email,
          phone: profile.phone || '+447911123456',
          dob,
          address: {
            line1: profile.address || '123 Test Street',
            city: profile.city || 'London',
            postal_code: 'SW1A 1AA',
            country: 'GB',
          },
          id_number: profile.passport_number || profile.emirates_id || '000000000',
          verification: {
            document: {
              front: 'file_identity_document_success',
            },
          },
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

    // Add UK bank account (sort_code + account_number for GB)
    const externalAccount = (sort_code && account_number)
      ? {
          object: 'bank_account',
          country: 'GB',
          currency: 'gbp',
          account_number: account_number.trim(),
          routing_number: sort_code.replace(/-/g, ''),
          account_holder_name: account_holder_name.trim(),
          account_holder_type: 'individual',
        }
      : {
          object: 'bank_account',
          country: 'GB',
          currency: 'gbp',
          account_number: iban.trim().toUpperCase().replace(/\s/g, ''),
          account_holder_name: account_holder_name.trim(),
          account_holder_type: 'individual',
        };

    await stripe.accounts.createExternalAccount(accountId, {
      external_account: externalAccount,
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
