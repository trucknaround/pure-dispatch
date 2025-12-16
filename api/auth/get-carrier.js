import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;
    console.log('📦 Fetching carrier for user:', userId);

    // Get carrier data
    const { data: carrier, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !carrier) {
      console.log('❌ No carrier found');
      return res.status(404).json({ error: 'No carrier data found' });
    }

    console.log('✅ Carrier data found');
    return res.status(200).json({
      success: true,
      carrier: carrier
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
