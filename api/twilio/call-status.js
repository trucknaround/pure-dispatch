// Pure Dispatch - Twilio Call Status Webhook
// Tracks call status (initiated, ringing, answered, completed)

export default async function handler(req, res) {
  // Only allow POST from Twilio
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      CallSid,
      CallStatus,
      From,
      To,
      CallDuration,
      Direction,
      AnsweredBy
    } = req.body;

    console.log('=== TWILIO CALL STATUS ===');
    console.log('Call SID:', CallSid);
    console.log('Status:', CallStatus);
    console.log('From:', From);
    console.log('To:', To);
    console.log('Duration:', CallDuration, 'seconds');
    console.log('Answered By:', AnsweredBy);
    console.log('==========================');

    // Status can be: queued, initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled
    
    // Store call status (in production, save to database)
    const callRecord = {
      callSid: CallSid,
      status: CallStatus,
      from: From,
      to: To,
      duration: CallDuration,
      answeredBy: AnsweredBy,
      timestamp: new Date().toISOString()
    };

    // In production, you would:
    // 1. Save to database
    // 2. Notify frontend via WebSocket or polling
    // 3. Update message tracking
    // 4. Trigger follow-up actions if needed

    // For now, just log it
    console.log('Call record:', JSON.stringify(callRecord, null, 2));

    // Respond to Twilio (must respond with 200)
    return res.status(200).json({
      success: true,
      received: true,
      callSid: CallSid,
      status: CallStatus
    });

  } catch (error) {
    console.error('Call status webhook error:', error);
    // Still return 200 to Twilio so they don't retry
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}
