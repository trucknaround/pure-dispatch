// ============================================================
// PURE DISPATCH — PUSH NOTIFICATION SERVICE
// pushService.ts
// ============================================================
// Handles all push alerts to drivers:
//   - New matching loads
//   - Weather hazards on route
//   - Broker replies
//   - Subscription renewals / billing issues
//   - System alerts
//
// Uses Firebase Cloud Messaging (FCM) — works for Android,
// iOS, and web (PWA). Free tier handles millions of messages.
// ============================================================

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// ── Supabase client (for reading/writing driver push tokens) ──
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Initialize Firebase Admin SDK once ──
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const messaging = admin.messaging();

// ============================================================
// TYPES
// ============================================================

export type NotificationType =
  | 'NEW_LOAD'
  | 'WEATHER_ALERT'
  | 'BROKER_REPLY'
  | 'BILLING_ISSUE'
  | 'SUBSCRIPTION_EXPIRING'
  | 'LOAD_VERIFICATION_RESULT'
  | 'ETA_REMINDER'
  | 'SYSTEM_ALERT';

export interface PushPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>; // FCM requires string values
  imageUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================
// CORE SEND FUNCTION
// ============================================================

export async function sendPushNotification(
  payload: PushPayload
): Promise<NotificationResult> {
  try {
    // 1. Look up driver's FCM token from Supabase
    const { data: tokenRow, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', payload.userId)
      .single();

    if (error || !tokenRow?.token) {
      console.warn(`[Push] No FCM token found for user ${payload.userId}`);
      return { success: false, error: 'No push token registered for this user' };
    }

    const fcmToken = tokenRow.token;

    // 2. Build FCM message
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: {
        type: payload.type,
        userId: payload.userId,
        timestamp: Date.now().toString(),
        ...(payload.data || {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: getChannelId(payload.type),
          color: '#00FF88', // Pure Dispatch green
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          icon: '/icons/pure-dispatch-icon-192.png',
          badge: '/icons/badge-72.png',
          requireInteraction: payload.type === 'WEATHER_ALERT' || payload.type === 'BILLING_ISSUE',
        },
      },
    };

    // 3. Send via FCM
    const messageId = await messaging.send(message);

    // 4. Log to Supabase for analytics
    await supabase.from('notification_log').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      fcm_message_id: messageId,
      sent_at: new Date().toISOString(),
      status: 'delivered',
    });

    console.log(`[Push] ✅ Sent ${payload.type} to user ${payload.userId} — ${messageId}`);
    return { success: true, messageId };

  } catch (err: any) {
    console.error(`[Push] ❌ Failed for user ${payload.userId}:`, err.message);

    // Log failure too
    await supabase.from('notification_log').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      sent_at: new Date().toISOString(),
      status: 'failed',
      error_message: err.message,
    });

    return { success: false, error: err.message };
  }
}

// ── Send to multiple drivers at once ──
export async function sendBulkNotifications(
  payloads: PushPayload[]
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    payloads.map((p) => sendPushNotification(p))
  );

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  return { sent, failed: payloads.length - sent };
}

// ============================================================
// TYPED NOTIFICATION HELPERS
// (Call these instead of sendPushNotification directly)
// ============================================================

/** Alert driver that a new load matches their preferences */
export async function notifyNewLoad(
  userId: string,
  load: {
    id: string;
    origin: string;
    destination: string;
    rate: number;
    miles: number;
    equipment: string;
    brokerName: string;
  }
) {
  const ratePerMile = (load.rate / load.miles).toFixed(2);
  return sendPushNotification({
    userId,
    type: 'NEW_LOAD',
    title: '🚛 New Load Available!',
    body: `${load.origin} → ${load.destination} | $${load.rate.toLocaleString()} ($${ratePerMile}/mi) | ${load.equipment}`,
    data: {
      loadId: load.id,
      origin: load.origin,
      destination: load.destination,
      rate: load.rate.toString(),
      brokerName: load.brokerName,
      screen: 'LoadDetail',
    },
  });
}

/** Alert driver of weather hazard on their current route */
export async function notifyWeatherAlert(
  userId: string,
  alert: {
    location: string;
    condition: string;
    severity: 'moderate' | 'severe' | 'extreme';
    recommendation: string;
  }
) {
  const severityEmoji = { moderate: '⚠️', severe: '🌩️', extreme: '🚨' }[alert.severity];
  return sendPushNotification({
    userId,
    type: 'WEATHER_ALERT',
    title: `${severityEmoji} Weather Alert — ${alert.severity.toUpperCase()}`,
    body: `${alert.condition} near ${alert.location}. ${alert.recommendation}`,
    data: {
      severity: alert.severity,
      location: alert.location,
      screen: 'WeatherDetail',
    },
  });
}

/** Alert driver that a broker responded to their outreach */
export async function notifyBrokerReply(
  userId: string,
  broker: {
    name: string;
    loadId: string;
    message: string;
  }
) {
  return sendPushNotification({
    userId,
    type: 'BROKER_REPLY',
    title: `📞 ${broker.name} Replied`,
    body: broker.message.slice(0, 100),
    data: {
      loadId: broker.loadId,
      brokerName: broker.name,
      screen: 'Chat',
    },
  });
}

/** Alert driver of billing issue or failed payment */
export async function notifyBillingIssue(
  userId: string,
  issue: { reason: string; actionUrl: string }
) {
  return sendPushNotification({
    userId,
    type: 'BILLING_ISSUE',
    title: '💳 Payment Issue — Action Required',
    body: `${issue.reason}. Tap to update your payment method.`,
    data: {
      screen: 'Billing',
      actionUrl: issue.actionUrl,
    },
  });
}

/** Alert driver that subscription is expiring soon */
export async function notifySubscriptionExpiring(
  userId: string,
  daysLeft: number
) {
  return sendPushNotification({
    userId,
    type: 'SUBSCRIPTION_EXPIRING',
    title: '⏰ Subscription Expiring Soon',
    body: `Your Pure Dispatch subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew to keep Pure on the road.`,
    data: {
      daysLeft: daysLeft.toString(),
      screen: 'Billing',
    },
  });
}

/** Alert driver of load verification result */
export async function notifyVerificationResult(
  userId: string,
  result: {
    loadId: string;
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
    brokerName: string;
    reason?: string;
  }
) {
  const statusMap = {
    APPROVED: { emoji: '✅', label: 'Approved' },
    REJECTED: { emoji: '❌', label: 'Rejected' },
    NEEDS_REVIEW: { emoji: '⚠️', label: 'Needs Review' },
  };
  const { emoji, label } = statusMap[result.status];

  return sendPushNotification({
    userId,
    type: 'LOAD_VERIFICATION_RESULT',
    title: `${emoji} Load ${label} — ${result.brokerName}`,
    body: result.reason || `Your load with ${result.brokerName} has been ${label.toLowerCase()}.`,
    data: {
      loadId: result.loadId,
      status: result.status,
      screen: 'LoadDetail',
    },
  });
}

// ============================================================
// TOKEN REGISTRATION
// (Called from the frontend when driver logs in or app opens)
// ============================================================

export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'android' | 'ios' | 'web'
): Promise<void> {
  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' } // One token per user, always update to latest
  );
  console.log(`[Push] Registered ${platform} token for user ${userId}`);
}

export async function removePushToken(userId: string): Promise<void> {
  await supabase.from('push_tokens').delete().eq('user_id', userId);
  console.log(`[Push] Removed token for user ${userId}`);
}

// ============================================================
// HELPERS
// ============================================================

function getChannelId(type: NotificationType): string {
  // Android notification channels (set up in the mobile app)
  const channels: Record<NotificationType, string> = {
    NEW_LOAD: 'loads',
    WEATHER_ALERT: 'alerts',
    BROKER_REPLY: 'messages',
    BILLING_ISSUE: 'billing',
    SUBSCRIPTION_EXPIRING: 'billing',
    LOAD_VERIFICATION_RESULT: 'loads',
    ETA_REMINDER: 'alerts',
    SYSTEM_ALERT: 'system',
  };
  return channels[type] || 'default';
}
