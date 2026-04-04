// ============================================================
// PURE DISPATCH — SOURCE ENFORCEMENT MIDDLEWARE
// api/middleware/sourceEnforcement.js
// ============================================================
// CRITICAL: This enforces 123Loadboard contract compliance.
// Every load data request must pass through this layer.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// ── Get source rules from database ───────────────────────────
async function getSourceRules(source) {
  const { data, error } = await supabase
    .from('source_rules')
    .select('*')
    .eq('source', source)
    .single();

  if (error || !data) {
    // Default safe rules if source not found
    return {
      source,
      allow_internal_display: true,
      allow_direct_contact: false,
      require_redirect_for_booking: true,
      allow_message_generation: true,
      restricted: false,
      can_cache: false,
    };
  }

  return data;
}

// ── Main enforcement function ─────────────────────────────────
export async function enforceSourceRules(load, action, userId) {
  const rules = await getSourceRules(load.source || 'pure');

  // CRITICAL: Cross-user data violation check
  if (rules.restricted && load.source_end_user_id && load.source_end_user_id !== userId) {
    await logAudit({
      userId,
      source: load.source,
      loadId: load.id || load.load_id,
      action,
      decision: 'BLOCKED_CROSS_USER_VIOLATION',
    });
    throw new Error('Cross-user data violation — this load belongs to a different user');
  }

  // Check if restricted data has expired
  if (rules.restricted && load.restricted_data_expires_at) {
    const expiry = new Date(load.restricted_data_expires_at);
    if (expiry < new Date()) {
      await logAudit({
        userId,
        source: load.source,
        loadId: load.id || load.load_id,
        action,
        decision: 'BLOCKED_DATA_EXPIRED',
      });
      throw new Error('Restricted load data has expired — please refresh from source');
    }
  }

  // Action-specific checks
  if (action === 'book') {
    if (rules.require_redirect_for_booking) {
      await logAudit({
        userId,
        source: load.source,
        loadId: load.id || load.load_id,
        action,
        decision: 'REDIRECT_REQUIRED',
      });
      return {
        allowed: false,
        action: 'redirect',
        url: load.original_url || `https://www.123loadboard.com`,
        message: 'Booking must be completed on 123Loadboard directly.',
      };
    }
  }

  if (action === 'contact') {
    if (!rules.allow_direct_contact) {
      await logAudit({
        userId,
        source: load.source,
        loadId: load.id || load.load_id,
        action,
        decision: 'BLOCKED_DIRECT_CONTACT',
      });
      return {
        allowed: false,
        message: 'Direct contact not permitted for this load source. Please use 123Loadboard to contact the broker.',
      };
    }
  }

  if (action === 'display') {
    if (!rules.allow_internal_display) {
      await logAudit({
        userId,
        source: load.source,
        loadId: load.id || load.load_id,
        action,
        decision: 'BLOCKED_DISPLAY',
      });
      return { allowed: false, message: 'Display not permitted for this load source.' };
    }
  }

  // Log successful access
  await logAudit({
    userId,
    source: load.source || 'pure',
    loadId: load.id || load.load_id,
    action,
    decision: 'ALLOWED',
  });

  return { allowed: true, rules };
}

// ── Validate 123 load request (per-user auth check) ──────────
export async function validate123Request(userId) {
  const { data: connection, error } = await supabase
    .from('user_loadboard_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', '123loadboard')
    .eq('is_active', true)
    .single();

  if (error || !connection) {
    return {
      valid: false,
      message: 'No 123Loadboard account connected. Please connect your 123Loadboard account in Settings.',
    };
  }

  // Check if token is expired
  if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
    return {
      valid: false,
      message: '123Loadboard session expired. Please reconnect your account in Settings.',
    };
  }

  return { valid: true, connection };
}

// ── Strip restricted data before caching ─────────────────────
export function stripRestrictedData(load) {
  if (!load.is_restricted) return load;

  // Remove sensitive broker contact info from restricted loads
  const stripped = { ...load };
  delete stripped.broker_phone;
  delete stripped.broker_email;
  delete stripped.broker_contact_name;
  delete stripped.raw_payload;

  return stripped;
}

// ── Audit logger ──────────────────────────────────────────────
export async function logAudit({ userId, source, loadId, action, decision, metadata = {} }) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      source,
      load_id: loadId,
      action,
      compliance_decision: decision,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[Audit] Failed to log:', err.message);
  }
}

// ── Set restricted data expiry (123 loads expire after 1 hour) 
export function getRestrictedExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
}
