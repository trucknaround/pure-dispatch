// api/auth/forgot-password.js
// Password Reset API Endpoint

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();

    // In production, you would:
    // 1. Check if email exists in your database
    // 2. Generate a secure reset token (JWT or random token)
    // 3. Store token in database with expiration (15 minutes)
    // 4. Send email with reset link

    // Generate reset token (example - in production use crypto.randomBytes or JWT)
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    
    // Reset link (in production, use your actual domain)
    const resetLink = `${process.env.FRONTEND_URL || 'https://pure-dispatch.vercel.app'}/reset-password?token=${resetToken}`;

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const msg = {
        to: sanitizedEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@puredispatch.com',
        subject: 'Pure Dispatch - Password Reset Request',
        text: `You requested a password reset. Click this link to reset your password: ${resetLink}

This link will expire in 15 minutes.

If you didn't request this, please ignore this email.

- Pure Dispatch Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #000; padding: 20px; text-align: center;">
              <h1 style="color: #22c55e; margin: 0;">Pure Dispatch</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p style="color: #666; line-height: 1.6;">
                You requested to reset your password for your Pure Dispatch account.
                Click the button below to create a new password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color: #22c55e; color: #000; padding: 12px 30px; 
                          text-decoration: none; border-radius: 25px; font-weight: bold;
                          display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                This link will expire in 15 minutes.
              </p>
              <p style="color: #999; font-size: 14px;">
                If you didn't request this password reset, please ignore this email.
                Your password will remain unchanged.
              </p>
            </div>
            <div style="background-color: #f1f1f1; padding: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 Pure Dispatch. All rights reserved.
              </p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Password reset email sent to: ${sanitizedEmail}`);
    } else {
      // Mock mode - log the reset link
      console.log(`[MOCK] Password reset link: ${resetLink}`);
    }

    // Always return the same message for security (don't reveal if email exists)
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions shortly.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Don't reveal specific error details to user for security
    return res.status(500).json({
      error: 'An error occurred processing your request. Please try again later.'
    });
  }
}
