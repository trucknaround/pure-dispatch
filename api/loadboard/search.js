// ============================================================
// PURE DISPATCH — 123LOADBOARD SEARCH
// api/loadboard/search.js
// ============================================================
// Fetches loads from 123Loadboard per-user authenticated.
// NEVER stores full 123 load data (contract requirement).
// Each request tied to authenticated end user only.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { logAudit, getRestrictedExpiry } from '../middleware/sourceEnforcement.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth ──────────────────────────────────────────────────
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    userId = payload.userId || payload.sub;
    if (!userId) throw new Error('No user ID');
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // ── Verify user has connected 123 account ────────────────
  const { data: connection } = await supabase
    .from('user_loadboard_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', '123loadboard')
    .eq('is_active', true)
    .single();

  if (!connection && process.env.LOADBOARD_DEV_MODE !== 'true') {
    return res.status(403).json({
      error: 'No 123Loadboard account connected.',
      code: 'NOT_CONNECTED',
      message: 'Please connect your 123Loadboard account in Settings to search loads.',
    });
  }

  // Check token expiry
 if (connection && connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
    return res.status(403).json({
      error: '123Loadboard session expired.',
      code: 'TOKEN_EXPIRED',
      message: 'Please reconnect your 123Loadboard account in Settings.',
    });
  }

  const { origin, destination, equipmentType, weight, length, radius = 50 } = req.body;

  // Log the search request
  await logAudit({
    userId,
    source: '123loadboard',
    action: 'search',
    decision: 'ALLOWED',
    metadata: { origin, destination, equipmentType },
  });

  // Update last used timestamp
  await supabase
    .from('user_loadboard_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', '123loadboard');

  try {
    // ── Fetch from 123Loadboard API ───────────────────────
    const searchParams = {
      origin: origin || '',
      destination: destination || '',
      equipment_type: equipmentType || 'V',
      radius,
      ...(weight && { max_weight: weight }),
      ...(length && { min_length: length }),
    };

    const loadboardRes = await fetch('https://api.123loadboard.com/v2/loads/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.access_token}`,
        'X-API-Key': process.env.LOADBOARD_123_API_KEY,
        'X-End-User-ID': userId, // Per-user tracking required by contract
      },
      body: JSON.stringify(searchParams),
    });

    if (!loadboardRes.ok) {
      const errorText = await loadboardRes.text();
      console.error('[123Search] API error:', loadboardRes.status, errorText);

      if (loadboardRes.status === 401) {
        // Mark connection as expired
        await supabase
          .from('user_loadboard_connections')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('provider', '123loadboard');

        return res.status(403).json({
          error: '123Loadboard session expired.',
          code: 'TOKEN_EXPIRED',
          message: 'Please reconnect your 123Loadboard account in Settings.',
        });
      }

      throw new Error(`123Loadboard API error: ${loadboardRes.status}`);
    }

    const loadboardData = await loadboardRes.json();
    const rawLoads = loadboardData.loads || loadboardData.results || [];

    // ── Transform loads (strip sensitive data per contract) ─
    // DO NOT store full payload — only return to requesting user
    const loads = rawLoads.map(load => ({
      id: `123_${load.id || load.load_id}`,
      source: '123loadboard',
      source_end_user_id: userId, // CRITICAL: bind to requesting user
      is_restricted: true,
      can_cache: false,
      restricted_data_expires_at: getRestrictedExpiry(),
      original_url: load.url || `https://www.123loadboard.com/load/${load.id}`,

      // Load details
      origin: {
        city: load.origin_city || load.pickup_city,
        state: load.origin_state || load.pickup_state,
        zip: load.origin_zip,
      },
      destination: {
        city: load.destination_city || load.delivery_city,
        state: load.destination_state || load.delivery_state,
        zip: load.destination_zip,
      },
      miles: load.miles || load.distance,
      rate: load.rate || load.pay,
      ratePerMile: load.rate_per_mile || (load.rate && load.miles ? (load.rate / load.miles).toFixed(2) : null),
      equipmentType: load.equipment_type || load.equipment,
      weight: load.weight,
      length: load.length,
      commodity: load.commodity,
      pickupDate: load.pickup_date || load.available_date,
      deliveryDate: load.delivery_date,
      age: load.age || load.posted_age,

      // Broker info (shown but direct contact requires redirect)
      brokerName: load.company_name || load.broker_name,
      brokerMC: load.mc_number,
      creditScore: load.credit_score,

      // Compliance flags
      requiresRedirectForBooking: true,
      allowDirectContact: false,
    }));

    return res.status(200).json({
      success: true,
      loads,
      total: loads.length,
      source: '123loadboard',
      // IMPORTANT: remind frontend not to cache this
      cacheControl: 'no-store',
      expiresAt: getRestrictedExpiry(),
    });

  } catch (err) {
    // ── Dev/Demo mode fallback ────────────────────────────
    if (process.env.LOADBOARD_DEV_MODE === 'true') {
      console.log('[123Search] Dev mode — returning mock loads');

      const mockLoads = generateMockLoads(userId, origin, destination, equipmentType);

      await logAudit({
        userId,
        source: '123loadboard',
        action: 'search_dev_mode',
        decision: 'ALLOWED',
        metadata: { origin, destination, mockCount: mockLoads.length },
      });

      return res.status(200).json({
        success: true,
        loads: mockLoads,
        total: mockLoads.length,
        source: '123loadboard',
        devMode: true,
        cacheControl: 'no-store',
        expiresAt: getRestrictedExpiry(),
      });
    }

    console.error('[123Search] Error:', err);
    return res.status(500).json({ error: 'Load search failed: ' + err.message });
  }
}

// ── Mock loads for dev/demo mode ─────────────────────────────
function generateMockLoads(userId, origin, destination, equipmentType) {
  const routes = [
    { oc: 'Atlanta', os: 'GA', dc: 'Chicago', ds: 'IL', miles: 716, rate: 2100 },
    { oc: 'Dallas', os: 'TX', dc: 'Los Angeles', ds: 'CA', miles: 1435, rate: 3800 },
    { oc: 'Chicago', os: 'IL', dc: 'New York', ds: 'NY', miles: 790, rate: 2400 },
    { oc: 'Miami', os: 'FL', dc: 'Atlanta', ds: 'GA', miles: 662, rate: 1900 },
    { oc: 'Los Angeles', os: 'CA', dc: 'Phoenix', ds: 'AZ', miles: 372, rate: 1200 },
  ];

  return routes.map((r, i) => ({
    id: `123_dev_${userId}_${i}`,
    source: '123loadboard',
    source_end_user_id: userId,
    is_restricted: true,
    can_cache: false,
    restricted_data_expires_at: getRestrictedExpiry(),
    original_url: 'https://www.123loadboard.com',
    origin: { city: r.oc, state: r.os },
    destination: { city: r.dc, state: r.ds },
    miles: r.miles,
    rate: r.rate,
    ratePerMile: (r.rate / r.miles).toFixed(2),
    equipmentType: equipmentType || 'Dry Van',
    weight: 42000,
    commodity: 'General Freight',
    pickupDate: new Date(Date.now() + i * 86400000).toLocaleDateString(),
    brokerName: ['Echo Global', 'Coyote Logistics', 'CH Robinson', 'Total Quality', 'Convoy'][i],
    brokerMC: `MC${300000 + i * 1000}`,
    creditScore: [85, 92, 78, 88, 95][i],
    requiresRedirectForBooking: true,
    allowDirectContact: false,
    devMode: true,
  }));
}
