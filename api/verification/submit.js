// ============================================
// SUBMIT LOAD FOR VERIFICATION
// ============================================
// File: api/verification/submit.js
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      loadId,
      origin,
      destination,
      miles,
      rate,
      commodity,
      equipmentType,
      pickupDate,
      deliveryDate,
      broker,
      aiFlags,
      aiNotes,
      aiConfidenceScore,
      source,
      rawData
    } = req.body;

    console.log('🔍 Load submitted for verification:', loadId);

    // ============================================
    // VALIDATION
    // ============================================

    if (!loadId || !origin || !destination || !broker) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ============================================
    // CHECK BROKER BLACKLIST
    // ============================================

    if (broker.mcNumber) {
      const { data: blacklisted } = await supabase
        .from('broker_blacklist')
        .select('*')
        .eq('broker_mc_number', broker.mcNumber)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .single();

      if (blacklisted) {
        console.log('❌ Broker is blacklisted:', broker.mcNumber);
        
        // Auto-reject blacklisted brokers
        return res.status(200).json({
          success: true,
          status: 'auto_rejected',
          reason: 'Broker is blacklisted',
          message: 'This broker has been flagged and cannot be used'
        });
      }
    }

    // ============================================
    // CALCULATE PRIORITY
    // ============================================

    let priority = 'normal';
    const ratePerMile = miles > 0 ? rate / miles : 0;

    // High priority if excellent rate
    if (ratePerMile > 3.0) {
      priority = 'high';
    }

    // Urgent if AI confidence is very low
    if (aiConfidenceScore < 0.5) {
      priority = 'urgent';
    }

    // Urgent if multiple AI flags
    if (aiFlags && aiFlags.length >= 3) {
      priority = 'urgent';
    }

    console.log('📊 Priority determined:', priority);

    // ============================================
    // CHECK FOR DUPLICATE
    // ============================================

    const { data: existing } = await supabase
      .from('load_verifications')
      .select('id, status')
      .eq('load_id', loadId)
      .single();

    if (existing) {
      console.log('⚠️ Load already in verification:', existing.status);
      return res.status(200).json({
        success: true,
        status: 'duplicate',
        verificationId: existing.id,
        currentStatus: existing.status,
        message: 'Load is already in verification queue'
      });
    }

    // ============================================
    // CREATE VERIFICATION RECORD
    // ============================================

    const { data: verification, error: verificationError } = await supabase
      .from('load_verifications')
      .insert([
        {
          load_id: loadId,
          origin: origin,
          destination: destination,
          miles: miles || null,
          rate: rate || null,
          rate_per_mile: ratePerMile || null,
          commodity: commodity || null,
          equipment_type: equipmentType || null,
          pickup_date: pickupDate || null,
          delivery_date: deliveryDate || null,
          broker_name: broker.name,
          broker_mc_number: broker.mcNumber || null,
          broker_phone: broker.phone || null,
          broker_email: broker.email || null,
          ai_confidence_score: aiConfidenceScore || null,
          ai_flags: aiFlags || [],
          ai_notes: aiNotes || null,
          status: 'pending',
          priority: priority,
          source: source || 'unknown',
          raw_data: rawData || {},
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
      ])
      .select()
      .single();

    if (verificationError) {
      console.error('❌ Failed to create verification:', verificationError);
      return res.status(500).json({ error: 'Failed to submit for verification' });
    }

    console.log('✅ Verification created:', verification.id);

    // ============================================
    // AUTO-ASSIGN TO AVAILABLE REVIEWER
    // ============================================

    // Find available reviewer with lowest workload
    const { data: availableReviewer } = await supabase
      .from('verification_team')
      .select('user_id, current_workload, max_workload')
      .eq('is_active', true)
      .eq('can_verify_loads', true)
      .lt('current_workload', supabase.raw('max_workload'))
      .order('current_workload', { ascending: true })
      .limit(1)
      .single();

    if (availableReviewer) {
      await supabase
        .from('load_verifications')
        .update({
          assigned_to: availableReviewer.user_id,
          assigned_at: new Date().toISOString(),
          status: 'in_review'
        })
        .eq('id', verification.id);

      console.log('✅ Auto-assigned to reviewer:', availableReviewer.user_id);

      // Log assignment
      await supabase
        .from('verification_audit_log')
        .insert([{
          verification_id: verification.id,
          action: 'assigned',
          performed_by: availableReviewer.user_id,
          old_status: 'pending',
          new_status: 'in_review',
          notes: 'Auto-assigned to available reviewer'
        }]);
    }

    // ============================================
    // LOG CREATION
    // ============================================

    await supabase
      .from('verification_audit_log')
      .insert([{
        verification_id: verification.id,
        action: 'created',
        old_status: null,
        new_status: 'pending',
        notes: `Load submitted for verification with ${aiFlags?.length || 0} AI flags`
      }]);

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return res.status(201).json({
      success: true,
      verificationId: verification.id,
      status: verification.status,
      priority: verification.priority,
      message: 'Load submitted for verification',
      estimatedReviewTime: priority === 'urgent' ? '5-15 minutes' : '15-30 minutes'
    });

  } catch (error) {
    console.error('❌ Verification submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit load for verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
