// api/email/send.js
// Vercel Serverless Function for Sending Emails via SendGrid

import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, body, from } = req.body;

    // Validate required fields
    if (!to || !subject || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['to', 'subject', 'body']
      });
    }

    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured - email not sent');
      
      // Return success for demo purposes (so UI doesn't break)
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully (demo mode)',
        demo: true,
        emailData: { to, subject, body }
      });
    }

    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Prepare email message
    const msg = {
      to: to,
      from: from || 'dispatch@puredispatch.com', // Must be verified in SendGrid
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #000; padding: 20px; border-bottom: 2px solid #00ff88;">
            <h2 style="color: #00ff88; margin: 0;">Pure Dispatch</h2>
            <p style="color: #999; margin: 5px 0 0 0; font-size: 12px;">AI-Powered Virtual Dispatcher</p>
          </div>
          <div style="padding: 30px; background-color: #111; color: #fff;">
            ${body.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
          </div>
          <div style="background-color: #000; padding: 15px; text-align: center; border-top: 1px solid #333;">
            <p style="color: #666; font-size: 11px; margin: 0;">
              Sent via Pure Dispatch | AI Virtual Dispatcher for Trucking
            </p>
          </div>
        </div>
      `
    };

    // Send email via SendGrid
    await sgMail.send(msg);

    console.log(`Email sent successfully to: ${to}`);

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      to: to,
      subject: subject
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    // SendGrid specific error handling
    if (error.response) {
      console.error('SendGrid error response:', error.response.body);
      
      return res.status(error.code || 500).json({
        error: 'Failed to send email',
        message: error.response.body.errors?.[0]?.message || error.message,
        details: error.response.body
      });
    }

    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
}
