// Pure Dispatch - Audio Generation for Twilio
// Generates Trinity voice audio for phone calls

export default async function handler(req, res) {
  try {
    const { text, messageId = 'default' } = req.query;

    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    // Decode the text
    const messageText = decodeURIComponent(text);

    console.log(`Generating audio for call: "${messageText.substring(0, 50)}..."`);

    // ElevenLabs configuration
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = '2qfp6zPuviqeCOZIE9RZ'; // Trinity voice

    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not configured');
      return res.status(500).json({ error: 'Voice service not configured' });
    }

    // Prepare the message for phone call
    // Add intro and outro for context
    const callMessage = `Hello driver, this is Pure calling from your dispatch app. ${messageText}. Check your app for more details.`;

    // Generate audio with ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: callMessage,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.7,              // Slightly more stable for phone
            similarity_boost: 0.8,       // Higher clarity for phone
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return res.status(500).json({ 
        error: 'Voice generation failed',
        details: errorText 
      });
    }

    // Get audio buffer
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    console.log(`Audio generated successfully (${audioBuffer.length} bytes)`);

    // Return MP3 audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return res.status(200).send(audioBuffer);

  } catch (error) {
    console.error('Audio generation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
