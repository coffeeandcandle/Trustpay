const { supabase } = require('../config/supabase');

// Build a query that filters to transactions where the current user is sender OR receiver
function userTransactionsQuery(userEmail) {
  return supabase
    .from('escrow_transactions')
    .select('*')
    .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`);
}

// GET /api/transactions
// Query params: sort (-created_date | created_date), limit, status, id
async function listTransactions(req, res, next) {
  try {
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { sort = '-created_date', limit = 100, status, id } = req.query;

    let query = userTransactionsQuery(profile.email);

    // Filter by single ID (matches base44 .filter({ id }) usage)
    if (id) {
      query = query.eq('id', id);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Sorting
    const descending = sort.startsWith('-');
    const column = sort.replace(/^-/, '');
    query = query.order(column, { ascending: !descending });

    // Limit
    if (limit) {
      query = query.limit(Number(limit));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id
async function getTransaction(req, res, next) {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', req.params.id)
      .or(`sender_email.eq.${profile.email},receiver_email.eq.${profile.email}`)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { listTransactions, getTransaction };
