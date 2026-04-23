const { supabase } = require('../config/supabase');

async function getLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return 'Local';
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'success') {
      return [data.city, data.regionName, data.country].filter(Boolean).join(', ');
    }
  } catch (_) {}
  return null;
}

async function insertAuditLog({
  actorName, actorEmail, action,
  targetType, targetId, targetLabel,
  severity = 'low', details, ip,
}) {
  try {
    const location = ip ? await getLocation(ip) : null;

    await supabase.from('audit_logs').insert({
      admin_name:   actorName  || null,
      admin_email:  actorEmail || null,
      action,
      target_type:  targetType  || null,
      target_id:    targetId    ? String(targetId) : null,
      target_label: targetLabel || null,
      severity,
      details:      details || null,
      ip_address:   ip       || null,
      location:     location || null,
    });
  } catch (_) {
    // non-fatal — never let logging break the main flow
  }
}

module.exports = { insertAuditLog };
