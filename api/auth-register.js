// ============================================
// PRODUCTION AUTHENTICATION SYSTEM
// ============================================
// File: api/auth/register.js
// 
// This is a PRODUCTION-READY authentication system using:
// - Supabase (PostgreSQL database)
// - bcrypt (password hashing)
// - JWT (secure sessions)
// - UUIDs (unique user IDs)
// - Email verification
// ============================================

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export default async function handler(req, res) {
  // CORS headers
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
    const { 
      email, 
      password, 
      personalPhone,
      companyName,
      mcNumber,
      dotNumber,
      phone: companyPhone,
      equipmentTypes,
      trailerSizes,
      operatingRegions
    } = req.body;

    console.log('🔐 Registration attempt:', { email, companyName, mcNumber, dotNumber });

    // ============================================
    // VALIDATION
    // ============================================

    // Email validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Password validation
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Required fields for carrier
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!mcNumber && !dotNumber) {
      return res.status(400).json({ error: 'MC or DOT number is required' });
    }

    // ============================================
    // CHECK IF USER EXISTS
    // ============================================

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // ============================================
    // HASH PASSWORD
    // ============================================

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('✅ Password hashed successfully');

    // ============================================
    // CREATE USER
    // ============================================

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase(),
          password_hash: hashedPassword,
          personal_phone: personalPhone || null,
          email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (userError) {
      console.error('❌ User creation error:', userError);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    console.log('✅ User created:', user.id);

    // ============================================
    // CREATE CARRIER PROFILE
    // ============================================

    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .insert([
        {
          user_id: user.id,
          company_name: companyName,
          mc_number: mcNumber || null,
          dot_number: dotNumber || null,
          company_phone: companyPhone || null,
          equipment_types: equipmentTypes || [],
          trailer_sizes: trailerSizes || [],
          operating_regions: operatingRegions || [],
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (carrierError) {
      console.error('❌ Carrier creation error:', carrierError);
      // Rollback: Delete user if carrier creation fails
      await supabase.from('users').delete().eq('id', user.id);
      return res.status(500).json({ error: 'Failed to create carrier profile' });
    }

    console.log('✅ Carrier created:', carrier.id);

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

    console.log('✅ JWT token generated');

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        personalPhone: user.personal_phone
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
    console.error('❌ Registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
