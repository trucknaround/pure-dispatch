// ============================================================
// PURE DISPATCH — ADMIN API ROUTES
// adminRoutes.ts
// ============================================================
// Mount in server.ts:
//   import adminRoutes from './adminRoutes';
//   app.use('/api/admin', adminRoutes);
// ============================================================

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Admin auth middleware ──
async function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// Apply admin middleware to all routes
router.use(requireAdmin);

// ============================================================
// OVERVIEW STATS
// ============================================================

/**
 * GET /api/admin/stats
 * All key metrics for the overview tab
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      usersResult,
      activeSubsResult,
      activeLoadsResult,
      openIncidentsResult,
      openAlertsResult,
      todayLoadsResult,
      notifResult,
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('id', { count: 'exact', head: true }),

      // Active subscriptions
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'active'),

      // Active loads being monitored right now
      supabase
        .from('active_loads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress'),

      // Open incidents (not resolved)
      supabase
        .from('incident_log')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false),

      // Open disruption alerts
      supabase
        .from('disruption_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false),

      // Loads activated today
      supabase
        .from('active_loads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

      // Push notifications sent today
      supabase
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .gte('sent_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .eq('status', 'delivered'),
    ]);

    // Calculate rough MRR ($39.99/month per active user — update if pricing changes)
    const activeCount = activeSubsResult.count || 0;
    const mrr = activeCount * 39.99;

    res.json({
      totalUsers: usersResult.count || 0,
      activeSubscriptions: activeCount,
      mrr: Math.round(mrr),
      activeLoads: activeLoadsResult.count || 0,
      openIncidents: openIncidentsResult.count || 0,
      openAlerts: openAlertsResult.count || 0,
      loadsToday: todayLoadsResult.count || 0,
      notificationsSent: notifResult.count || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// USERS
// ============================================================

/**
 * GET /api/admin/users
 * All users with their subscription + profile info
 */
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        company_name,
        mc_number,
        dot_number,
        phone,
        subscription_status,
        plan_type,
        stripe_customer_id,
        current_period_end,
        created_at,
        role
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/users/:userId
 * Single user's full detail — loads, incidents, notifications
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const [profileResult, loadsResult, incidentsResult, notifsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('active_loads').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('incident_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('notification_log').select('*').eq('user_id', userId).order('sent_at', { ascending: false }).limit(20),
    ]);

    res.json({
      profile: profileResult.data,
      recentLoads: loadsResult.data || [],
      incidents: incidentsResult.data || [],
      notifications: notifsResult.data || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:userId/role
 * Set a user as admin or driver
 */
router.patch('/users/:userId/role', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['admin', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or driver' });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `User role updated to ${role}` });
});

// ============================================================
// INCIDENTS
// ============================================================

/**
 * GET /api/admin/incidents
 * All incidents logged by drivers (breakdowns, emergencies, etc)
 */
router.get('/incidents', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('incident_log')
      .select(`
        *,
        profiles(email, company_name, mc_number, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });

    // Flatten profile data
    const incidents = (data || []).map((inc: any) => ({
      ...inc,
      driver_email: inc.profiles?.email,
      company_name: inc.profiles?.company_name,
      mc_number: inc.profiles?.mc_number,
      driver_phone: inc.profiles?.phone,
    }));

    res.json({ incidents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/incidents/:incidentId/resolve
 * Mark an incident as resolved
 */
router.patch('/incidents/:incidentId/resolve', async (req: Request, res: Response) => {
  const { incidentId } = req.params;
  const { resolution } = req.body;

  const { error } = await supabase
    .from('incident_log')
    .update({
      resolved: true,
      resolution: resolution || 'Resolved by admin',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', incidentId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ============================================================
// DISRUPTION ALERTS
// ============================================================

/**
 * GET /api/admin/disruption-alerts
 * All disruption alerts across all drivers
 */
router.get('/disruption-alerts', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('disruption_alerts')
      .select(`
        *,
        profiles(email, company_name, mc_number)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ alerts: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NOTIFICATION ANALYTICS
// ============================================================

/**
 * GET /api/admin/notifications
 * Notification delivery stats
 */
router.get('/notifications', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('notification_log')
      .select('type, status, sent_at')
      .order('sent_at', { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: error.message });

    // Aggregate by type
    const byType: Record<string, { delivered: number; failed: number }> = {};
    for (const n of (data || [])) {
      if (!byType[n.type]) byType[n.type] = { delivered: 0, failed: 0 };
      if (n.status === 'delivered') byType[n.type].delivered++;
      else byType[n.type].failed++;
    }

    const total = data?.length || 0;
    const delivered = data?.filter((n) => n.status === 'delivered').length || 0;

    res.json({
      total,
      delivered,
      failed: total - delivered,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) + '%' : '0%',
      byType,
      recent: data?.slice(0, 20),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
