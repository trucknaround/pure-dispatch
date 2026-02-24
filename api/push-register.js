import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // POST /api/push-register — register device token
  if (req.method === 'POST') {
    const { token: fcmToken, platform } = req.body;
    if (!fcmToken || !platform) {
      return res.status(400).json({ error: 'token and platform required' });
    }
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: user.id,
        token: fcmToken,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: 'Push token registered' });
  }

  // DELETE /api/push-register — unregister device token
  if (req.method === 'DELETE') {
    await supabase.from('push_tokens').delete().eq('user_id', user.id);
    return res.json({ success: true, message: 'Push token removed' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
