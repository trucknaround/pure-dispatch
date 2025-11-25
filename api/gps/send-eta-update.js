// api/gps/send-eta-update.js
// Vercel Serverless Function for sending ETA updates to brokers

const sgMail = require('@sendgrid/mail');

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      brokerEmail,
      carrierInfo,
      currentLocation,
      destination,
      eta,
      loadNumber
    } = req.body;

    // Validate required fields
    if (!brokerEmail || !carrierInfo || !currentLocation || !destination || !eta) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Configure SendGrid
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'dispatch@pure-dispatch.com';

    if (!SENDGRID_API_KEY) {
      console.log('SendGrid not configured - would send:');
      console.log('To:', brokerEmail);
      console.log('Subject: ETA Update -', carrierInfo.companyName);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Mock mode - email logged but not sent',
        mockData: {
          to: brokerEmail,
          from: SENDGRID_FROM_EMAIL,
          subject: `ETA Update - ${carrierInfo.companyName} - Load #${loadNumber || 'N/A'}`
        }
      });
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    // Create email content
    const subject = `ETA Update - ${carrierInfo.companyName}${loadNumber ? ` - Load #${loadNumber}` : ''}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #22c55e; }
    .label { font-weight: bold; color: #16a34a; }
    .value { color: #1f2937; }
    .eta-box { background: #dcfce7; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0; }
    .eta-time { font-size: 24px; font-weight: bold; color: #16a34a; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .map-link { display: inline-block; background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚛 ETA Update</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Real-time location update from Pure Dispatch</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h3 style="margin-top: 0; color: #16a34a;">Current Status</h3>
        <p><span class="label">Carrier:</span> <span class="value">${carrierInfo.companyName}</span></p>
        <p><span class="label">Driver:</span> <span class="value">${carrierInfo.name || 'N/A'}</span></p>
        <p><span class="label">MC #:</span> <span class="value">${carrierInfo.mcNumber}</span></p>
        <p><span class="label">DOT #:</span> <span class="value">${carrierInfo.dotNumber}</span></p>
        <p><span class="label">Phone:</span> <span class="value">${carrierInfo.phone}</span></p>
      </div>

      <div class="section">
        <h3 style="margin-top: 0; color: #16a34a;">📍 Current Location</h3>
        <p><span class="label">Coordinates:</span> <span class="value">${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}</span></p>
        <p><span class="label">Last Updated:</span> <span class="value">${new Date().toLocaleString()}</span></p>
        ${currentLocation.speed ? `<p><span class="label">Speed:</span> <span class="value">${currentLocation.speed.toFixed(1)} mph</span></p>` : ''}
        <a href="https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}" class="map-link" target="_blank">
          📍 View on Google Maps
        </a>
      </div>

      <div class="section">
        <h3 style="margin-top: 0; color: #16a34a;">🎯 Destination</h3>
        <p><span class="label">Address:</span> <span class="value">${destination.address}</span></p>
        ${loadNumber ? `<p><span class="label">Load #:</span> <span class="value">${loadNumber}</span></p>` : ''}
      </div>

      <div class="eta-box">
        <p style="margin: 0 0 10px 0; color: #16a34a; font-weight: bold;">Estimated Arrival</p>
        <div class="eta-time">${eta.eta}</div>
        <p style="margin: 10px 0 0 0; color: #16a34a;">
          ${eta.distance} miles • ${eta.hoursRemaining} hours remaining
        </p>
      </div>

      <div class="section">
        <h3 style="margin-top: 0; color: #16a34a;">ℹ️ Trip Summary</h3>
        <p><span class="label">Distance Remaining:</span> <span class="value">${eta.distance} miles</span></p>
        <p><span class="label">Time Remaining:</span> <span class="value">${Math.floor(eta.duration / 60)} hours ${eta.duration % 60} minutes</span></p>
        <p><span class="label">Average Speed:</span> <span class="value">55 mph (estimated)</span></p>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated GPS update from <strong>Pure Dispatch AI</strong></p>
      <p>Real-time tracking • Accurate ETAs • Automated updates</p>
      <p style="margin-top: 10px; opacity: 0.7;">
        Powered by Pure Dispatch © ${new Date().getFullYear()}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
ETA Update - ${carrierInfo.companyName}

Current Status:
• Carrier: ${carrierInfo.companyName}
• Driver: ${carrierInfo.name || 'N/A'}
• MC: ${carrierInfo.mcNumber}
• DOT: ${carrierInfo.dotNumber}
• Phone: ${carrierInfo.phone}

Current Location:
• Coordinates: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}
• Last Updated: ${new Date().toLocaleString()}
${currentLocation.speed ? `• Speed: ${currentLocation.speed.toFixed(1)} mph` : ''}
• View on Map: https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}

Destination:
• Address: ${destination.address}
${loadNumber ? `• Load #: ${loadNumber}` : ''}

Estimated Arrival: ${eta.eta}
Distance Remaining: ${eta.distance} miles
Time Remaining: ${eta.hoursRemaining} hours

---
This is an automated GPS update from Pure Dispatch AI
Powered by Pure Dispatch © ${new Date().getFullYear()}
    `.trim();

    // Send email
    const msg = {
      to: brokerEmail,
      from: SENDGRID_FROM_EMAIL,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    await sgMail.send(msg);

    return res.status(200).json({ 
      success: true,
      message: 'ETA update sent successfully',
      to: brokerEmail
    });

  } catch (error) {
    console.error('ETA update error:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send ETA update',
      details: error.message 
    });
  }
}
