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

    // Check if user is in verification team
    const { data: teamMember } = await supabase
      .from('verification_team')
      .select('*')
      .eq('user_email', userEmail)
      .eq('can_verify_loads', true)
      .single();

    if (!teamMember) {
      return res.status(403).json({ error: 'User is not authorized to verify loads' });
    }

    const { verificationId, action, notes } = req.body;

    if (!verificationId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`📋 Review action: ${action} for verification ${verificationId}`);

    // Update verification status
    const { data: updated, error } = await supabase
      .from('load_verifications')
      .update({
        status: action === 'approve' ? 'verified' : 'rejected',
        reviewed_by: decoded.userId,
        reviewed_at: new Date().toISOString(),
        verifier_notes: notes || null,
        rejection_reason: action === 'reject' ? notes : null
      })
      .eq('id', verificationId)
      .select()
      .single();

    if (error) {
      console.error('❌ Update failed:', error);
      return res.status(500).json({ error: 'Failed to update verification' });
    }

    console.log(`✅ Verification ${action}d`);

    return res.status(200).json({
      success: true,
      verification: updated
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
