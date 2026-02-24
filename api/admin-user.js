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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Admin only' });

  // GET — list all users
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('carrier_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ users: data });
  }

  // PATCH — update a user's role
  if (req.method === 'PATCH') {
    const { userId, role } = req.body;
    if (!userId || !['admin', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'userId and role (admin or driver) required' });
    }

    const { error } = await supabase
      .from('carrier_profiles')
      .update({ role })
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: `User role updated to ${role}` });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
