import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdmin(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('carrier_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  return profile?.role === 'admin' ? user : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Admin only' });

  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const [
      usersResult,
      activeSubsResult,
      activeLoadsResult,
      openIncidentsResult,
      openAlertsResult,
      todayLoadsResult,
      notifResult,
    ] = await Promise.all([
      supabase.from('carrier_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('carrier_profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      supabase.from('active_loads').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('disruption_alerts').select('id', { count: 'exact', head: true }).eq('resolved', false).eq('alert_type', 'LATE_RISK'),
      supabase.from('disruption_alerts').select('id', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('active_loads').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('notification_log').select('id', { count: 'exact', head: true }).gte('sent_at', todayStart).eq('status', 'delivered'),
    ]);

    const activeCount = activeSubsResult.count || 0;

    return res.json({
      totalUsers: usersResult.count || 0,
      activeSubscriptions: activeCount,
      mrr: Math.round(activeCount * 39.99),
      activeLoads: activeLoadsResult.count || 0,
      openIncidents: openIncidentsResult.count || 0,
      openAlerts: openAlertsResult.count || 0,
      loadsToday: todayLoadsResult.count || 0,
      notificationsSent: notifResult.count || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
