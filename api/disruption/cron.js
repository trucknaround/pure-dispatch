// ============================================================
// PURE DISPATCH — DISRUPTION CRON JOB
// api/disruption/cron.js
// ============================================================
// Runs every 15 minutes via Vercel cron (set in vercel.json).
// Uses Firebase Admin SDK (HTTP v1 API) — no legacy server key needed.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── FCM v1 Auth: get OAuth2 access token from service account ──
async function getFCMAccessToken() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase service account env variables');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${base64url(header)}.${base64url(payload)}`;

  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`FCM token error: ${JSON.stringify(tokenData)}`);
  }

  return { accessToken: tokenData.access_token, projectId };
}

// ── Send push notification via FCM v1 ───────────────────────
async function sendPushNotification(fcmToken, type, message, data = {}) {
  try {
    const { accessToken, projectId } = await getFCMAccessToken();

    const TITLES = {
      LATE_RISK: '⏰ Delivery Alert',
      WEATHER:   '🌩️ Weather Alert',
      BREAKDOWN: '🔧 Breakdown Alert',
      TRAFFIC:   '🚗 Traffic Alert',
      BROKER:    '📋 Broker Issue',
      SYSTEM:    '📢 System Alert',
    };

    const payload = {
      message: {
        token: fcmToken,
        notification: {
          title: TITLES[type] || '⚠️ Pure Dispatch Alert',
          body: message,
        },
        data: Object.fromEntries(
          Object.entries({ type, ...data }).map(([k, v]) => [k, String(v)])
        ),
        webpush: {
          notification: { icon: '/pure-dispatch-logo.png' },
        },
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      console.warn('[DisruptionCron] FCM send failed:', result);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[DisruptionCron] Push notification error:', err);
    return false;
  }
}

// ── Check a single load for disruptions ─────────────────────
async function checkLoad(load, results) {
  const now = new Date();
  const deadline = new Date(load.delivery_deadline);
  const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

  const alerts = [];

  if (hoursUntilDeadline > 0 && hoursUntilDeadline < 2) {
    alerts.push({
      alert_type: 'LATE_RISK',
      severity: hoursUntilDeadline < 0.5 ? 'severe' : 'moderate',
      message: `Load #${load.load_id} is at risk of missing delivery deadline. ${hoursUntilDeadline.toFixed(1)} hours remaining.`,
    });
  }

  if (hoursUntilDeadline < 0 && load.status !== 'delivered') {
    alerts.push({
      alert_type: 'LATE_RISK',
      severity: 'extreme',
      message: `Load #${load.load_id} is ${Math.abs(hoursUntilDeadline).toFixed(1)} hours past delivery deadline and not yet marked delivered.`,
    });
  }

  for (const alertData of alerts) {
    const { data: existing } = await supabase
      .from('disruption_alerts')
      .select('id')
      .eq('load_id', load.id)
      .eq('alert_type', alertData.alert_type)
      .eq('resolved', false)
      .maybeSingle();

    if (existing) continue;

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
      console.error('[DisruptionCron] Insert error:', insertError);
      continue;
    }

    results.alertsCreated++;

    if (load.users?.fcm_token) {
      const sent = await sendPushNotification(
        load.users.fcm_token,
        alertData.alert_type,
        alertData.message,
        { loadId: load.load_id, alertId: String(newAlert.id) }
      );
      if (sent) results.notificationsSent++;
    }
  }
}

// ── Main handler ─────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  console.log('[DisruptionCron] Starting at', new Date().toISOString());

  const results = { checked: 0, alertsCreated: 0, notificationsSent: 0, errors: [] };

  try {
    const { data: activeLoads, error: loadError } = await supabase
      .from('loads')
      .select(`
        id, load_id, status, delivery_deadline,
        origin, destination, broker_name,
        driver_id, rate, miles,
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

    await supabase
      .from('disruption_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('resolved', false)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log('[DisruptionCron] Done:', results);
    return res.status(200).json({ success: true, ...results });

  } catch (err) {
    console.error('[DisruptionCron] Fatal:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
