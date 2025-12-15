import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const emailLower = email.toLowerCase();
    console.log('🔐 Login attempt:', emailLower);

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailLower)
      .single();

    if (error || !user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful');

    return res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
