// ============================================================
// PURE DISPATCH — DISRUPTION MONITORING SERVICE
// disruptionMonitor.ts
// ============================================================
// Background job that runs every 15 minutes via Vercel Cron.
// For each driver with an active load it:
//   1. Pulls driver's current GPS location from Supabase
//   2. Calculates ETA to destination
//   3. Compares ETA vs delivery deadline
//   4. Checks weather on the remaining route
//   5. If at risk → fires push notification + auto-emails broker
//   6. Logs alert to disruption_alerts table
// ============================================================

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import {
  notifyWeatherAlert,
  sendPushNotification,
} from '../push-notifications/pushService';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

interface ActiveLoad {
  id: string;
  user_id: string;
  load_id: string;
  broker_email: string | null;
  broker_name: string | null;
  destination: string;
  dest_lat: number;
  dest_lng: number;
  delivery_deadline: string;
  rate: number;
  last_eta_sent_at: string | null;
}

interface DriverLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  speed_mph: number;
  updated_at: string;
}

interface ETAResult {
  distanceMiles: number;
  durationMinutes: number;
  estimatedArrival: Date;
  onTimeStatus: 'ON_TIME' | 'AT_RISK' | 'LATE';
  minutesLate: number;
}

interface WeatherHazard {
  detected: boolean;
  condition?: string;
  severity?: 'moderate' | 'severe' | 'extreme';
  recommendation?: string;
  location?: string;
}

// ============================================================
// MAIN MONITOR — Entry point called by Vercel Cron
// ============================================================

export async function runDisruptionMonitor(): Promise<void> {
  console.log(`[Monitor] 🔍 Running disruption check — ${new Date().toISOString()}`);

  try {
    // 1. Get all loads currently in progress
    const { data: activeLoads, error } = await supabase
      .from('active_loads')
      .select('*')
      .eq('status', 'in_progress')
      .gt('delivery_deadline', new Date().toISOString()); // Not yet past deadline

    if (error) {
      console.error('[Monitor] Failed to fetch active loads:', error.message);
      return;
    }

    if (!activeLoads || activeLoads.length === 0) {
      console.log('[Monitor] No active loads to monitor');
      return;
    }

    console.log(`[Monitor] Checking ${activeLoads.length} active loads`);

    // 2. Process each load independently
    const checks = activeLoads.map((load: ActiveLoad) => checkLoad(load));
    await Promise.allSettled(checks);

    console.log('[Monitor] ✅ Disruption check complete');

  } catch (err: any) {
    console.error('[Monitor] Fatal error:', err.message);
  }
}

// ============================================================
// PER-LOAD CHECK
// ============================================================

async function checkLoad(load: ActiveLoad): Promise<void> {
  try {
    // 1. Get driver's last known GPS location
    const location = await getDriverLocation(load.user_id);
    if (!location) {
      console.log(`[Monitor] No GPS data for driver ${load.user_id} — skipping`);
      return;
    }

    // Check if GPS data is stale (older than 30 min = driver may be off app)
    const locationAge = Date.now() - new Date(location.updated_at).getTime();
    if (locationAge > 30 * 60 * 1000) {
      console.log(`[Monitor] Stale GPS for driver ${load.user_id} — skipping`);
      return;
    }

    // 2. Calculate ETA
    const eta = await calculateETA(
      location.latitude,
      location.longitude,
      load.dest_lat,
      load.dest_lng,
      load.delivery_deadline
    );

    // 3. Check weather on remaining route
    const weather = await checkWeatherHazard(
      location.latitude,
      location.longitude,
      load.dest_lat,
      load.dest_lng
    );

    // 4. Act on findings
    const promises: Promise<any>[] = [];

    // ── Late risk alert ──
    if (eta.onTimeStatus === 'AT_RISK' || eta.onTimeStatus === 'LATE') {
      promises.push(handleLateRisk(load, eta, location));
    }

    // ── Weather hazard alert ──
    if (weather.detected) {
      promises.push(handleWeatherHazard(load, weather, location));
    }

    // ── Auto ETA update to broker every 2 hours if on-time ──
    if (
      eta.onTimeStatus === 'ON_TIME' &&
      shouldSendRoutineETA(load.last_eta_sent_at)
    ) {
      promises.push(sendRoutineETAUpdate(load, eta, location));
    }

    await Promise.allSettled(promises);

  } catch (err: any) {
    console.error(`[Monitor] Error checking load ${load.load_id}:`, err.message);
  }
}

// ============================================================
// ETA CALCULATION
// ============================================================

async function calculateETA(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  deadlineIso: string
): Promise<ETAResult> {
  const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY!;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLat},${fromLng}&destinations=${toLat},${toLng}&mode=driving&key=${GOOGLE_MAPS_KEY}`;

  const { data } = await axios.get(url);
  const element = data.rows[0]?.elements[0];

  if (!element || element.status !== 'OK') {
    // Fallback: straight-line estimate at 55 mph
    const miles = haversineDistance(fromLat, fromLng, toLat, toLng);
    const durationMinutes = (miles / 55) * 60;
    const estimatedArrival = new Date(Date.now() + durationMinutes * 60 * 1000);
    const deadline = new Date(deadlineIso);
    const minutesLate = Math.max(0, Math.floor((estimatedArrival.getTime() - deadline.getTime()) / 60000));

    return {
      distanceMiles: miles,
      durationMinutes,
      estimatedArrival,
      onTimeStatus: minutesLate === 0 ? 'ON_TIME' : minutesLate < 60 ? 'AT_RISK' : 'LATE',
      minutesLate,
    };
  }

  const durationMinutes = Math.round(element.duration.value / 60);
  const distanceMiles = Math.round(element.distance.value / 1609.34);
  const estimatedArrival = new Date(Date.now() + element.duration.value * 1000);
  const deadline = new Date(deadlineIso);

  const diffMs = estimatedArrival.getTime() - deadline.getTime();
  const minutesLate = Math.max(0, Math.round(diffMs / 60000));
  const minutesBuffer = Math.round(-diffMs / 60000); // How early they'd arrive

  let onTimeStatus: 'ON_TIME' | 'AT_RISK' | 'LATE';
  if (minutesLate > 60) {
    onTimeStatus = 'LATE';
  } else if (minutesLate > 0 || minutesBuffer < 30) {
    onTimeStatus = 'AT_RISK'; // Less than 30 min buffer = at risk
  } else {
    onTimeStatus = 'ON_TIME';
  }

  return { distanceMiles, durationMinutes, estimatedArrival, onTimeStatus, minutesLate };
}

// ============================================================
// WEATHER HAZARD CHECK
// ============================================================

async function checkWeatherHazard(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<WeatherHazard> {
  const WEATHER_KEY = process.env.OPENWEATHER_API_KEY!;

  // Check weather at midpoint of route
  const midLat = (fromLat + toLat) / 2;
  const midLng = (fromLng + toLng) / 2;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${midLat}&lon=${midLng}&appid=${WEATHER_KEY}&units=imperial`;
  const { data } = await axios.get(url);

  const condition = data.weather[0]?.main?.toLowerCase() || '';
  const windSpeed = data.wind?.speed || 0;
  const visibility = data.visibility || 10000; // meters

  // Hazardous conditions for truckers
  const hazards: Record<string, { severity: 'moderate' | 'severe' | 'extreme'; recommendation: string }> = {
    thunderstorm: { severity: 'severe', recommendation: 'Pull over at nearest truck stop and wait for storm to pass.' },
    snow: { severity: 'moderate', recommendation: 'Reduce speed, increase following distance. Check chain requirements.' },
    blizzard: { severity: 'extreme', recommendation: 'Stop driving immediately. Shelter at nearest truck stop.' },
    ice: { severity: 'extreme', recommendation: 'Extreme caution or halt. Ice on roads — brake distances are 10x normal.' },
    fog: { severity: visibility < 200 ? 'severe' : 'moderate', recommendation: 'Use low beams and hazards. Reduce speed significantly.' },
    tornado: { severity: 'extreme', recommendation: 'Do not drive. Seek shelter immediately — not under an overpass.' },
  };

  for (const [keyword, hazard] of Object.entries(hazards)) {
    if (condition.includes(keyword) || data.weather[0]?.description?.toLowerCase().includes(keyword)) {
      return {
        detected: true,
        condition: data.weather[0].description,
        severity: hazard.severity,
        recommendation: hazard.recommendation,
        location: data.name || 'your route',
      };
    }
  }

  // High wind alert for empty trailers
  if (windSpeed > 45) {
    return {
      detected: true,
      condition: `High winds ${Math.round(windSpeed)} mph`,
      severity: windSpeed > 60 ? 'severe' : 'moderate',
      recommendation: 'High crosswinds — reduce speed and watch for trailer sway, especially if running empty.',
      location: data.name || 'your route',
    };
  }

  return { detected: false };
}

// ============================================================
// ALERT HANDLERS
// ============================================================

async function handleLateRisk(
  load: ActiveLoad,
  eta: ETAResult,
  location: DriverLocation
): Promise<void> {
  const severity = eta.onTimeStatus === 'LATE' ? 'severe' : 'moderate';
  const timeDesc = eta.minutesLate === 0
    ? 'You have less than 30 minutes of buffer'
    : `You are approximately ${Math.round(eta.minutesLate / 60 * 10) / 10} hours behind`;

  // Push notification to driver
  await sendPushNotification({
    userId: load.user_id,
    type: 'ETA_REMINDER',
    title: eta.onTimeStatus === 'LATE' ? '🚨 Running Late!' : '⚠️ Delivery at Risk',
    body: `${timeDesc}. ${eta.distanceMiles} miles remaining to ${load.destination}.`,
    data: {
      loadId: load.load_id,
      screen: 'ActiveLoad',
      etaMinutes: eta.durationMinutes.toString(),
    },
  });

  // Auto-email broker if we have their email
  if (load.broker_email) {
    await sendBrokerDisruptionEmail(load, eta);
  }

  // Log the alert
  await supabase.from('disruption_alerts').insert({
    user_id: load.user_id,
    load_id: load.load_id,
    alert_type: 'LATE_RISK',
    severity,
    message: `Driver is ${eta.minutesLate} min behind schedule. ETA: ${eta.estimatedArrival.toLocaleTimeString()}. ${eta.distanceMiles} miles remaining.`,
  });

  console.log(`[Monitor] ⚠️ Late risk alert sent for load ${load.load_id}`);
}

async function handleWeatherHazard(
  load: ActiveLoad,
  weather: WeatherHazard,
  location: DriverLocation
): Promise<void> {
  // Push to driver
  await notifyWeatherAlert(load.user_id, {
    location: weather.location!,
    condition: weather.condition!,
    severity: weather.severity!,
    recommendation: weather.recommendation!,
  });

  // Log alert
  await supabase.from('disruption_alerts').insert({
    user_id: load.user_id,
    load_id: load.load_id,
    alert_type: 'WEATHER',
    severity: weather.severity!,
    message: `${weather.condition} detected on route near ${weather.location}. ${weather.recommendation}`,
  });

  console.log(`[Monitor] 🌩️ Weather alert sent for load ${load.load_id} — ${weather.condition}`);
}

async function sendRoutineETAUpdate(
  load: ActiveLoad,
  eta: ETAResult,
  location: DriverLocation
): Promise<void> {
  if (!load.broker_email) return;

  const etaStr = eta.estimatedArrival.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  await sendBrokerEmail({
    to: load.broker_email,
    subject: `✅ On-Time ETA Update — Load #${load.load_id}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#15803d">Pure Dispatch — ETA Update</h2>
        <p>Your driver is on track for delivery to <strong>${load.destination}</strong>.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Load #</strong></td><td style="padding:8px">${load.load_id}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Miles Remaining</strong></td><td style="padding:8px">${eta.distanceMiles} miles</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Estimated Arrival</strong></td><td style="padding:8px">${etaStr}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Status</strong></td><td style="padding:8px;color:#15803d"><strong>✅ ON TIME</strong></td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:20px">Automated update from Pure Dispatch AI Dispatcher</p>
      </div>
    `,
  });

  // Update last_eta_sent_at so we don't spam
  await supabase
    .from('active_loads')
    .update({ last_eta_sent_at: new Date().toISOString() })
    .eq('id', load.id);

  console.log(`[Monitor] 📧 Routine ETA update sent to broker for load ${load.load_id}`);
}

async function sendBrokerDisruptionEmail(
  load: ActiveLoad,
  eta: ETAResult
): Promise<void> {
  const etaStr = eta.estimatedArrival.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const isLate = eta.onTimeStatus === 'LATE';

  await sendBrokerEmail({
    to: load.broker_email!,
    subject: `${isLate ? '🚨 Delay Notice' : '⚠️ Possible Delay'} — Load #${load.load_id}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:${isLate ? '#dc2626' : '#d97706'}">
          Pure Dispatch — ${isLate ? 'Delay Notice' : 'At-Risk Delivery Alert'}
        </h2>
        <p>We want to keep you informed about delivery to <strong>${load.destination}</strong>.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Load #</strong></td><td style="padding:8px">${load.load_id}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Miles Remaining</strong></td><td style="padding:8px">${eta.distanceMiles} miles</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Revised ETA</strong></td><td style="padding:8px">${etaStr}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6"><strong>Status</strong></td>
          <td style="padding:8px;color:${isLate ? '#dc2626' : '#d97706'}">
            <strong>${isLate ? '🚨 RUNNING LATE' : '⚠️ AT RISK'}</strong>
          </td></tr>
          ${eta.minutesLate > 0 ? `<tr><td style="padding:8px;background:#f3f4f6"><strong>Estimated Delay</strong></td><td style="padding:8px">${eta.minutesLate} minutes</td></tr>` : ''}
        </table>
        <p>Our driver has been notified and is taking all measures to minimize delay. We apologize for any inconvenience.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:20px">Automated alert from Pure Dispatch AI Dispatcher</p>
      </div>
    `,
  });
}

// ============================================================
// EMAIL SENDER
// ============================================================

async function sendBrokerEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
  });

  await transporter.sendMail({
    from: `"Pure Dispatch" <dispatch@puredispatch.com>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

// ============================================================
// GPS HELPER
// ============================================================

async function getDriverLocation(userId: string): Promise<DriverLocation | null> {
  const { data, error } = await supabase
    .from('driver_locations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as DriverLocation;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function shouldSendRoutineETA(lastSentAt: string | null): boolean {
  if (!lastSentAt) return true; // Never sent — send now
  const hoursSinceLastSent =
    (Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastSent >= 2; // Send every 2 hours max
}
