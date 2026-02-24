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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin only
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabase
    .from('carrier_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, body, segment = 'all' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    // Get all push tokens
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('user_id, token');

    if (error) return res.status(500).json({ error: error.message });
    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, message: 'No registered devices' });
    }

    let sent = 0;
    let failed = 0;

    // Send to each driver
    for (const row of tokens) {
      try {
        await admin.messaging().send({
          token: row.token,
          notification: { title, body },
          data: { type: 'SYSTEM_ALERT', timestamp: Date.now().toString() },
          android: { priority: 'high', notification: { sound: 'default', color: '#00FF88' } },
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${row.user_id}:`, err.message);
        failed++;
      }
    }

    return res.json({ success: true, sent, failed, total: tokens.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
