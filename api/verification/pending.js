// ============================================
// GET PENDING VERIFICATIONS
// ============================================
// File: api/verification/pending.js
// ============================================

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    console.log('🔍 Fetching pending verifications for user:', userId);

    // ============================================
    // CHECK IF USER IS IN VERIFICATION TEAM
    // ============================================

    // Get user email from headers
const userEmail = req.headers['user-email'];
if (!userEmail) {
  return res.status(401).json({ error: 'Missing user email' });
}

const { data: teamMember } = await supabase
  .from('verification_team')
  .select('*')
  .eq('user_email', userEmail)
  .eq('can_verify_loads', true)
  .single();

    if (!teamMember) {
      return res.status(403).json({ error: 'User is not authorized to verify loads' });
    }

    // ============================================
    // GET QUERY PARAMETERS
    // ============================================

    const {
      status = 'pending,in_review',
      priority,
      assignedToMe,
      limit = 50,
      offset = 0
    } = req.query;

    // ============================================
    // BUILD QUERY
    // ============================================

    let query = supabase
      .from('load_verifications')
      .select('*', { count: 'exact' });

    // Filter by status
    const statuses = status.split(',');
    query = query.in('status', statuses);

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Filter by assigned to me
    if (assignedToMe === 'true') {
      query = query.eq('assigned_to', userId);
    } else if (assignedToMe === 'false') {
      query = query.is('assigned_to', null);
    }

    // Filter out expired loads
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    // Order by priority and creation time
    query = query.order('priority', { ascending: false });
    query = query.order('created_at', { ascending: true });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: verifications, error, count } = await query;

    if (error) {
      console.error('❌ Failed to fetch verifications:', error);
      return res.status(500).json({ error: 'Failed to fetch verifications' });
    }

    console.log(`✅ Found ${verifications.length} verifications`);

    // ============================================
    // GET STATISTICS
    // ============================================

    const { data: stats } = await supabase
      .from('load_verifications')
      .select('status, priority')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const statistics = {
      total: stats?.length || 0,
      pending: stats?.filter(v => v.status === 'pending').length || 0,
      inReview: stats?.filter(v => v.status === 'in_review').length || 0,
      verified: stats?.filter(v => v.status === 'verified').length || 0,
      rejected: stats?.filter(v => v.status === 'rejected').length || 0,
      urgent: stats?.filter(v => v.priority === 'urgent').length || 0,
      high: stats?.filter(v => v.priority === 'high').length || 0
    };

    // ============================================
    // GET TEAM STATS
    // ============================================

    const { data: teamStats } = await supabase
  .from('verification_team')
  .select('current_workload, max_workload, total_verifications')
  .eq('user_email', userEmail)
  .single();

    // ============================================
    // RETURN RESULTS
    // ============================================

    return res.status(200).json({
      success: true,
      verifications: verifications,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: count > (parseInt(offset) + verifications.length)
      },
      statistics: statistics,
      myStats: {
        currentWorkload: teamStats?.current_workload || 0,
        maxWorkload: teamStats?.max_workload || 10,
        totalVerifications: teamStats?.total_verifications || 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching verifications:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
