const { supabase } = require('../config/supabase');

// GET /api/user/bank-accounts
async function getBankAccounts(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/user/bank-accounts
async function addBankAccount(req, res, next) {
  try {
    const { bank_name, iban, account_name } = req.body;

    if (!bank_name || !iban || !account_name) {
      return res.status(400).json({ error: 'bank_name, iban, and account_name are required' });
    }

    // Normalise IBAN — remove spaces for storage
    const normalised_iban = iban.replace(/\s+/g, '').toUpperCase();

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: req.user.id,
        bank_name,
        iban: normalised_iban,
        account_name,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/user/bank-accounts/:id
async function deleteBankAccount(req, res, next) {
  try {
    const { id } = req.params;

    // Verify ownership before delete
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: 'Bank account removed' });
  } catch (err) {
    next(err);
  }
}

// GET /api/user/lookup?username=xyz
// Returns public profile info for a user by their username (for transaction receiver lookup)
async function lookupByUsername(req, res, next) {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'username query param is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, username')
      .eq('username', username.toLowerCase().replace(/^@/, ''))
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return only public-safe fields
    return res.json({
      full_name: data.full_name,
      email: data.email,
      username: data.username,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBankAccounts, addBankAccount, deleteBankAccount, lookupByUsername };
