// ============================================
// PRODUCTION LOGIN SYSTEM
// ============================================
// File: api/auth/login.js
// ============================================

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email });

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // ============================================
    // FIND USER
    // ============================================

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ============================================
    // VERIFY PASSWORD
    // ============================================

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Password verified for:', email);

    // ============================================
    // GET CARRIER PROFILE
    // ============================================

    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (carrierError || !carrier) {
      console.error('❌ Carrier profile not found for user:', user.id);
      return res.status(500).json({ error: 'Failed to load profile' });
    }

    // ============================================
    // UPDATE LAST LOGIN
    // ============================================

    await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // ============================================
    // GENERATE JWT TOKEN
    // ============================================

    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        carrierId: carrier.id
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ Login successful:', email);

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        personalPhone: user.personal_phone,
        emailVerified: user.email_verified
      },
      carrier: {
        id: carrier.id,
        companyName: carrier.company_name,
        mcNumber: carrier.mc_number,
        dotNumber: carrier.dot_number,
        companyPhone: carrier.company_phone,
        equipmentTypes: carrier.equipment_types,
        trailerSizes: carrier.trailer_sizes,
        operatingRegions: carrier.operating_regions,
        verified: carrier.verified
      },
      token: token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
