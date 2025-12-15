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

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailLower = email.toLowerCase();
    console.log('📝 Registration attempt:', emailLower);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email: emailLower,
          password_hash: passwordHash,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Registration failed:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered:', emailLower);

    return res.status(201).json({
      success: true,
      token: token,
      user: {
        id: newUser.id,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
