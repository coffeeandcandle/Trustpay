const { supabase } = require('../config/supabase');

async function insertAuditLog({
  actorName, actorEmail, action,
  targetType, targetId, targetLabel,
  severity = 'low', details,
}) {
  try {
    await supabase.from('audit_logs').insert({
      admin_name:   actorName  || null,
      admin_email:  actorEmail || null,
      action,
      target_type:  targetType  || null,
      target_id:    targetId    ? String(targetId) : null,
      target_label: targetLabel || null,
      severity,
      details:      details || null,
    });
  } catch (_) {
    // non-fatal — never let logging break the main flow
  }
}

module.exports = { insertAuditLog };
