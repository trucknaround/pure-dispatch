// api/pure/chat.js
// Vercel Serverless Function for Pure Dispatch AI Chat

import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Mock response generator (fallback when no API key)
const generateMockResponse = (message) => {
  const msg = message.toLowerCase();
  
  if (msg.includes('fuel') || msg.includes('diesel') || msg.includes('gas')) {
    return {
      text: "I found 3 fuel stations near you:\n\n1. Loves Travel Stop - 2.3 miles\n   ⭐ 4.2 rating - $3.89/gal\n\n2. Pilot Flying J - 5.1 miles\n   ⭐ 4.0 rating - $3.92/gal\n\n3. TA Petro - 7.8 miles\n   ⭐ 4.3 rating - $3.85/gal\n\nWant directions to any of these?",
      mood: "positive",
      meta: { skill: "findFuel" }
    };
  }
  
  if (msg.includes('direction') || msg.includes('navigate') || msg.includes('route')) {
    return {
      text: "📍 Calculating route...\n\nFrom: Current Location\nTo: Next destination\nDistance: 287 miles\nETA: 4 hours 23 minutes\n\nOpening Google Maps navigation now...",
      mood: "positive",
      meta: { skill: "sendNav" }
    };
  }
  
  if (msg.includes('load') || msg.includes('freight') || msg.includes('book')) {
    return {
      text: "📦 Found a load for you:\n\nPick up: Dallas, TX\nDelivery: Phoenix, AZ\nDistance: 1,065 miles\nRate: $2,850 ($2.68/mile)\nPick up: Tomorrow 8 AM\nDelivery: In 2 days by 5 PM\n\nWant me to book this?",
      mood: "positive",
      meta: { skill: "bookLoad" }
    };
  }
  
  if (msg.includes('weather') || msg.includes('forecast')) {
    return {
      text: "🌤️ Weather along your route:\n\nCurrent: 72°F, Partly cloudy\nNext 4 hours: Clear skies\nTonight: 30% chance of rain\n\n⚠️ No severe weather alerts\n\nSafe travels, driver!",
      mood: "positive",
      meta: { skill: "getWeatherRoute" }
    };
  }
  
  if (msg.includes('call') || msg.includes('broker') || msg.includes('phone')) {
    return {
      text: "📞 Calling broker now...\n\nBroker: ABC Logistics\nPhone: (555) 123-4567\nConnecting you in 3 seconds...\n\nI'll take notes during the call.",
      mood: "positive",
      meta: { skill: "callBroker" }
    };
  }
  
  if (msg.includes('weigh') || msg.includes('scale')) {
    return {
      text: "⚖️ Nearest weigh station:\n\nI-40 Weigh Station\n12 miles ahead\nStatus: OPEN\nHours: 24/7\n\nRemember to have your logs ready!",
      mood: "positive",
      meta: { skill: "checkWeighStation" }
    };
  }
  
  if (msg.includes('incident') || msg.includes('report') || msg.includes('accident')) {
    return {
      text: "⚠️ Incident logged:\n\nType: Traffic delay\nLocation: Current GPS\nTime: " + new Date().toLocaleTimeString() + "\nStatus: Reported\n\nI'll update dispatch and adjust your ETA.",
      mood: "neutral",
      meta: { skill: "logIncident" }
    };
  }
  
  return {
    text: "I got you, driver. What else can I help with? I can find fuel, give directions, search loads, call brokers, check weigh stations, get weather updates, or log incidents.",
    mood: "neutral"
  };
};

// Main handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
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
    const { message, driverId, wantAudio } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try OpenAI if API key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are Pure, an AI virtual truck dispatcher. 

You are loyal, confident, and calm under pressure.
You speak like a real dispatcher: friendly, clear, experienced.
You prioritize the driver's safety, time, and pay above all.
You use light trucking slang and occasional humor.

You handle: load search, routing, broker negotiations, compliance, and driver support.

You never say you're an AI. Always act like a dispatcher.

Sign off with phrases like "I got you, driver" or "Stay safe out there."`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        const responseText = completion.choices[0].message.content;

        return res.status(200).json({
          text: responseText,
          mood: "positive",
          meta: null
        });
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError.message);
        // Fall through to mock response
      }
    }

    // Fallback to mock response
    const mockResponse = generateMockResponse(message);
    return res.status(200).json(mockResponse);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      text: "I'm having trouble connecting right now. Can you try again in a moment? I'm still here for you.",
      mood: "neutral"
    });
  }
}
