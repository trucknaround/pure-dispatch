// Password Update API Endpoint
// File: api/update-password.js
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
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password requirements
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // In production, you would:
    // 1. Verify token exists in database
    // 2. Check token hasn't expired
    // 3. Verify token belongs to this email
    // 4. Hash the new password
    // 5. Update password in database
    // 6. Invalidate the reset token

    // For now, we'll update localStorage via the frontend
    // This is a mock implementation
    console.log('🔑 Password reset requested:', { email, tokenLength: token.length });

    // Since we're using localStorage, we'll send success and let the frontend handle it
    // In production, this would update the database

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      email: email.toLowerCase()
    });

  } catch (error) {
    console.error('❌ Password update error:', error);
    return res.status(500).json({
      error: 'Failed to update password',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
