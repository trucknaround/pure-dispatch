// ============================================
// PRODUCTION PASSWORD RESET - COMPLETE
// ============================================
// File: api/auth/reset-password.js
// ============================================

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { token, email, newPassword } = req.body;

    console.log('🔑 Password reset completion for:', email);

    // ============================================
    // VALIDATION
    // ============================================

    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // ============================================
    // FIND USER
    // ============================================

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'Invalid reset link' });
    }

    // ============================================
    // VERIFY RESET TOKEN
    // ============================================

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: resetRecord, error: resetError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('user_id', user.id)
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resetError || !resetRecord) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    console.log('✅ Reset token verified');

    // ============================================
    // HASH NEW PASSWORD
    // ============================================

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // ============================================
    // UPDATE PASSWORD
    // ============================================

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Failed to update password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // ============================================
    // MARK TOKEN AS USED
    // ============================================

    await supabase
      .from('password_resets')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', resetRecord.id);

    console.log('✅ Password updated successfully for:', email);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    return res.status(500).json({
      error: 'Failed to reset password',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
