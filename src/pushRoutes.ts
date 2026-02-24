// ============================================================
// PURE DISPATCH — PUSH NOTIFICATION API ROUTES
// pushRoutes.ts
// ============================================================
// Mount this in your main server.ts:
//   import pushRoutes from './pushRoutes';
//   app.use('/api/push', pushRoutes);
// ============================================================

import { Router, Request, Response } from 'express';
import {
  registerPushToken,
  removePushToken,
  notifyNewLoad,
  notifyWeatherAlert,
  notifyBrokerReply,
  notifyBillingIssue,
  sendBulkNotifications,
} from './pushService';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Middleware: verify the request has a valid user session ──
async function requireAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No auth token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  (req as any).userId = user.id;
  next();
}

// ── Middleware: verify admin-only routes ──
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

  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  (req as any).userId = user.id;
  next();
}

// ============================================================
// DRIVER ROUTES
// ============================================================

/**
 * POST /api/push/register
 * Driver registers their FCM token after app opens or login
 * Body: { token: string, platform: 'android' | 'ios' | 'web' }
 */
router.post('/register', requireAuth, async (req: Request, res: Response) => {
  const { token, platform } = req.body;
  const userId = (req as any).userId;

  if (!token || !platform) {
    return res.status(400).json({ error: 'token and platform required' });
  }

  try {
    await registerPushToken(userId, token, platform);
    res.json({ success: true, message: 'Push token registered' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/push/unregister
 * Driver opts out or logs out — remove their token
 */
router.delete('/unregister', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    await removePushToken(userId);
    res.json({ success: true, message: 'Push token removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/push/history
 * Driver views their notification history (last 50)
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ notifications: data });
});

// ============================================================
// INTERNAL SERVICE ROUTES
// (Called by other Pure Dispatch backend services, not frontend)
// ============================================================

/**
 * POST /api/push/load-alert
 * Called by the load search service when a new matching load is found
 */
router.post('/load-alert', async (req: Request, res: Response) => {
  // Validate internal service key
  const serviceKey = req.headers['x-service-key'];
  if (serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ error: 'Invalid service key' });
  }

  const { userId, load } = req.body;

  try {
    const result = await notifyNewLoad(userId, load);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/push/weather-alert
 * Called by the weather monitor when a hazard is detected
 */
router.post('/weather-alert', async (req: Request, res: Response) => {
  const serviceKey = req.headers['x-service-key'];
  if (serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ error: 'Invalid service key' });
  }

  const { userId, alert } = req.body;

  try {
    const result = await notifyWeatherAlert(userId, alert);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/push/broker-reply
 * Called when Twilio/SendGrid receives a broker response
 */
router.post('/broker-reply', async (req: Request, res: Response) => {
  const serviceKey = req.headers['x-service-key'];
  if (serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ error: 'Invalid service key' });
  }

  const { userId, broker } = req.body;

  try {
    const result = await notifyBrokerReply(userId, broker);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * POST /api/push/broadcast
 * Admin sends a notification to all active users or a segment
 * Body: { segment: 'all' | 'active', title, body }
 */
router.post('/broadcast', requireAdmin, async (req: Request, res: Response) => {
  const { segment = 'all', title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body required' });
  }

  try {
    // Get all users with push tokens
    let query = supabase
      .from('push_tokens')
      .select('user_id');

    if (segment === 'active') {
      // Only users with active Stripe subscriptions
      query = supabase
        .from('push_tokens')
        .select('user_id, profiles!inner(subscription_status)')
        .eq('profiles.subscription_status', 'active');
    }

    const { data: tokens, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const payloads = (tokens || []).map((t: any) => ({
      userId: t.user_id,
      type: 'SYSTEM_ALERT' as const,
      title,
      body,
    }));

    const { sent, failed } = await sendBulkNotifications(payloads);

    res.json({
      success: true,
      totalUsers: payloads.length,
      sent,
      failed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
