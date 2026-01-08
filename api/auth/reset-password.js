import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if email exists or not (security)
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    const { error: tokenError } = await supabase
      .from('password_resets')
      .insert({
        user_id: user.id,
        email: user.email,
        token: resetToken,
        expires_at: resetTokenExpiry.toISOString(),
        created_at: new Date().toISOString()
      });

    if (tokenError) {
      console.error('Error saving reset token:', tokenError);
      return res.status(500).json({ error: 'Failed to generate reset token' });
    }

    // TODO: Send email with reset link
    // const resetUrl = `https://pure-dispatch.vercel.app/reset-password?token=${resetToken}&email=${email}`;
    // await sendEmail(email, 'Password Reset', `Click here to reset: ${resetUrl}`);

    console.log('✅ Password reset token generated for:', email);

    // TEMPORARY: Return token directly (remove when email is working)
    return res.status(200).json({
      success: true,
      message: 'Reset link sent',
      resetToken: resetToken, // REMOVE THIS IN PRODUCTION
      resetUrl: `${process.env.FRONTEND_URL || 'https://pure-dispatch.vercel.app'}?token=${resetToken}&email=${email}`
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
