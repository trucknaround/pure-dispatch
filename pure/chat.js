// api/pure/chat.js
// Vercel Serverless Function — handles POST /api/pure/chat
// Drop this file into your repo at: api/pure/chat.js
// Vercel auto-detects it. No extra config needed.

export default async function handler(req, res) {
  // Allow CORS so your React frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, carrier } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set in environment variables');
    return res.status(500).json({
      response: "Pure is offline right now — API key not configured. Contact support.",
      mood: 'neutral',
      skill: null,
      meta: null
    });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2-chat-latest',
        messages: [
          {
            role: 'system',
            content: `You are Pure — a veteran AI truck dispatcher for commercial motor vehicle (CMV) drivers. 
You are sharp, efficient, warm, and experienced. You speak like a real dispatcher — direct, no fluff, 
but always looking out for your driver. You use light trucking slang naturally.

Your job: help drivers with fuel, navigation, load booking, broker calls, weigh stations, weather, 
and incidents. If a driver needs something actionable, tell them clearly. If they're just talking, 
respond like a real human dispatcher would — brief, friendly, professional.

Current carrier context: ${carrier ? JSON.stringify(carrier) : 'Not provided'}

Always end responses with a short sign-off like "I got you, driver." or "Stay safe out there." or "10-4."
Keep responses under 150 words.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json().catch(() => ({}));
      console.error('OpenAI API error:', openaiRes.status, errorData);

      // Return specific error messages so you can debug in Vercel logs
      if (openaiRes.status === 401) {
        return res.status(500).json({
          response: "Pure is offline — API authentication failed. Check your OpenAI API key in Vercel settings.",
          mood: 'neutral',
          skill: null,
          meta: { error: 'INVALID_API_KEY', status: 401 }
        });
      }
      if (openaiRes.status === 404) {
        return res.status(500).json({
          response: "Pure is offline — the AI model was not found. Your API key may not have GPT-5.2 access yet.",
          mood: 'neutral',
          skill: null,
          meta: { error: 'MODEL_NOT_FOUND', status: 404 }
        });
      }
      if (openaiRes.status === 429) {
        return res.status(500).json({
          response: "Pure is slammed right now — rate limit hit. Try again in a moment, driver.",
          mood: 'neutral',
          skill: null,
          meta: { error: 'RATE_LIMIT', status: 429 }
        });
      }

      throw new Error(`OpenAI returned ${openaiRes.status}`);
    }

    const data = await openaiRes.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    // Detect mood from response text
    const mood = detectMood(message);

    return res.status(200).json({
      response: responseText,
      mood,
      skill: null,
      meta: {
        model: data.model,
        tokens: data.usage?.total_tokens
      }
    });

  } catch (error) {
    console.error('Pure chat error:', error.message);
    return res.status(500).json({
      response: "Hit a snag on my end, driver. Give me a second and try again. I got you.",
      mood: 'neutral',
      skill: null,
      meta: { error: error.message }
    });
  }
}

// Simple mood detection based on driver message keywords
function detectMood(message) {
  const lower = message.toLowerCase();
  if (/breakdown|accident|emergency|stuck|help|crash|stranded/.test(lower)) return 'stressed';
  if (/thanks|great|awesome|perfect|good|appreciate/.test(lower)) return 'positive';
  if (/tired|long day|exhausted|frustrated|late/.test(lower)) return 'tired';
  return 'neutral';
}
