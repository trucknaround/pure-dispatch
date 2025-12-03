// Pure Dispatch - ElevenLabs Voice API Endpoint
// Generates natural AI voice for Pure's responses

const fetch = require('node-fetch');

module.exports = async (req, res) => {
// CORS
res.setHeader('Access-Control-Allow-Credentials', true);
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
res.setHeader(
'Access-Control-Allow-Headers',
'Content-Type, X-Requested-With, Accept'
);

if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

try {
const { text } = req.body;

if (!text || typeof text !== 'string' || !text.trim()) {
return res.status(400).json({
success: false,
error: 'Text is required and must be a non-empty string'
});
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'aMSt68OGf4xUZAnLpTU8'; // ← YOUR REAL VOICE ID

if (!ELEVENLABS_API_KEY) {
return res.status(500).json({
success: false,
error: 'ELEVENLABS_API_KEY is missing from environment variables'
});
}

// Make ElevenLabs request
const response = await fetch(
`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
{
method: 'POST',
headers: {
'xi-api-key': ELEVENLABS_API_KEY,
'Content-Type': 'application/json',
'Accept': 'audio/mpeg'
},
body: JSON.stringify({
text: text,
model_id: 'eleven_monolingual_v1',
voice_settings: {
stability: 0.65,
similarity_boost: 0.75,
style: 0,
use_speaker_boost: true
}
})
}
);

// If ElevenLabs returned an error, return the details
if (!response.ok) {
const errText = await response.text();
console.error('ElevenLabs API Error:', response.status, errText);

return res.status(response.status).json({
success: false,
error: errText || `Voice generation failed: ${response.status}`
});
}

// Convert audio to Base64
const audioBuffer = await response.buffer();
const base64 = audioBuffer.toString('base64');

return res.status(200).json({
success: true,
audio: `data:audio/mpeg;base64,${base64}`,
voiceId: VOICE_ID
});

} catch (err) {
console.error('Server Error:', err);
return res.status(500).json({
success: false,
error: 'Internal server error',
details: err.message
});
}
};
