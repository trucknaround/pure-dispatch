import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Firebase Admin once
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-service-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // This endpoint is called internally by other api functions
  const serviceKey = req.headers['x-service-key'];
  const authToken = req.headers.authorization?.replace('Bearer ', '');

  let isAdmin = false;

  if (serviceKey === process.env.INTERNAL_SERVICE_KEY) {
    isAdmin = true;
  } else if (authToken) {
    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (user) {
      const { data: profile } = await supabase
        .from('carrier_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (profile?.role === 'admin') isAdmin = true;
    }
  }

  if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });

  const { userId, type, title, body, data } = req.body;
  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, and body required' });
  }

  try {
    // Get driver FCM token
    const { data: tokenRow, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .single();

    if (error || !tokenRow?.token) {
      return res.status(404).json({ error: 'No push token found for this user' });
    }

    // Send via FCM
    const message = {
      token: tokenRow.token,
      notification: { title, body },
      data: {
        type: type || 'SYSTEM_ALERT',
        userId,
        timestamp: Date.now().toString(),
        ...(data || {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          color: '#00FF88',
        },
      },
    };

    const messageId = await admin.messaging().send(message);

    // Log it
    await supabase.from('notification_log').insert({
      user_id: userId,
      type: type || 'SYSTEM_ALERT',
      title,
      body,
      fcm_message_id: messageId,
      sent_at: new Date().toISOString(),
      status: 'delivered',
    });

    return res.json({ success: true, messageId });
  } catch (err) {
    console.error('[Push] Send failed:', err.message);

    await supabase.from('notification_log').insert({
      user_id: userId,
      type: type || 'SYSTEM_ALERT',
      title,
      body,
      sent_at: new Date().toISOString(),
      status: 'failed',
      error_message: err.message,
    });

    return res.status(500).json({ error: err.message });
  }
}
