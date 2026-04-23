const Stripe = require('stripe');
const { supabase } = require('../config/supabase');
const { insertAuditLog: _log } = require('../utils/auditLog');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Send Expo push notification (best-effort, never throws)
async function sendPush(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: expoPushToken, sound: 'default', title, body, data }),
    });
  } catch (_) {}
}

// Wrap shared util with admin-specific field names for backward compat
function insertAuditLog({ adminName, adminEmail, action, targetType, targetId, targetLabel, severity, details, ip }) {
  return _log({ actorName: adminName, actorEmail: adminEmail, action, targetType, targetId, targetLabel, severity, details, ip });
}

function getIp(req) {
  return req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null;
}

// GET /api/admin/dashboard
async function getDashboard(req, res, next) {
  try {
    // Total users
    const { count: total_users } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Total released volume
    const { data: released } = await supabase
      .from('escrow_transactions')
      .select('amount')
      .eq('status', 'released');

    const total_volume = (released || []).reduce((s, t) => s + (t.amount || 0), 0);

    // All transactions count
    const { count: total_transactions } = await supabase
      .from('escrow_transactions')
      .select('*', { count: 'exact', head: true });

    // Success rate
    const success_rate = total_transactions > 0
      ? Math.round(((released || []).length / total_transactions) * 100)
      : 0;

    // Open disputes
    const { count: open_disputes } = await supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Daily volume — last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentTxns } = await supabase
      .from('escrow_transactions')
      .select('amount, created_date')
      .gte('created_date', sevenDaysAgo.toISOString());

    // Group by date
    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    (recentTxns || []).forEach(t => {
      const key = (t.created_date || '').slice(0, 10);
      if (key in dailyMap) {
        dailyMap[key] += t.amount || 0;
      }
    });
    const daily_volume = Object.entries(dailyMap).map(([date, volume]) => ({ date, volume }));

    return res.json({
      total_users: total_users || 0,
      total_volume,
      open_disputes: open_disputes || 0,
      success_rate,
      daily_volume,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
async function getUsers(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/status
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { verification_level, account_status, internal_notes } = req.body;

    const updates = {};
    if (verification_level !== undefined) updates.verification_level = verification_level;
    if (account_status !== undefined)     updates.account_status     = account_status;
    if (internal_notes !== undefined)     updates.internal_notes     = internal_notes;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Determine audit action
    let action = 'other';
    let severity = 'medium';
    if (account_status === 'suspended') { action = 'user_suspended'; severity = 'high'; }
    else if (account_status === 'banned') { action = 'user_banned'; severity = 'high'; }
    else if (account_status === 'active') { action = 'user_activated'; severity = 'medium'; }
    else if (account_status === 'pending_deletion') { action = 'user_deleted'; severity = 'high'; }
    else if (verification_level === 'uae_verified') { action = 'kyc_approved'; severity = 'medium'; }
    else if (verification_level === 'unverified') { action = 'kyc_rejected'; severity = 'medium'; }

    const admin = req.adminProfile || {};
    await insertAuditLog({
      adminName: admin.full_name || null,
      adminEmail: admin.email || req.user?.email || null,
      action,
      targetType: 'user',
      targetId: id,
      targetLabel: data?.email || id,
      severity,
      details: updates,
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// Map internal status to frontend-expected status labels
function normalizeStatus(status) {
  switch (status) {
    case 'pending_deposit': return 'pending';
    case 'funded':          return 'pending';
    case 'sender_confirmed':   return 'sender_ok';
    case 'receiver_confirmed': return 'sender_ok';
    case 'released':  return 'released';
    case 'disputed':  return 'disputed';
    case 'cancelled': return 'cancelled';
    default: return status;
  }
}

// GET /api/admin/transactions
async function getTransactions(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: error.message });

    const mapped = (data || []).map(tx => ({
      ...tx,
      // Normalise status to what frontend expects
      status: normalizeStatus(tx.status),
      // Alias receiver → recipient for frontend
      recipient_name:  tx.receiver_name  || null,
      recipient_email: tx.receiver_email || null,
      // Derived fields
      type:    'escrow',
      flagged: tx.status === 'disputed',
    }));

    return res.json(mapped);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/disputes
async function getDisputes(req, res, next) {
  try {
    const { data: disputes, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    if (!disputes?.length) return res.json([]);

    // Enrich with transaction details (file_url, title, sender/receiver names)
    const txIds = [...new Set(disputes.map(d => d.transaction_id).filter(Boolean))];
    const { data: transactions } = txIds.length
      ? await supabase
          .from('escrow_transactions')
          .select('id, title, dispute_file_url, sender_name, receiver_name, sender_email, receiver_email')
          .in('id', txIds)
      : { data: [] };

    const txMap = {};
    (transactions || []).forEach(tx => { txMap[tx.id] = tx; });

    // Enrich with user full names
    const userEmails = [...new Set(disputes.map(d => d.user_email).filter(Boolean))];
    const { data: users } = userEmails.length
      ? await supabase.from('users').select('email, full_name').in('email', userEmails)
      : { data: [] };

    const userMap = {};
    (users || []).forEach(u => { userMap[u.email] = u; });

    const enriched = disputes.map(d => ({
      ...d,
      user_name: userMap[d.user_email]?.full_name || d.user_email,
      transaction_title: txMap[d.transaction_id]?.title || null,
      dispute_file_url: txMap[d.transaction_id]?.dispute_file_url || null,
      sender_name: txMap[d.transaction_id]?.sender_name || null,
      receiver_name: txMap[d.transaction_id]?.receiver_name || null,
      sender_email: txMap[d.transaction_id]?.sender_email || null,
      receiver_email: txMap[d.transaction_id]?.receiver_email || null,
    }));

    return res.json(enriched);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/disputes/:id
async function updateDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolution_notes, priority } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined)           updates.status           = status;
    if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;
    if (priority !== undefined)         updates.priority         = priority;

    const { data, error } = await supabase
      .from('disputes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Sync escrow_transactions status when dispute is resolved or rejected
    if (data?.transaction_id && status) {
      if (status === 'resolved_release') {
        await supabase
          .from('escrow_transactions')
          .update({ status: 'released' })
          .eq('id', data.transaction_id);
      } else if (status === 'resolved_refund') {
        await supabase
          .from('escrow_transactions')
          .update({ status: 'cancelled' })
          .eq('id', data.transaction_id);
      } else if (status === 'rejected') {
        // Revert transaction back to funded so parties can continue
        await supabase
          .from('escrow_transactions')
          .update({ status: 'funded' })
          .eq('id', data.transaction_id);
      }
    }

    // Send push notification to the user who filed the dispute
    if (data?.user_email && status) {
      const { data: disputeUser } = await supabase
        .from('users')
        .select('expo_push_token')
        .eq('email', data.user_email)
        .maybeSingle();

      if (disputeUser?.expo_push_token) {
        const pushMessages = {
          under_review:    { title: '🔍 Dispute Under Review', body: `Ticket ${data.ticket_number} is being reviewed by our team.` },
          resolved_release: { title: '✅ Dispute Resolved', body: `Ticket ${data.ticket_number}: funds have been released.` },
          resolved_refund:  { title: '✅ Dispute Resolved', body: `Ticket ${data.ticket_number}: a refund has been issued.` },
          rejected:         { title: '❌ Dispute Rejected', body: `Ticket ${data.ticket_number} was not upheld. Please contact support.` },
        };
        const msg = pushMessages[status];
        if (msg) {
          await sendPush(disputeUser.expo_push_token, msg.title, msg.body, {
            type: 'dispute_update',
            status,
            ticket_number: data.ticket_number,
            transaction_id: data.transaction_id,
          });
        }
      }
    }

    let action = 'other';
    if (status === 'resolved_release' || status === 'resolved_refund') action = 'dispute_resolved';
    else if (status === 'rejected')     action = 'dispute_rejected';
    else if (status === 'under_review') action = 'dispute_under_review';

    const admin = req.adminProfile || {};
    await insertAuditLog({
      adminName: admin.full_name || null,
      adminEmail: admin.email || null,
      action,
      targetType: 'dispute',
      targetId: id,
      targetLabel: data?.ticket_number || id,
      severity: 'medium',
      details: updates,
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/reports
async function getReports(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/reports
async function createReport(req, res, next) {
  try {
    const { title, type, date_range_start, date_range_end, status, total_transactions, total_amount } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'title and type are required' });
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        title,
        type,
        date_range_start: date_range_start || null,
        date_range_end: date_range_end || null,
        status: status || 'ready',
        total_transactions: total_transactions || 0,
        total_amount: total_amount || 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = req.adminProfile || {};
    await insertAuditLog({
      adminName: admin.full_name || null,
      adminEmail: admin.email || null,
      action: 'report_generated',
      targetType: 'report',
      targetId: data?.id,
      targetLabel: title,
      severity: 'low',
      details: { type },
    });

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/notifications
async function getNotifications(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/notifications
async function createNotification(req, res, next) {
  try {
    const { title, message, type, target_audience, target_email } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    const row = {
      title,
      message,
      type: type || 'info',
      target_audience: target_audience || 'all_users',
      status: 'sent',
      sent_at: new Date().toISOString(),
    };
    if (target_email) row.target_email = target_email;

    const { data, error } = await supabase
      .from('notifications')
      .insert(row)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = req.adminProfile || {};
    await insertAuditLog({
      adminName: admin.full_name || null,
      adminEmail: admin.email || null,
      action: 'notification_sent',
      targetType: 'notification',
      targetId: data?.id,
      targetLabel: title,
      severity: 'low',
      details: { target_audience, type },
    });

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/conversations
async function getConversations(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/conversations
async function createConversation(req, res, next) {
  try {
    const { user_email, user_name, subject, status, assigned_to } = req.body;

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_email: user_email || null,
        user_name: user_name || null,
        subject: subject || null,
        status: status || 'active',
        assigned_to: assigned_to || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/conversations/:id
async function updateConversation(req, res, next) {
  try {
    const { id } = req.params;
    const { status, last_message, assigned_to } = req.body;

    const updates = { updated_date: new Date().toISOString() };
    if (status !== undefined)       updates.status       = status;
    if (last_message !== undefined) updates.last_message = last_message;
    if (assigned_to !== undefined)  updates.assigned_to  = assigned_to;

    const { data, error } = await supabase
      .from('chat_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/messages?conversation_id=...
async function getMessages(req, res, next) {
  try {
    const { conversation_id } = req.query;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

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

// POST /api/admin/messages
async function createMessage(req, res, next) {
  try {
    const { conversation_id, sender_type, sender_name, sender_email, content } = req.body;

    if (!conversation_id || !sender_type || !content) {
      return res.status(400).json({ error: 'conversation_id, sender_type, and content are required' });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ conversation_id, sender_type, sender_name, sender_email, content })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Update conversation's last_message and updated_date
    await supabase
      .from('chat_conversations')
      .update({ last_message: content, updated_date: new Date().toISOString() })
      .eq('id', conversation_id);

    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/tickets
async function getTickets(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/tickets/:id
async function updateTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined)           updates.status           = status;
    if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    let action = 'other';
    if (status === 'resolved') action = 'ticket_resolved';
    else if (status === 'closed') action = 'ticket_closed';

    const admin = req.adminProfile || {};
    await insertAuditLog({
      adminName: admin.full_name || null,
      adminEmail: admin.email || null,
      action,
      targetType: 'ticket',
      targetId: id,
      targetLabel: data?.ticket_number || id,
      severity: 'low',
      details: updates,
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audit-logs
async function getAuditLogs(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(300);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/admins
async function getAdminUsers(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'view_only']);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/admins/invite
async function inviteAdmin(req, res, next) {
  try {
    const { email, role, full_name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Check if user already exists in public.users
    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Just update their role — no need to re-invite
      const { data, error } = await supabase
        .from('users')
        .update({ role: role || 'admin' })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: 'User role updated', user: data });
    }

    // Send Supabase auth invite email — user receives a link to set their password
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name || email.split('@')[0],
        role: role || 'admin',
      },
      redirectTo: 'https://admin.trustdepo.com/accept-invite',
    });

    if (inviteError) {
      console.error('[INVITE] Supabase invite error:', inviteError.message);
      return res.status(500).json({ error: inviteError.message });
    }

    // Upsert profile row so the user shows up in the admin list immediately
    await supabase.from('users').upsert({
      id: inviteData.user.id,
      email,
      full_name: full_name || email.split('@')[0],
      role: role || 'admin',
    });

    console.log(`[INVITE] Invite email sent to ${email}`);
    return res.status(201).json({ message: 'Invite email sent', user: inviteData.user });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/admins/:id/role
async function updateAdminRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/admins/:id/status
async function toggleAdminStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_disabled } = req.body;

    if (typeof is_disabled !== 'boolean') {
      return res.status(400).json({ error: 'is_disabled (boolean) is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_disabled })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/withdrawals
async function getWithdrawals(req, res, next) {
  try {
    const status = req.query.status || 'pending';

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Enrich with user info and bank accounts
    const enriched = await Promise.all((data || []).map(async (wr) => {
      const { data: user } = await supabase
        .from('users')
        .select('email, full_name, stripe_connect_account_id, stripe_connect_onboarded')
        .eq('id', wr.user_id)
        .single();

      const { data: banks } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', wr.user_id);

      return { ...wr, user: user || {}, bank_accounts: banks || [] };
    }));

    return res.json(enriched);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/withdrawals/:id/approve
async function approveWithdrawal(req, res, next) {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured' });

    const { id } = req.params;
    console.log(`[WITHDRAW] Approving withdrawal id=${id}`);

    const { data: wr, error: wrErr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (wrErr || !wr) return res.status(404).json({ error: 'Withdrawal request not found' });
    if (wr.status !== 'pending') return res.status(400).json({ error: `Request is already ${wr.status}` });

    console.log(`[WITHDRAW] Request found — amount=£${wr.amount} user_id=${wr.user_id} status=${wr.status}`);

    // Get user's connected Stripe account
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', wr.user_id)
      .single();

    console.log(`[WITHDRAW] User — email=${user?.email} connect_id=${user?.stripe_connect_account_id} onboarded=${user?.stripe_connect_onboarded}`);

    if (!user?.stripe_connect_account_id) {
      return res.status(400).json({ error: 'User has not connected their bank account via Stripe' });
    }

    if (!user.stripe_connect_onboarded) {
      return res.status(400).json({ error: 'User has not completed Stripe onboarding' });
    }

    const amountInCents = Math.round(Number(wr.amount) * 100);
    console.log(`[WITHDRAW] Creating Stripe transfer — amount=${amountInCents} pence (£${wr.amount}) destination=${user.stripe_connect_account_id}`);

    // Check platform balance before transferring
    const balance = await stripe.balance.retrieve();
    const gbpAvailable = balance.available.find(b => b.currency === 'gbp');
    console.log(`[WITHDRAW] Stripe platform GBP available balance: ${gbpAvailable ? gbpAvailable.amount : 0} pence`);

    // Transfer from TrustDepo Stripe balance to connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'gbp',
      destination: user.stripe_connect_account_id,
      transfer_group: `withdrawal_${id}`,
      metadata: { withdrawal_id: String(id), user_email: user.email },
    });

    console.log(`[WITHDRAW] Transfer created — transfer_id=${transfer.id} amount=${transfer.amount} currency=${transfer.currency}`);

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'approved',
        stripe_transfer_id: transfer.id,
        approved_at: new Date().toISOString(),
        approved_by: req.user?.email || 'admin',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[WITHDRAW] Supabase update failed:`, error.message, error.details, error.hint);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[WITHDRAW] DB updated — status=approved transfer_id=${transfer.id}`);

    await _log({
      actorName: req.user?.email || 'admin', actorEmail: req.user?.email || 'admin',
      action: 'withdrawal_approved', targetType: 'withdrawal',
      targetId: String(id), targetLabel: `£${wr.amount} for ${user.email}`,
      severity: 'medium', details: { transfer_id: transfer.id, amount: wr.amount },
      ip: getIp(req),
    });

    return res.json(data);
  } catch (err) {
    console.error(`[WITHDRAW] ERROR:`, err.message, err.raw || '');
    next(err);
  }
}

// POST /api/admin/transactions/:id/cancel
async function cancelTransaction(req, res, next) {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured' });

    const { id } = req.params;
    console.log(`[CANCEL] Admin cancelling transaction id=${id}`);

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (txErr || !tx) return res.status(404).json({ error: 'Transaction not found' });
    if (['released', 'cancelled'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot cancel a ${tx.status} transaction` });
    }

    // Void or refund the Stripe PaymentIntent if it exists
    if (tx.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(tx.stripe_payment_intent_id);
        console.log(`[CANCEL] PaymentIntent status=${pi.status}`);

        if (pi.status === 'requires_capture') {
          // Funds authorized but not captured — just cancel (full refund to card)
          await stripe.paymentIntents.cancel(tx.stripe_payment_intent_id);
          console.log(`[CANCEL] PaymentIntent cancelled (authorization voided)`);
        } else if (pi.status === 'succeeded') {
          // Funds already captured — issue a refund
          const refund = await stripe.refunds.create({ payment_intent: tx.stripe_payment_intent_id });
          console.log(`[CANCEL] Refund created refund_id=${refund.id} amount=${refund.amount}`);
        }
      } catch (stripeErr) {
        console.error(`[CANCEL] Stripe error:`, stripeErr.message);
      }
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = req.adminProfile || {};
    await _log({
      actorName: admin.full_name || admin.email || 'admin',
      actorEmail: admin.email || 'admin',
      action: 'transaction_cancelled',
      targetType: 'transaction',
      targetId: id,
      targetLabel: tx.title || id,
      severity: 'high',
      details: { amount: tx.amount, stripe_payment_intent_id: tx.stripe_payment_intent_id },
      ip: getIp(req),
    });

    console.log(`[CANCEL] Done — transaction marked cancelled`);
    return res.json(data);
  } catch (err) {
    console.error(`[CANCEL] ERROR:`, err.message);
    next(err);
  }
}

// POST /api/admin/transactions/:id/pause
async function pauseTransaction(req, res, next) {
  try {
    const { id } = req.params;

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (txErr || !tx) return res.status(404).json({ error: 'Transaction not found' });
    if (['released', 'cancelled'].includes(tx.status)) {
      return res.status(400).json({ error: `Cannot pause a ${tx.status} transaction` });
    }
    if (tx.status === 'paused') {
      return res.status(400).json({ error: 'Transaction is already paused' });
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = req.adminProfile || {};
    await _log({
      actorName: admin.full_name || admin.email || 'admin',
      actorEmail: admin.email || 'admin',
      action: 'transaction_paused',
      targetType: 'transaction',
      targetId: id,
      targetLabel: tx.title || id,
      severity: 'medium',
      details: { amount: tx.amount, previous_status: tx.status },
      ip: getIp(req),
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/transactions/:id/resume
async function resumeTransaction(req, res, next) {
  try {
    const { id } = req.params;

    const { data: tx, error: txErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (txErr || !tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'paused') {
      return res.status(400).json({ error: 'Transaction is not paused' });
    }

    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'funded' })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = req.adminProfile || {};
    await _log({
      actorName: admin.full_name || admin.email || 'admin',
      actorEmail: admin.email || 'admin',
      action: 'transaction_resumed',
      targetType: 'transaction',
      targetId: id,
      targetLabel: tx.title || id,
      severity: 'medium',
      details: { amount: tx.amount },
    });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/withdrawals/:id/reject
async function rejectWithdrawal(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: wr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (!wr) return res.status(404).json({ error: 'Withdrawal request not found' });
    if (wr.status !== 'pending') return res.status(400).json({ error: `Request is already ${wr.status}` });

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || 'Rejected by admin',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getUsers,
  updateUserStatus,
  getTransactions,
  cancelTransaction,
  pauseTransaction,
  resumeTransaction,
  getDisputes,
  updateDispute,
  getReports,
  createReport,
  getNotifications,
  createNotification,
  getConversations,
  createConversation,
  updateConversation,
  getMessages,
  createMessage,
  getTickets,
  updateTicket,
  getAuditLogs,
  getAdminUsers,
  inviteAdmin,
  updateAdminRole,
  toggleAdminStatus,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
};
