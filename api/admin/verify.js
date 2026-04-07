// ============================================================
// PURE DISPATCH — ADMIN TOKEN VERIFY
// api/admin/verify.js
// ============================================================

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ valid: false });

  try {
    // Verify JWT
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);

    // Must be admin token
    if (!payload.isAdminToken || payload.role !== 'admin') {
      return res.status(403).json({ valid: false, error: 'Not an admin token' });
    }

    // Check session exists in database
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('id, expires_at')
      .eq('token', token)
      .single();

    if (!session) {
      return res.status(401).json({ valid: false, error: 'Session not found' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ valid: false, error: 'Session expired' });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      }
    });

  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Invalid token' });
  }
}
