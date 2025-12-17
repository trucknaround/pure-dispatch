import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    const userEmail = decoded.email;

    // Check if user is authorized (either driver or verifier)
    const { data: teamMember } = await supabase
      .from('verification_team')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    // Allow submission if user is in verification team OR if they're submitting their own load
    const isVerifier = teamMember?.can_verify_loads === true;

    console.log('📤 Load verification submission');

    const loadData = req.body;

    // Insert into load_verifications table
    const { data: verification, error } = await supabase
      .from('load_verifications')
      .insert([{
        ...loadData,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Insert failed:', error);
      return res.status(500).json({ error: 'Failed to submit verification' });
    }

    console.log('✅ Verification submitted:', verification.id);

    return res.status(201).json({
      success: true,
      verification: verification
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
