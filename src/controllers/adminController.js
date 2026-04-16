const { supabase } = require('../config/supabase');

// Helper — insert an audit log entry (best-effort, never throws)
async function insertAuditLog({ adminName, adminEmail, action, targetType, targetId, targetLabel, severity = 'low', details }) {
  try {
    await supabase.from('audit_logs').insert({
      admin_name: adminName,
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
      severity,
      details,
    });
  } catch (_) {
    // non-fatal
  }
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
      .select('amount, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Group by date
    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    (recentTxns || []).forEach(t => {
      const key = (t.created_at || '').slice(0, 10);
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

// GET /api/admin/transactions
async function getTransactions(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/disputes
async function getDisputes(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/disputes/:id
async function updateDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined)           updates.status           = status;
    if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;

    const { data, error } = await supabase
      .from('disputes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    let action = 'other';
    if (status === 'resolved_release' || status === 'resolved_refund') action = 'dispute_resolved';
    else if (status === 'rejected') action = 'dispute_rejected';
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

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Update existing user's role
      const { data, error } = await supabase
        .from('users')
        .update({ role: role || 'admin' })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: 'User role updated', user: data });
    }

    // Create new user record (placeholder — actual auth invite would require email confirmation)
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        full_name: full_name || email.split('@')[0],
        role: role || 'admin',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: 'Admin invited', user: data });
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

module.exports = {
  getDashboard,
  getUsers,
  updateUserStatus,
  getTransactions,
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
};
