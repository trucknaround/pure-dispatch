// ============================================================
// PURE DISPATCH — ADMIN SOURCE RULES
// api/admin/source-rules.js
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('source_rules')
      .select('*')
      .order('source', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ rules: data || [] });
  } catch (err) {
    console.error('[Admin] Source rules error:', err);
    return res.status(500).json({ error: err.message });
  }
}
