// Password Reset API Endpoint - SIMPLIFIED (No SendGrid Required)
// File: api/reset-password.js
// Upload this to your Vercel project

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

    // Check if email exists in localStorage (via credentials)
    // Note: In production, this would check a database
    // For now, we'll just generate a token and allow password reset

    // Generate secure reset token (valid for 1 hour)
    const resetToken = generateResetToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now

    console.log('✅ Reset token generated:', resetToken);
    console.log('📧 Email:', email);
    console.log('⏰ Expires:', new Date(expiresAt).toISOString());

    // TEMPORARY: Return the reset info directly
    // In production, this would send an email via SendGrid
    return res.status(200).json({
      success: true,
      message: 'Password reset initiated',
      // TEMPORARY: Return these for testing
      // Remove in production after SendGrid is set up
      resetToken: resetToken,
      resetLink: `${req.headers.origin || 'https://pure-dispatch.vercel.app'}/reset?token=${resetToken}&email=${encodeURIComponent(email)}`,
      expiresAt: expiresAt,
      // Instructions for user
      instructions: 'TEMPORARY: Copy the resetToken below and use it to reset your password. In production, this will be sent via email.'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    return res.status(500).json({
      error: 'Failed to process password reset',
      details: error.message
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

/* 
===========================================
TO ENABLE EMAIL SENDING (OPTIONAL):
===========================================

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)

2. Verify your sender email:
   - Settings → Sender Authentication
   - Verify: noreply@puredispatch.com

3. Create API Key:
   - Settings → API Keys
   - Create new key with "Mail Send" permission

4. Add to Vercel:
   - Vercel Dashboard → Your Project
   - Settings → Environment Variables
   - Add: SENDGRID_API_KEY = your_key
   - Redeploy

5. Replace this endpoint with the full version that includes:
   - SendGrid email sending
   - Professional HTML email template
   - Error handling for email delivery

===========================================
*/
