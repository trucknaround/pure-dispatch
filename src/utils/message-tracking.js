// Pure Dispatch - Message Tracking Utility
// Tracks messages for auto-call triggering

/**
 * Message structure:
 * {
 *   id: string,
 *   text: string,
 *   from: 'user' | 'pure',
 *   timestamp: Date,
 *   priority: 'HIGH' | 'MEDIUM' | 'LOW',
 *   read: boolean,
 *   responded: boolean,
 *   callTriggered: boolean,
 *   callSid: string | null
 * }
 */

// Priority levels
export const MessagePriority = {
  HIGH: 'HIGH',     // Call after 5 min no response
  MEDIUM: 'MEDIUM', // Call after 15 min no response
  LOW: 'LOW'        // No auto-call
};

// Check if message should trigger a call
export function shouldTriggerCall(message, settings) {
  // Already triggered a call
  if (message.callTriggered) {
    return false;
  }

  // Not from Pure
  if (message.from !== 'pure') {
    return false;
  }

  // Already responded to
  if (message.responded) {
    return false;
  }

  // Low priority - no auto-calls
  if (message.priority === MessagePriority.LOW) {
    return false;
  }

  // Auto-calling disabled
  if (!settings.autoCallEnabled) {
    return false;
  }

  // Check quiet hours
  if (isInQuietHours(settings.quietHours)) {
    return false;
  }

  // Check daily call limit
  if (hasReachedDailyLimit(settings.maxCallsPerDay)) {
    return false;
  }

  // Check time threshold based on priority
  const minutesSinceSent = getMinutesSince(message.timestamp);
  
  if (message.priority === MessagePriority.HIGH) {
    return minutesSinceSent >= (settings.highPriorityDelay || 5);
  }
  
  if (message.priority === MessagePriority.MEDIUM) {
    return minutesSinceSent >= (settings.mediumPriorityDelay || 15);
  }

  return false;
}

// Check if current time is in quiet hours
export function isInQuietHours(quietHours) {
  if (!quietHours || !quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // Minutes since midnight

  const [startHour, startMin] = (quietHours.start || '22:00').split(':').map(Number);
  const [endHour, endMin] = (quietHours.end || '06:00').split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Quiet hours span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

// Check if daily call limit reached
export function hasReachedDailyLimit(maxCallsPerDay) {
  // Get today's calls from localStorage
  const today = new Date().toDateString();
  const callHistory = JSON.parse(localStorage.getItem('pureCallHistory') || '{}');
  const todayCalls = callHistory[today] || [];
  
  return todayCalls.length >= maxCallsPerDay;
}

// Get minutes since timestamp
export function getMinutesSince(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  return Math.floor((now - then) / (1000 * 60));
}

// Record a call in history
export function recordCall(messageId, callSid) {
  const today = new Date().toDateString();
  const callHistory = JSON.parse(localStorage.getItem('pureCallHistory') || '{}');
  
  if (!callHistory[today]) {
    callHistory[today] = [];
  }
  
  callHistory[today].push({
    messageId,
    callSid,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem('pureCallHistory', JSON.stringify(callHistory));
}

// Get call statistics
export function getCallStats() {
  const callHistory = JSON.parse(localStorage.getItem('pureCallHistory') || '{}');
  const today = new Date().toDateString();
  const todayCalls = callHistory[today] || [];
  
  // Clean up old entries (keep last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  Object.keys(callHistory).forEach(date => {
    const callDate = new Date(date);
    if (callDate < sevenDaysAgo) {
      delete callHistory[date];
    }
  });
  
  localStorage.setItem('pureCallHistory', JSON.stringify(callHistory));
  
  return {
    todayCount: todayCalls.length,
    todayCalls: todayCalls,
    history: callHistory
  };
}

// Default call settings
export const defaultCallSettings = {
  autoCallEnabled: true,
  highPriorityDelay: 5,      // Minutes
  mediumPriorityDelay: 15,   // Minutes
  maxCallsPerDay: 10,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '06:00'
  }
};

// Get call settings from localStorage
export function getCallSettings() {
  const saved = localStorage.getItem('pureCallSettings');
  if (saved) {
    try {
      return { ...defaultCallSettings, ...JSON.parse(saved) };
    } catch (e) {
      return defaultCallSettings;
    }
  }
  return defaultCallSettings;
}

// Save call settings
export function saveCallSettings(settings) {
  localStorage.setItem('pureCallSettings', JSON.stringify(settings));
}

// Determine message priority based on content
export function determineMessagePriority(text) {
  const lowerText = text.toLowerCase();
  
  // High priority keywords
  const highPriorityKeywords = [
    'urgent', 'asap', 'immediately', 'emergency',
    'hot load', 'high value', 'time sensitive',
    'broker calling', 'broker urgent', 'needs update now'
  ];
  
  // Medium priority keywords
  const mediumPriorityKeywords = [
    'expiring', 'expires', 'document needed',
    'update required', 'eta needed', 'delivery',
    'pickup', 'appointment'
  ];
  
  // Check for high priority
  if (highPriorityKeywords.some(keyword => lowerText.includes(keyword))) {
    return MessagePriority.HIGH;
  }
  
  // Check for medium priority
  if (mediumPriorityKeywords.some(keyword => lowerText.includes(keyword))) {
    return MessagePriority.MEDIUM;
  }
  
  // Default to low priority
  return MessagePriority.LOW;
}
