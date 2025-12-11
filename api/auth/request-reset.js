// ============================================
// PRODUCTION PASSWORD RESET - REQUEST
// ============================================
// File: api/auth/request-reset.js
// ============================================

import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    const { email } = req.body;

    console.log('🔑 Password reset requested for:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // ============================================
    // FIND USER
    // ============================================

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    // Security: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (userError || !user) {
      console.log('❌ User not found, but returning success for security');
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a reset email has been sent'
      });
    }

    // ============================================
    // GENERATE SECURE RESET TOKEN
    // ============================================

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    console.log('✅ Reset token generated for:', user.id);

    // ============================================
    // STORE RESET TOKEN IN DATABASE
    // ============================================

    const { error: tokenError } = await supabase
      .from('password_resets')
      .insert([
        {
          user_id: user.id,
          token_hash: resetTokenHash,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        }
      ]);

    if (tokenError) {
      console.error('❌ Failed to store reset token:', tokenError);
      return res.status(500).json({ error: 'Failed to process reset request' });
    }

    // ============================================
    // SEND RESET EMAIL
    // ============================================

    const resetLink = `${process.env.APP_URL || 'https://pure-dispatch.vercel.app'}/?resetToken=${resetToken}&email=${encodeURIComponent(email)}`;

    const emailContent = {
      to: email,
      from: {
        email: process.env.SENDER_EMAIL || 'winnercircle163@gmail.com',
        name: 'Pure Dispatch'
      },
      subject: 'Reset Your Pure Dispatch Password',
      html: generatePasswordResetEmail(email, resetLink, resetToken),
      text: `
Reset Your Password

Hi,

You requested to reset your password for Pure Dispatch.

Click the link below to reset your password:
${resetLink}

Or use this reset code: ${resetToken}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The Pure Dispatch Team
      `.trim()
    };

    await sgMail.send(emailContent);

    console.log('✅ Password reset email sent to:', email);

    return res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    return res.status(500).json({
      error: 'Failed to send reset email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function generatePasswordResetEmail(email, resetLink, resetToken) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Pure Dispatch</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
        <tr>
            <td style="padding: 40px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; border: 1px solid #1f2937;">
                    <tr>
                        <td style="padding: 40px; text-align: center;">
                            <div style="width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; display: inline-block; margin-bottom: 20px;"></div>
                            <h1 style="margin: 0; font-size: 28px; color: #ffffff;">Pure Dispatch</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <h2 style="margin: 0 0 20px; font-size: 24px; color: #ffffff;">Reset Your Password</h2>
                            <p style="margin: 0 0 30px; font-size: 16px; color: #9ca3af;">
                                Click the button below to create a new password:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="text-align: center; padding-bottom: 30px;">
                                        <a href="${resetLink}" style="display: inline-block; padding: 16px 48px; background-color: #10b981; color: #000000; text-decoration: none; border-radius: 9999px; font-weight: 500; font-size: 16px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                <p style="margin: 0 0 10px; font-size: 14px; color: #9ca3af;"><strong style="color: #ffffff;">Can't click the button?</strong></p>
                                <p style="margin: 0; font-size: 12px; color: #10b981; word-break: break-all;">${resetLink}</p>
                            </div>
                            <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                                This link expires in 1 hour. If you didn't request this, please ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}
