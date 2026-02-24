// ============================================================
// PURE DISPATCH — DISRUPTION MONITOR ROUTES
// disruptionRoutes.ts
// ============================================================
// Mount in server.ts:
//   import disruptionRoutes from './disruptionRoutes';
//   app.use('/api/disruption', disruptionRoutes);
// ============================================================

import { Router, Request, Response } from 'express';
import { runDisruptionMonitor } from './disruptionMonitor';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Auth middleware ──
async function requireAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  (req as any).userId = user.id;
  next();
}

// ============================================================
// VERCEL CRON TRIGGER
// Vercel calls GET /api/disruption/cron every 15 minutes
// Set up in vercel.json (see below)
// ============================================================

router.get('/cron', async (req: Request, res: Response) => {
  // Verify this is coming from Vercel cron (not a random caller)
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await runDisruptionMonitor();
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Cron] Disruption monitor failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DRIVER ROUTES
// ============================================================

/**
 * POST /api/disruption/activate-load
 * Driver activates a load for monitoring after accepting it
 */
router.post('/activate-load', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    loadId,
    brokerEmail,
    brokerName,
    destination,
    destLat,
    destLng,
    deliveryDeadline,
    rate,
  } = req.body;

  if (!loadId || !destination || !destLat || !destLng || !deliveryDeadline) {
    return res.status(400).json({ error: 'Missing required load fields' });
  }

  // Deactivate any previous in-progress loads for this driver
  await supabase
    .from('active_loads')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'in_progress');

  // Activate new load
  const { data, error } = await supabase
    .from('active_loads')
    .insert({
      user_id: userId,
      load_id: loadId,
      broker_email: brokerEmail || null,
      broker_name: brokerName || null,
      destination,
      dest_lat: destLat,
      dest_lng: destLng,
      delivery_deadline: deliveryDeadline,
      rate: rate || null,
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    success: true,
    message: `Load activated. Pure is now watching your route to ${destination}.`,
    activeLoad: data,
  });
});

/**
 * POST /api/disruption/deliver
 * Driver marks load as delivered — stops monitoring
 */
router.post('/deliver', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { loadId } = req.body;

  const { error } = await supabase
    .from('active_loads')
    .update({ status: 'delivered' })
    .eq('user_id', userId)
    .eq('load_id', loadId);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, message: 'Load marked as delivered. Great run, driver!' });
});

/**
 * GET /api/disruption/active
 * Get driver's current active load and any alerts
 */
router.get('/active', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const [loadsResult, alertsResult] = await Promise.all([
    supabase
      .from('active_loads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('disruption_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  res.json({
    activeLoad: loadsResult.data?.[0] || null,
    alerts: alertsResult.data || [],
  });
});

/**
 * POST /api/disruption/update-gps
 * Frontend sends driver GPS every few minutes while app is open
 */
router.post('/update-gps', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { latitude, longitude, speedMph } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }

  await supabase.from('driver_locations').upsert(
    {
      user_id: userId,
      latitude,
      longitude,
      speed_mph: speedMph || 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  res.json({ success: true });
});

/**
 * PATCH /api/disruption/resolve-alert/:alertId
 * Driver dismisses an alert
 */
router.patch('/resolve-alert/:alertId', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { alertId } = req.params;

  const { error } = await supabase
    .from('disruption_alerts')
    .update({ resolved: true })
    .eq('id', alertId)
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
