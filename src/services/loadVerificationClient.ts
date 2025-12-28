/**
 * Load Verification Client for Pure Dispatch
 * Calls the verification agent to validate loads
 */

import axios from 'axios';

const VERIFICATION_URL = process.env.VERIFICATION_AGENT_URL;
const API_KEY = process.env.VERIFICATION_AGENT_API_KEY;

export interface LoadToVerify {
  load_id: string;
  broker_name: string;
  broker_mc: string;
  credit_score: number;
  posted_at: string;
  pickup_city: string;
  delivery_city: string;
  rate: number;
  equipment: string;
}

export interface VerificationResult {
  verification_status: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
  reasons: string[];
  verified_at: string;
  metadata?: any;
}

/**
 * Verify a single load
 */
export async function verifyLoad(load: LoadToVerify): Promise<VerificationResult> {
  try {
    const response = await axios.post(
      `${VERIFICATION_URL}/api/verify`,
      load,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Verification agent error:', error);
    
    // If verification agent is down, flag for manual review
    return {
      verification_status: 'NEEDS_REVIEW',
      reasons: ['Verification service unavailable'],
      verified_at: new Date().toISOString(),
    };
  }
}

/**
 * Verify multiple loads at once
 */
export async function verifyLoads(loads: LoadToVerify[]): Promise<VerificationResult[]> {
  try {
    const response = await axios.post(
      `${VERIFICATION_URL}/api/verify/batch`,
      { loads },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        timeout: 10000,
      }
    );

    return response.data.results;
  } catch (error) {
    console.error('Batch verification error:', error);
    
    // Fallback: verify individually
    return Promise.all(loads.map(load => verifyLoad(load)));
  }
}
