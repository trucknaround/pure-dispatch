// Pure Dispatch - ElevenLabs Voice API Endpoint
// Generates natural AI voice for Pure's responses
// ES Modules format for Vercel

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required and must be a non-empty string' 
      });
    }

    // Limit text length (ElevenLabs limits)
    const maxLength = 5000;
    const textToSpeak = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;

    // ElevenLabs API configuration
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = '2qfp6zPuviqeCOZIE9RZ'; // Trinity - Pure's voice

    // Check if API key is configured
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Voice service not configured. Please add ELEVENLABS_API_KEY to environment variables.' 
      });
    }

    console.log(`Generating voice for: "${textToSpeak.substring(0, 50)}..."`);

    // Call ElevenLabs API
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
          text: textToSpeak,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.65,              // Smoothness
            similarity_boost: 0.75,       // Voice clarity
            style: 0.0,                   // Neutral style
            use_speaker_boost: true       // Enhanced quality
          }
        })
      }
    );

    // Check if ElevenLabs API call succeeded
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Return helpful error message
      if (response.status === 401) {
        return res.status(500).json({ 
          success: false, 
          error: 'Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY.' 
        });
      } else if (response.status === 429) {
        return res.status(500).json({ 
          success: false, 
          error: 'ElevenLabs API rate limit exceeded. Please try again later.' 
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: `Voice generation failed: ${response.status}` 
        });
      }
    }

    // Get audio buffer (native fetch uses arrayBuffer)
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);
    
    // Convert to base64 for JSON response
    const audioBase64 = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(`Voice generated successfully (${audioBuffer.length} bytes)`);

    // Return audio data
    res.status(200).json({
      success: true,
      audio: audioDataUrl,
      text: textToSpeak,
      voiceId: VOICE_ID,
      model: 'eleven_turbo_v2'
    });

  } catch (error) {
    console.error('Voice generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during voice generation',
      details: error.message 
    });
  }
}
