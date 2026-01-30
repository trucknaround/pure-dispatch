// Pure Dispatch - Twilio Call Initiation
// Makes outbound calls to drivers with Pure's voice

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driverPhone, messageText, priority = 'MEDIUM', messageId } = req.body;

    // Validate required fields
    if (!driverPhone || !messageText) {
      return res.status(400).json({ 
        success: false,
        error: 'driverPhone and messageText are required' 
      });
    }

    // Validate phone number format (basic)
    const phoneRegex = /^\+?1?\d{10,15}$/;
    if (!phoneRegex.test(driverPhone.replace(/[-()\s]/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    // Twilio credentials
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    // Check if Twilio is configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio not configured');
      return res.status(500).json({
        success: false,
        error: 'Twilio service not configured'
      });
    }

    // Format phone number (add +1 if needed for US)
    let formattedPhone = driverPhone.replace(/[-()\s]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+1' + formattedPhone;
    }

    console.log(`Initiating call to ${formattedPhone}`);
    console.log(`Message: "${messageText.substring(0, 50)}..."`);
    console.log(`Priority: ${priority}`);

    // Create Twilio client (using basic auth)
    const twilioAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    // Make call via Twilio API
    const callResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          // TwiML URL - will play the generated audio
          Url: `https://${process.env.VERCEL_URL || req.headers.host}/api/twilio/generate-twiml?messageId=${messageId || 'default'}&text=${encodeURIComponent(messageText)}`,
          // Status callback to track call status
          StatusCallback: `https://${process.env.VERCEL_URL || req.headers.host}/api/twilio/call-status`,
          StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          StatusCallbackMethod: 'POST'
        })
      }
    );

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error('Twilio API error:', callResponse.status, errorText);
      
      return res.status(500).json({
        success: false,
        error: `Twilio call failed: ${callResponse.status}`,
        details: errorText
      });
    }

    const callData = await callResponse.json();

    console.log('Call initiated successfully:', callData.sid);

    // Return call details
    return res.status(200).json({
      success: true,
      callSid: callData.sid,
      status: callData.status,
      to: callData.to,
      from: callData.from,
      messageId: messageId,
      priority: priority,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Call initiation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
