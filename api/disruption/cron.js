// ============================================================
// PURE DISPATCH — DISRUPTION CRON JOB
// api/disruption/cron.js
// ============================================================
// Runs every 15 minutes via Vercel cron (set in vercel.json).
// Checks all active loads for disruption risks and creates
// alerts + sends push notifications to affected drivers.
//
// vercel.json already has:
//   { "path": "/api/disruption/cron", "schedule": "*/15 * * * *" }
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // use service role for backend
);

const BACKEND_URL = process.env.BACKEND_URL || 'https://pure-dispatch.vercel.app';

// ── Thresholds ──────────────────────────────────────────────
const LATE_RISK_THRESHOLD_HOURS = 2;   // flag if ETA < 2hrs from deadline
const SEVERE_LATE_THRESHOLD_HOURS = 0.5;

export default async function handler(req, res) {
  // Vercel cron sends GET — block all other unauthorized requests
  const authHeader = req.headers.authorization;
  if (
    req.method !== 'GET' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[DisruptionCron] Starting run at', new Date().toISOString());

  const results = {
    checked: 0,
    alertsCreated: 0,
    notificationsSent: 0,
    errors: [],
  };

  try {
    // ── 1. Fetch all active loads ──────────────────────────
    const { data: activeLoads, error: loadError } = await supabase
      .from('loads')
      .select(`
        id, load_id, status, pickup_time, delivery_deadline,
        origin, destination, broker_name, broker_phone,
        driver_id, rate, miles, equipment_type,
        users(id, email, fcm_token)
      `)
      .in('status', ['accepted', 'in_transit', 'picked_up'])
      .not('delivery_deadline', 'is', null);

    if (loadError) throw loadError;
    results.checked = activeLoads?.length || 0;

    for (const load of activeLoads || []) {
      try {
        await checkLoad(load, results);
      } catch (err) {
        results.errors.push(`Load ${load.load_id}: ${err.message}`);
      }
    }

    // ── 2. Auto-resolve stale alerts ──────────────────────
    await supabase
      .from('disruption_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('resolved', false)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log('[DisruptionCron] Complete:', results);
    return res.status(200).json({ success: true, ...results });

  } catch (err) {
    console.error('[DisruptionCron] Fatal error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── Check a single load for disruptions ─────────────────────
async function checkLoad(load, results) {
  const now = new Date();
  const deadline = new Date(load.delivery_deadline);
  const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

  const alerts = [];

  // ── Late Risk Detection ──────────────────────────────────
  if (hoursUntilDeadline > 0 && hoursUntilDeadline < LATE_RISK_THRESHOLD_HOURS) {
    const severity = hoursUntilDeadline < SEVERE_LATE_THRESHOLD_HOURS ? 'severe' : 'moderate';
    alerts.push({
      alert_type: 'LATE_RISK',
      severity,
      message: `Load #${load.load_id} is at risk of missing delivery deadline. ${hoursUntilDeadline.toFixed(1)} hours remaining.`,
    });
  }

  // ── Overdue Detection ────────────────────────────────────
  if (hoursUntilDeadline < 0 && load.status !== 'delivered') {
    alerts.push({
      alert_type: 'LATE_RISK',
      severity: 'extreme',
      message: `Load #${load.load_id} is ${Math.abs(hoursUntilDeadline).toFixed(1)} hours past delivery deadline and not yet marked delivered.`,
    });
  }

  // ── Process each alert ───────────────────────────────────
  for (const alertData of alerts) {
    // Check if we already have an unresolved alert of this type for this load
    const { data: existing } = await supabase
      .from('disruption_alerts')
      .select('id')
      .eq('load_id', load.id)
      .eq('alert_type', alertData.alert_type)
      .eq('resolved', false)
      .single();

    if (existing) continue; // don't spam duplicate alerts

    // Create the alert
    const { data: newAlert, error: insertError } = await supabase
      .from('disruption_alerts')
      .insert({
        load_id: load.id,
        alert_type: alertData.alert_type,
        severity: alertData.severity,
        message: alertData.message,
        driver_email: load.users?.email,
        location: load.destination ? JSON.stringify(load.destination) : null,
        resolved: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[DisruptionCron] Alert insert error:', insertError);
      continue;
    }

    results.alertsCreated++;

    // Send push notification to driver if they have an FCM token
    if (load.users?.fcm_token) {
      const sent = await sendPushNotification(
        load.users.fcm_token,
        alertData.alert_type,
        alertData.message,
        { loadId: load.load_id, alertId: newAlert.id }
      );
      if (sent) results.notificationsSent++;
    }
  }
}

// ── Send push notification via Firebase Admin ────────────────
async function sendPushNotification(fcmToken, type, message, data = {}) {
  try {
    const SEVERITY_TITLES = {
      LATE_RISK: '⏰ Delivery Alert',
      WEATHER: '🌩️ Weather Alert',
      BREAKDOWN: '🔧 Breakdown Alert',
      TRAFFIC: '🚗 Traffic Alert',
      BROKER: '📋 Broker Issue',
      SYSTEM: '📢 System Alert',
    };

    const payload = {
      to: fcmToken,
      notification: {
        title: SEVERITY_TITLES[type] || '⚠️ Pure Dispatch Alert',
        body: message,
        icon: '/pure-dispatch-logo.png',
      },
      data: {
        type,
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      },
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${process.env.FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.failure > 0) {
      console.warn('[DisruptionCron] FCM send failed:', result);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[DisruptionCron] Push notification error:', err);
    return false;
  }
}
