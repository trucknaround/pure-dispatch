// Password Reset API Endpoint
// File: api/reset-password.js
// Upload this to your Vercel project

import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate secure reset token (valid for 1 hour)
    const resetToken = generateResetToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now

    // In production, you would:
    // 1. Check if email exists in database
    // 2. Store reset token with expiration in database
    // 3. Associate token with user's email

    // For now, we'll store in a simple format
    // In production, use a proper database
    const resetData = {
      email: email.toLowerCase(),
      token: resetToken,
      expiresAt: expiresAt,
      createdAt: Date.now()
    };

    console.log('🔑 Generated reset token:', resetData);

    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'Email service not configured. Please contact administrator.',
        debug: 'SENDGRID_API_KEY missing'
      });
    }

    console.log('✅ SendGrid API key found');

    // Send email via SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const resetLink = `https://pure-dispatch.vercel.app/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const emailContent = {
      to: email,
      from: {
        email: 'winnercircle163@gmail.com', // Your verified sender email
        name: 'Pure Dispatch'
      },
      subject: 'Reset Your Pure Dispatch Password',
      html: generatePasswordResetEmail(email, resetLink, resetToken),
      text: `
Hello,

You requested to reset your password for your Pure Dispatch account.

Click the link below to reset your password:
${resetLink}

Or use this reset code: ${resetToken}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The Pure Dispatch Team
      `.trim()
    };

    console.log('📧 Attempting to send email via SendGrid...');
    await sgMail.send(emailContent);

    console.log('✅ Password reset email sent to:', email);

    return res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      // In production, don't return the token
      // Only including for testing purposes
      debug: process.env.NODE_ENV === 'development' ? { token: resetToken, expiresAt } : undefined
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    
    // Provide specific error messages based on SendGrid error codes
    let userMessage = 'Failed to send reset email';
    let debugInfo = error.message;
    
    if (error.code === 403 || error.message?.includes('403')) {
      userMessage = 'Email sender not verified. Please contact administrator.';
      debugInfo = 'Sender email not verified in SendGrid';
      console.error('❌ SendGrid 403: Sender not verified - contact@puredispatch.co.site');
    } else if (error.code === 401 || error.message?.includes('401')) {
      userMessage = 'Email service authentication failed. Please contact administrator.';
      debugInfo = 'Invalid SendGrid API key';
      console.error('❌ SendGrid 401: Invalid API key');
    } else if (error.message?.includes('@sendgrid/mail')) {
      userMessage = 'Email service not properly configured. Please contact administrator.';
      debugInfo = 'SendGrid package not installed';
      console.error('❌ SendGrid package not found');
    }
    
    return res.status(500).json({
      error: userMessage,
      details: debugInfo,
      code: error.code || 500
    });
  }
}

// Generate a secure random token
function generateResetToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Generate professional HTML email template
function generatePasswordResetEmail(email, resetLink, resetToken) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Pure Dispatch</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #111111; border-radius: 16px; border: 1px solid #1f2937;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <div style="width: 64px; height: 64px; background-color: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="1" y="3" width="15" height="13"></rect>
                                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                </svg>
                            </div>
                            <h1 style="margin: 0; font-size: 28px; font-weight: 300; color: #ffffff;">Pure Dispatch</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 500; color: #ffffff;">Reset Your Password</h2>
                            
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #9ca3af;">
                                Hello,
                            </p>
                            
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #9ca3af;">
                                You requested to reset the password for your Pure Dispatch account associated with <strong style="color: #10b981;">${email}</strong>.
                            </p>
                            
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #9ca3af;">
                                Click the button below to create a new password:
                            </p>
                            
                            <!-- Reset Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center; padding-bottom: 30px;">
                                        <a href="${resetLink}" style="display: inline-block; padding: 16px 48px; background-color: #10b981; color: #000000; text-decoration: none; border-radius: 9999px; font-weight: 500; font-size: 16px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Method -->
                            <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <p style="margin: 0 0 10px; font-size: 14px; color: #9ca3af;">
                                    <strong style="color: #ffffff;">Can't click the button?</strong>
                                </p>
                                <p style="margin: 0 0 10px; font-size: 14px; color: #9ca3af;">
                                    Copy and paste this link into your browser:
                                </p>
                                <p style="margin: 0; font-size: 12px; color: #10b981; word-break: break-all;">
                                    ${resetLink}
                                </p>
                            </div>
                            
                            <!-- Reset Code -->
                            <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <p style="margin: 0 0 10px; font-size: 14px; color: #9ca3af;">
                                    <strong style="color: #ffffff;">Or use this reset code:</strong>
                                </p>
                                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #10b981; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                                    ${resetToken}
                                </p>
                            </div>
                            
                            <!-- Expiration Warning -->
                            <div style="background-color: #7c2d12; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin-bottom: 30px;">
                                <p style="margin: 0; font-size: 14px; color: #fcd34d;">
                                    ⚠️ <strong>This link will expire in 1 hour</strong> for your security.
                                </p>
                            </div>
                            
                            <!-- Security Note -->
                            <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                                <strong style="color: #ffffff;">Didn't request a password reset?</strong>
                            </p>
                            <p style="margin: 0 0 30px; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                            
                            <!-- Divider -->
                            <div style="height: 1px; background-color: #1f2937; margin: 30px 0;"></div>
                            
                            <!-- Footer Info -->
                            <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                                Need help? Contact us at <a href="mailto:support@puredispatch.com" style="color: #10b981; text-decoration: none;">support@puredispatch.com</a>
                            </p>
                            
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                This is an automated email. Please do not reply directly to this message.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #1f2937;">
                            <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                                <strong style="color: #ffffff;">Pure Dispatch</strong><br>
                                Your AI-Powered Dispatch Assistant
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                © 2025 Pure Dispatch. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}
