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

  if (!process.env.OPENAI_API_KEY) {
    console.error('[Pure] OPENAI_API_KEY is not set in Vercel environment variables');
    return res.status(500).json({
      text: "Pure is offline — API key not configured. Check Vercel environment variables.",
      mood: 'neutral',
      meta: { error: 'MISSING_API_KEY' }
    });
  }

  const { message, driverId, wantAudio, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // ── Build context string for system prompt ────────────────
  let contextBlock = '';
  if (context) {
    const parts = [];

    if (context.driver) {
      parts.push(`DRIVER INFO:
- Name: ${context.driver.contact_person || context.driver.name || 'Unknown'}
- Email: ${context.driver.email || 'Unknown'}
- Phone: ${context.driver.phone || 'Unknown'}`);
    }

    if (context.carrier) {
      parts.push(`CARRIER INFO:
- Company: ${context.carrier.company_name || 'Unknown'}
- MC Number: ${context.carrier.mc_number || 'Unknown'}
- DOT Number: ${context.carrier.dot_number || 'Unknown'}
- Equipment: ${context.carrier.equipment_types?.join(', ') || 'Unknown'}
- Home Base: ${context.carrier.city || 'Unknown'}, ${context.carrier.state || 'Unknown'}
- Number of Trucks: ${context.carrier.number_of_trucks || 'Unknown'}`);
    }

    if (context.currentLoad) {
      parts.push(`ACTIVE LOAD:
- Load ID: ${context.currentLoad.loadNumber || context.currentLoad.load_id || 'None'}
- Route: ${context.currentLoad.origin || 'Unknown'} → ${context.currentLoad.destination || 'Unknown'}
- Rate: $${context.currentLoad.rate || 'Unknown'}
- Pickup: ${context.currentLoad.pickupDate || 'Unknown'}`);
    }

    if (context.documents && context.documents.length > 0) {
      parts.push(`UPLOADED DOCUMENTS:
${context.documents.map(d => `- ${d.type}: ${d.name || 'Uploaded'}`).join('\n')}`);
    }

    if (context.loads && context.loads.length > 0) {
      parts.push(`AVAILABLE LOADS (${context.loads.length} total):
${context.loads.slice(0, 5).map(l =>
  `- ${l.origin?.city}, ${l.origin?.state} → ${l.destination?.city}, ${l.destination?.state} | $${l.rate} | ${l.miles} mi | ${l.equipmentType}`
).join('\n')}`);
    }

    if (context.earnings) {
      parts.push(`EARNINGS:
- This Week: $${context.earnings.thisWeek || 0}
- This Month: $${context.earnings.thisMonth || 0}
- Total Loads Completed: ${context.earnings.totalLoads || 0}`);
    }

    if (context.location) {
      parts.push(`CURRENT LOCATION:
- Coordinates: ${context.location.latitude}, ${context.location.longitude}
- Speed: ${context.location.speed ? Math.round(context.location.speed * 2.237) + ' mph' : 'Stationary'}`);
    }

    if (context.currentView) {
      parts.push(`CURRENT PAGE: ${context.currentView}`);
    }

    if (parts.length > 0) {
      contextBlock = `\n\nCURRENT DRIVER CONTEXT (USE THIS DATA IN YOUR RESPONSES):\n${parts.join('\n\n')}\n\nYou have full knowledge of this driver's operation. When asked about their company, MC number, DOT, equipment, documents, loads, or earnings — use the data above. Never say you don't have their info if it's listed above.\n`;
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Pure, an AI virtual truck dispatcher for Pure Dispatch.
You are loyal, confident, and calm under pressure.
You speak like a real dispatcher: friendly, clear, experienced.
You prioritize the driver's safety, time, and pay above all.
You use light trucking slang and occasional humor.
${contextBlock}
You have access to these tools:
- draftEmail: Draft professional emails to brokers, shippers, or receivers
- findFuel: Find nearby fuel stations
- getWeather: Get route weather forecasts
- bookLoad: Search and book loads
- callBroker: Initiate phone calls
- logIncident: Document incidents and delays

When the driver asks you to email someone, use the draftEmail tool to create a professional email draft.
When asked about carrier info, documents, loads, or earnings — reference the context data above directly.
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
      max_tokens: 400,
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
    console.error('[Pure] OpenAI error:', error.status, error.message);

    let userMessage = "Hit a snag on my end, driver. Give me a second and try again. I got you.";
    let errorCode = 'UNKNOWN';

    if (error.status === 401) {
      userMessage = "Pure is offline — API key is invalid. Check Vercel environment variables.";
      errorCode = 'INVALID_API_KEY';
    } else if (error.status === 404) {
      userMessage = "Pure is offline — AI model not found.";
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
