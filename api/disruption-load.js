import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // POST — activate a load for monitoring
  if (req.method === 'POST') {
    const {
      loadId, brokerEmail, brokerName,
      destination, destLat, destLng,
      deliveryDeadline, rate
    } = req.body;

    if (!loadId || !destination || !destLat || !destLng || !deliveryDeadline) {
      return res.status(400).json({ error: 'loadId, destination, destLat, destLng, deliveryDeadline required' });
    }

    // Cancel any existing active load for this driver
    await supabase
      .from('active_loads')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'in_progress');

    // Activate new load
    const { data, error } = await supabase
      .from('active_loads')
      .insert({
        user_id: user.id,
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

    return res.json({
      success: true,
      message: `Load activated. Pure is now watching your route to ${destination}.`,
      activeLoad: data,
    });
  }

  // GET — get current active load and alerts
  if (req.method === 'GET') {
    const [loadsResult, alertsResult] = await Promise.all([
      supabase
        .from('active_loads')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('disruption_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return res.json({
      activeLoad: loadsResult.data?.[0] || null,
      alerts: alertsResult.data || [],
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
