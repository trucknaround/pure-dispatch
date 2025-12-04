// Pure Dispatch - TwiML Generation
// Generates TwiML that plays Pure's voice on Twilio calls

export default async function handler(req, res) {
  try {
    const { text, messageId = 'default' } = req.query;

    if (!text) {
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Message text is missing.</Say></Response>');
    }

    // Decode the text
    const messageText = decodeURIComponent(text);

    console.log(`Generating TwiML for message: "${messageText.substring(0, 50)}..."`);

    // Get the base URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // URL to our audio generation endpoint
    const audioUrl = `${baseUrl}/api/twilio/audio?text=${encodeURIComponent(messageText)}&messageId=${messageId}`;

    // Generate TwiML that plays the audio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">This message is from Pure Dispatch. Check your app for details.</Say>
</Response>`;

    // Return TwiML
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml);

  } catch (error) {
    console.error('TwiML generation error:', error);
    
    // Fallback TwiML with basic message
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello driver, this is Pure calling from your dispatch app. You have an important message. Please check your app.</Say>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(fallbackTwiml);
  }
}
