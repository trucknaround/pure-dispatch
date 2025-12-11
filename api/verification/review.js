// ============================================
// VERIFY OR REJECT LOAD
// ============================================
// File: api/verification/review.js
// ============================================

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET;

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
    // ============================================
    // VERIFY JWT TOKEN
    // ============================================

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // ============================================
    // CHECK PERMISSIONS
    // ============================================

    const { data: teamMember } = await supabase
      .from('verification_team')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!teamMember) {
      return res.status(403).json({ error: 'User is not authorized to verify loads' });
    }

    // ============================================
    // PARSE REQUEST
    // ============================================

    const {
      verificationId,
      action, // 'verify' or 'reject'
      
      // Verification details (for verify)
      brokerAvailabilityVerified,
      rateAccuracyVerified,
      complianceVerified,
      
      verifiedRate,
      verifiedRatePerMile,
      rateConditions,
      
      brokerResponseNotes,
      complianceNotes,
      fmcsaStatus,
      insuranceVerified,
      
      // Rejection details (for reject)
      rejectionReason,
      
      // Common
      verifierNotes
    } = req.body;

    console.log(`🔍 Review action: ${action} for verification:`, verificationId);

    // ============================================
    // VALIDATION
    // ============================================

    if (!verificationId || !action) {
      return res.status(400).json({ error: 'Missing verificationId or action' });
    }

    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "verify" or "reject"' });
    }

    if (action === 'verify') {
      if (!brokerAvailabilityVerified || !rateAccuracyVerified || !complianceVerified) {
        return res.status(400).json({ 
          error: 'All verification checks must be completed' 
        });
      }
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Check if user can reject
    if (action === 'reject' && !teamMember.can_reject_loads) {
      return res.status(403).json({ error: 'User is not authorized to reject loads' });
    }

    // ============================================
    // GET VERIFICATION RECORD
    // ============================================

    const { data: verification, error: fetchError } = await supabase
      .from('load_verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (fetchError || !verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Check if already reviewed
    if (verification.status === 'verified' || verification.status === 'rejected') {
      return res.status(400).json({ 
        error: 'Load has already been reviewed',
        currentStatus: verification.status
      });
    }

    // ============================================
    // UPDATE VERIFICATION RECORD
    // ============================================

    const updateData = {
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      status: action === 'verify' ? 'verified' : 'rejected',
      verifier_notes: verifierNotes || null
    };

    if (action === 'verify') {
      updateData.broker_availability_verified = brokerAvailabilityVerified;
      updateData.rate_accuracy_verified = rateAccuracyVerified;
      updateData.compliance_verified = complianceVerified;
      updateData.verified_rate = verifiedRate || verification.rate;
      updateData.verified_rate_per_mile = verifiedRatePerMile || verification.rate_per_mile;
      updateData.rate_conditions = rateConditions || null;
      updateData.broker_response_notes = brokerResponseNotes || null;
      updateData.compliance_notes = complianceNotes || null;
      updateData.fmcsa_status = fmcsaStatus || null;
      updateData.insurance_verified = insuranceVerified || false;
    } else {
      updateData.rejection_reason = rejectionReason;
    }

    const { error: updateError } = await supabase
      .from('load_verifications')
      .update(updateData)
      .eq('id', verificationId);

    if (updateError) {
      console.error('❌ Failed to update verification:', updateError);
      return res.status(500).json({ error: 'Failed to update verification' });
    }

    console.log(`✅ Verification ${action}ed:`, verificationId);

    // ============================================
    // CREATE AUDIT LOG
    // ============================================

    await supabase
      .from('verification_audit_log')
      .insert([{
        verification_id: verificationId,
        action: action === 'verify' ? 'verified' : 'rejected',
        performed_by: userId,
        old_status: verification.status,
        new_status: updateData.status,
        changes: updateData,
        notes: verifierNotes || (action === 'reject' ? rejectionReason : 'Load verified')
      }]);

    // ============================================
    // IF VERIFIED, CREATE LOAD RECORD
    // ============================================

    if (action === 'verify') {
      // Get carrier ID from assigned_to or use default
      const carrierId = decoded.carrierId;

      if (carrierId) {
        const { error: loadError } = await supabase
          .from('loads')
          .insert([{
            carrier_id: carrierId,
            load_id: verification.load_id,
            origin: verification.origin,
            destination: verification.destination,
            miles: verification.miles,
            rate: verifiedRate || verification.rate,
            commodity: verification.commodity,
            equipment_type: verification.equipment_type,
            status: 'available',
            broker: {
              name: verification.broker_name,
              mcNumber: verification.broker_mc_number,
              phone: verification.broker_phone,
              email: verification.broker_email
            },
            claimed_at: null
          }]);

        if (loadError) {
          console.error('⚠️ Failed to create load record:', loadError);
          // Don't fail the verification, just log the error
        } else {
          console.log('✅ Load record created:', verification.load_id);
        }
      }
    }

    // ============================================
    // IF REJECTED WITH BROKER ISSUE, UPDATE BLACKLIST
    // ============================================

    if (action === 'reject' && rejectionReason.toLowerCase().includes('scam')) {
      if (verification.broker_mc_number) {
        console.log('⚠️ Adding broker to blacklist:', verification.broker_mc_number);
        
        await supabase
          .from('broker_blacklist')
          .insert([{
            broker_name: verification.broker_name,
            broker_mc_number: verification.broker_mc_number,
            reason: rejectionReason,
            evidence: { verificationId: verificationId },
            blacklisted_by: userId,
            notes: `Auto-blacklisted from verification rejection`
          }]);
      }
    }

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return res.status(200).json({
      success: true,
      verificationId: verificationId,
      action: action,
      status: updateData.status,
      message: action === 'verify' ? 'Load verified successfully' : 'Load rejected'
    });

  } catch (error) {
    console.error('❌ Review error:', error);
    return res.status(500).json({
      error: 'Failed to process review',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
