/** 
 * Pure Dispatch - Load Search API with Verification 
 * 
 * Endpoint: /api/searchLoads
 * 
 * This searches for loads and automatically verifies them before returning.
 * Currently uses mock data, will integrate 123Loadboard later.
 */

import axios from 'axios';

// Environment variables (configured in Vercel)
const VERIFICATION_URL = process.env.VERIFICATION_AGENT_URL;
const VERIFICATION_API_KEY = process.env.VERIFICATION_AGENT_API_KEY;

/**
 * Verify a single load
 */
async function verifyLoad(load) {
  try {
    const response = await axios.post(
      `${VERIFICATION_URL}/api/verify`,
      {
        load_id: load.id,
        broker_name: load.broker.name,
        broker_mc: load.broker.mc,
        credit_score: load.broker.creditScore || 50, // Default to 50 if not provided
        posted_at: load.postedAt,
        pickup_city: load.origin.city,
        delivery_city: load.destination.city,
        rate: load.rate,
        equipment: load.equipment,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': VERIFICATION_API_KEY,
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Verification error for load', load.id, error.message);
    
    // If verification fails, flag for manual review
    return {
      verification_status: 'NEEDS_REVIEW',
      reasons: ['Verification service unavailable'],
      verified_at: new Date().toISOString(),
    };
  }
}

/**
 * Mock load data (replace with 123Loadboard API call later)
 */
function getMockLoads(origin, destination, equipment) {
  return [
    {
      id: 'LOAD-001',
      origin: { city: origin, state: 'IL' },
      destination: { city: destination, state: 'GA' },
      equipment: equipment || 'Dry Van',
      rate: 2400,
      miles: 715,
      postedAt: new Date().toISOString(),
      broker: {
        name: 'TQL',
        mc: '123456', // Invalid MC for testing
        creditScore: 92,
      },
    },
    {
      id: 'LOAD-002',
      origin: { city: origin, state: 'IL' },
      destination: { city: destination, state: 'GA' },
      equipment: equipment || 'Dry Van',
      rate: 2200,
      miles: 715,
      postedAt: new Date().toISOString(),
      broker: {
        name: 'CH Robinson',
        mc: '002851', // Valid MC
        creditScore: 95,
      },
    },
    {
      id: 'LOAD-003',
      origin: { city: origin, state: 'IL' },
      destination: { city: destination, state: 'GA' },
      equipment: equipment || 'Dry Van',
      rate: 2600,
      miles: 715,
      postedAt: new Date().toISOString(),
      broker: {
        name: 'Sketchy Freight Co',
        mc: '999999', // Invalid MC
        creditScore: 45, // Low credit score - should be rejected
      },
    },
  ];
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { origin, destination, equipment } = req.body;

    // Validate input
    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Origin and destination are required' 
      });
    }

    console.log(`🔍 Searching loads: ${origin} → ${destination}`);

    // Step 1: Get loads (currently mock, will be 123Loadboard API)
    const allLoads = getMockLoads(origin, destination, equipment);
    console.log(`📦 Found ${allLoads.length} potential loads`);

    // Step 2: Verify each load
    const verifiedLoads = await Promise.all(
      allLoads.map(async (load) => {
        const verification = await verifyLoad(load);
        return {
          ...load,
          verification,
        };
      })
    );

    // Step 3: Filter to only approved loads
    const approvedLoads = verifiedLoads.filter(
      load => load.verification.verification_status === 'APPROVED'
    );

    const rejectedLoads = verifiedLoads.filter(
      load => load.verification.verification_status === 'REJECTED'
    );

    const needsReviewLoads = verifiedLoads.filter(
      load => load.verification.verification_status === 'NEEDS_REVIEW'
    );

    console.log(`✅ Approved: ${approvedLoads.length}`);
    console.log(`❌ Rejected: ${rejectedLoads.length}`);
    console.log(`⚠️ Needs Review: ${needsReviewLoads.length}`);

    // Step 4: Return results
    return res.status(200).json({
      success: true,
      loads: approvedLoads,
      stats: {
        total: allLoads.length,
        approved: approvedLoads.length,
        rejected: rejectedLoads.length,
        needsReview: needsReviewLoads.length,
      },
      // Include rejection reasons for transparency
      rejectedReasons: rejectedLoads.map(load => ({
        id: load.id,
        broker: load.broker.name,
        reasons: load.verification.reasons,
      })),
    });

  } catch (error) {
    console.error('Load search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search loads',
      message: error.message,
    });
  }
}
