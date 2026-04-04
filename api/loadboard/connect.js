// ============================================================
// PURE DISPATCH — 123LOADBOARD CONNECTION
// api/loadboard/connect.js
// ============================================================
// Handles per-user 123Loadboard account connection.
// Each driver must connect their OWN 123 account.
// Contract requirement: per-user authentication only.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { logAudit } from '../middleware/sourceEnforcement.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    userId = payload.userId || payload.sub;
    if (!userId) throw new Error('No user ID in token');
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // ── GET: check connection status ──────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_loadboard_connections')
      .select('id, provider, account_email, account_id, subscription_type, connected_at, last_used_at, is_active, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', '123loadboard')
      .single();

    if (error || !data) {
      return res.status(200).json({ connected: false });
    }

    const isExpired = data.token_expires_at && new Date(data.token_expires_at) < new Date();

    return res.status(200).json({
      connected: data.is_active && !isExpired,
      expired: isExpired,
      account: {
        email: data.account_email,
        accountId: data.account_id,
        subscriptionType: data.subscription_type,
        connectedAt: data.connected_at,
        lastUsedAt: data.last_used_at,
      }
    });
  }

  // ── POST: connect a 123Loadboard account ─────────────────
  if (req.method === 'POST') {
    const { username, password, action } = req.body;

    // Handle disconnect action
    if (action === 'disconnect') {
      await supabase
        .from('user_loadboard_connections')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('provider', '123loadboard');

      await logAudit({
        userId,
        source: '123loadboard',
        action: 'disconnect',
        decision: 'ALLOWED',
      });

      return res.status(200).json({ success: true, message: '123Loadboard account disconnected.' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // ── Authenticate with 123Loadboard API ────────────────
    // NOTE: Replace this with actual 123Loadboard OAuth endpoint
    // when Production API credentials are received
    try {
      const authResponse = await fetch('https://api.123loadboard.com/v2/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.LOADBOARD_123_API_KEY,
        },
        body: JSON.stringify({
          username,
          password,
          grant_type: 'password',
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        return res.status(401).json({
          error: 'Invalid 123Loadboard credentials. Please check your username and password.',
          details: errorData.message || 'Authentication failed',
        });
      }

      const authData = await authResponse.json();

      // Store connection
      const expiresAt = new Date(Date.now() + (authData.expires_in || 86400) * 1000).toISOString();

      const { error: upsertError } = await supabase
        .from('user_loadboard_connections')
        .upsert({
          user_id: userId,
          provider: '123loadboard',
          access_token: authData.access_token,
          refresh_token: authData.refresh_token || null,
          token_expires_at: expiresAt,
          account_email: username,
          account_id: authData.user_id || authData.account_id || username,
          subscription_type: authData.subscription_type || 'standard',
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        return res.status(500).json({ error: 'Failed to save connection: ' + upsertError.message });
      }

      await logAudit({
        userId,
        source: '123loadboard',
        action: 'connect',
        decision: 'ALLOWED',
        metadata: { accountEmail: username },
      });

      return res.status(200).json({
        success: true,
        message: '123Loadboard account connected successfully.',
        account: {
          email: username,
          subscriptionType: authData.subscription_type || 'standard',
        }
      });

    } catch (err) {
      // Development mode — store mock connection for testing
      if (process.env.NODE_ENV !== 'production' || process.env.LOADBOARD_DEV_MODE === 'true') {
        await supabase
          .from('user_loadboard_connections')
          .upsert({
            user_id: userId,
            provider: '123loadboard',
            access_token: 'dev_token_' + Date.now(),
            token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            account_email: username,
            account_id: 'dev_' + userId,
            subscription_type: 'dispatcher',
            connected_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
            is_active: true,
          }, { onConflict: 'user_id' });

        return res.status(200).json({
          success: true,
          message: '[DEV MODE] 123Loadboard account connected for testing.',
          dev: true,
        });
      }

      return res.status(500).json({ error: 'Connection failed: ' + err.message });
    }
  }

  // ── DELETE: disconnect account ────────────────────────────
  if (req.method === 'DELETE') {
    await supabase
      .from('user_loadboard_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', '123loadboard');

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
