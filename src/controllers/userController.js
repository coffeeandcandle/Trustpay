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

// PUT /api/user/push-token
// Body: { token }
async function savePushToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('id', req.user.id);

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/user/disputes  — user's own disputes with current status
async function getMyDisputes(req, res, next) {
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('user_email', profile?.email)
      .order('created_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/user/chat/start  — create or return user's active conversation
async function startChat(req, res, next) {
  try {
    const { subject } = req.body;

    const { data: profile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', req.user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'User not found' });

    // Return existing active/waiting conversation if one exists
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_email', profile.email)
      .in('status', ['waiting', 'active'])
      .order('created_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return res.json(existing);

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_email: profile.email,
        user_name: profile.full_name || profile.email.split('@')[0],
        subject: subject || 'Support Chat',
        status: 'waiting',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/user/chat/messages?conversation_id=...
async function getChatMessages(req, res, next) {
  try {
    const { conversation_id } = req.query;
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id is required' });

    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    // Verify conversation belongs to this user
    const { data: convo } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_email', profile?.email)
      .maybeSingle();

    if (!convo) return res.status(403).json({ error: 'Not your conversation' });

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/user/chat/messages
async function sendChatMessage(req, res, next) {
  try {
    const { conversation_id, content } = req.body;
    if (!conversation_id || !content) return res.status(400).json({ error: 'conversation_id and content are required' });

    const { data: profile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', req.user.id)
      .single();

    // Verify ownership
    const { data: convo } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_email', profile?.email)
      .maybeSingle();

    if (!convo) return res.status(403).json({ error: 'Not your conversation' });

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        sender_type: 'user',
        sender_name: profile.full_name || 'User',
        sender_email: profile.email,
        content,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Update conversation's last_message and set to active
    await supabase
      .from('chat_conversations')
      .update({ last_message: content, updated_date: new Date().toISOString(), status: 'active' })
      .eq('id', conversation_id);

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getBankAccounts, addBankAccount, deleteBankAccount, lookupByUsername, savePushToken, getMyDisputes, startChat, getChatMessages, sendChatMessage };
