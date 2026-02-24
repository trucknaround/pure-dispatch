import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// ── Helpers ──────────────────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sendPush(userId, title, body, data = {}) {
  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .single();

  if (!tokenRow?.token) return;

  await admin.messaging().send({
    token: tokenRow.token,
    notification: { title, body },
    data: { ...data, timestamp: Date.now().toString() },
    android: { priority: 'high', notification: { sound: 'default', color: '#00FF88' } },
  });
}

async function checkWeather(lat, lng) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial`;
  const res = await fetch(url);
  const data = await res.json();

  const condition = data.weather?.[0]?.main?.toLowerCase() || '';
  const wind = data.wind?.speed || 0;
  const hazards = ['thunderstorm', 'snow', 'blizzard', 'tornado'];

  for (const h of hazards) {
    if (condition.includes(h)) {
      return { detected: true, condition: data.weather[0].description, location: data.name };
    }
  }
  if (wind > 45) {
    return { detected: true, condition: `High winds ${Math.round(wind)} mph`, location: data.name };
  }
  return { detected: false };
}

// ── Main handler ─────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel calls this as GET via cron
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Monitor] Running disruption check:', new Date().toISOString());

  try {
    // Get all in-progress loads
    const { data: activeLoads, error } = await supabase
      .from('active_loads')
      .select('*')
      .eq('status', 'in_progress')
      .gt('delivery_deadline', new Date().toISOString());

    if (error) throw error;
    if (!activeLoads || activeLoads.length === 0) {
      return res.json({ success: true, checked: 0, message: 'No active loads' });
    }

    let checked = 0;

    for (const load of activeLoads) {
      try {
        // Get driver GPS
        const { data: loc } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('user_id', load.user_id)
          .single();

        if (!loc) continue;

        // Check if GPS is stale (older than 30 min)
        const ageMs = Date.now() - new Date(loc.updated_at).getTime();
        if (ageMs > 30 * 60 * 1000) continue;

        // Estimate ETA using straight-line distance at 55mph
        const miles = haversineDistance(loc.latitude, loc.longitude, load.dest_lat, load.dest_lng);
        const durationMinutes = (miles / 55) * 60;
        const estimatedArrival = new Date(Date.now() + durationMinutes * 60 * 1000);
        const deadline = new Date(load.delivery_deadline);
        const minutesLate = Math.max(0, Math.round((estimatedArrival - deadline) / 60000));

        // Alert if late
        if (minutesLate > 30) {
          await sendPush(
            load.user_id,
            minutesLate > 60 ? '🚨 Running Late!' : '⚠️ Delivery at Risk',
            `${Math.round(miles)} miles remaining to ${load.destination}. Running ~${minutesLate} min behind.`,
            { loadId: load.load_id, screen: 'ActiveLoad' }
          );

          await supabase.from('disruption_alerts').insert({
            user_id: load.user_id,
            load_id: load.load_id,
            alert_type: 'LATE_RISK',
            severity: minutesLate > 60 ? 'severe' : 'moderate',
            message: `Driver is ${minutesLate} min behind. ETA ${estimatedArrival.toLocaleTimeString()}. ${Math.round(miles)} miles remaining.`,
          });
        }

        // Check weather
        const weather = await checkWeather(loc.latitude, loc.longitude);
        if (weather.detected) {
          await sendPush(
            load.user_id,
            '⚠️ Weather Alert on Your Route',
            `${weather.condition} near ${weather.location}. Drive carefully.`,
            { screen: 'WeatherDetail' }
          );

          await supabase.from('disruption_alerts').insert({
            user_id: load.user_id,
            load_id: load.load_id,
            alert_type: 'WEATHER',
            severity: 'moderate',
            message: `${weather.condition} detected near ${weather.location}.`,
          });
        }

        checked++;
      } catch (loadErr) {
        console.error(`[Monitor] Error on load ${load.load_id}:`, loadErr.message);
      }
    }

    return res.json({ success: true, checked, total: activeLoads.length });
  } catch (err) {
    console.error('[Monitor] Fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
