console.log('[Pure] API Key present:', !!process.env.OPENAI_API_KEY);
console.log('[Pure] API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10));
// api/pure/chat.js
// Vercel Serverless Function for Pure Dispatch AI Chat
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── GUARD: fail loudly if API key is missing ──────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.error('[Pure] OPENAI_API_KEY is not set in Vercel environment variables');
    return res.status(500).json({
      text: "Pure is offline — API key not configured. Check Vercel environment variables.",
      mood: 'neutral',
      meta: { error: 'MISSING_API_KEY' }
    });
  }

  const { message, driverId, wantAudio } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      // ✅ FIXED: was "gpt-4o-mini" — now uses GPT-5.2
      model: "gpt-5.2-chat-latest",
      messages: [
        {
          role: "system",
          content: `You are Pure, an AI virtual truck dispatcher.
You are loyal, confident, and calm under pressure.
You speak like a real dispatcher: friendly, clear, experienced.
You prioritize the driver's safety, time, and pay above all.
You use light trucking slang and occasional humor.
You have access to these tools:
- draftEmail: Draft professional emails to brokers, shippers, or receivers
- findFuel: Find nearby fuel stations
- getWeather: Get route weather forecasts
- bookLoad: Search and book loads
- callBroker: Initiate phone calls
- logIncident: Document incidents and delays
When the driver asks you to email someone, use the draftEmail tool to create a professional email draft.
Always act like a dispatcher. Sign off with phrases like "I got you, driver" or "Stay safe out there."`
        },
        {
          role: "user",
          content: message
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "draftEmail",
            description: "Draft a professional email to a broker, shipper, receiver, or other trucking contact about loads, delays, issues, questions, or updates",
            parameters: {
              type: "object",
              properties: {
                recipient: {
                  type: "string",
                  description: "Who to email - can be role (e.g., 'the broker') or specific (e.g., 'John at ABC Logistics')"
                },
                subject: {
                  type: "string",
                  description: "Email subject line - clear and professional"
                },
                body: {
                  type: "string",
                  description: "Email body content - professional, clear, and friendly. Use proper email formatting with greeting and sign-off."
                },
                context: {
                  type: "string",
                  description: "What this email is about (e.g., 'pickup delay', 'rate confirmation', 'load inquiry', 'ETA update')"
                }
              },
              required: ["recipient", "subject", "body", "context"]
            }
          }
        }
      ],
      tool_choice: "auto",
      // ✅ FIXED: was 500 — increased for more complete responses
      max_completion_tokens: 400,
      temperature: 0.7
    });

    // Tool call: email draft
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];

      if (toolCall.function.name === "draftEmail") {
        const emailData = JSON.parse(toolCall.function.arguments);
        return res.status(200).json({
          text: "I've drafted this email for you. Take a look and let me know if you want to send it:",
          mood: "positive",
          meta: {
            skill: "draftEmail",
            action: "draft",
            email: emailData
          }
        });
      }
    }

    // Normal text response
    const responseText = completion.choices[0].message.content;
    return res.status(200).json({
      text: responseText,
      mood: detectMood(message),
      meta: {
        model: completion.model,
        tokens: completion.usage?.total_tokens
      }
    });

  } catch (error) {
    // ✅ FIXED: no more silent fallback to mock data — log real error details
    console.error('[Pure] OpenAI error:', error.status, error.message);

    let userMessage = "Hit a snag on my end, driver. Give me a second and try again. I got you.";
    let errorCode = 'UNKNOWN';

    if (error.status === 401) {
      userMessage = "Pure is offline — API key is invalid. Check Vercel environment variables.";
      errorCode = 'INVALID_API_KEY';
    } else if (error.status === 404) {
      userMessage = "Pure is offline — AI model not found. Your API key may not have GPT-5.2 access yet.";
      errorCode = 'MODEL_NOT_FOUND';
    } else if (error.status === 429) {
      userMessage = "Pure is slammed right now — rate limit hit. Try again in a moment, driver.";
      errorCode = 'RATE_LIMIT';
    } else if (error.status === 500) {
      userMessage = "OpenAI is having issues on their end. Try again in a minute, driver.";
      errorCode = 'OPENAI_SERVER_ERROR';
    }

    return res.status(200).json({
      text: userMessage,
      mood: 'neutral',
      meta: { error: errorCode }
    });
  }
}

function detectMood(message) {
  const lower = message.toLowerCase();
  if (/breakdown|accident|emergency|stuck|help|crash|stranded/.test(lower)) return 'stressed';
  if (/thanks|great|awesome|perfect|good|appreciate/.test(lower)) return 'positive';
  if (/tired|long day|exhausted|frustrated|late/.test(lower)) return 'tired';
  return 'neutral';
}
