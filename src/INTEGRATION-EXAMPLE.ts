/**
 * EXAMPLE: How to integrate verification into your load search skill
 * 
 * Add this to your Pure Dispatch src/services/skills.ts
 */

import { verifyLoad } from './loadVerificationClient';

// BEFORE (without verification):
async function searchLoads(origin: string, destination: string, equipment: string) {
  const loads = await search123Loadboard({ origin, destination, equipment });
  return loads; // Returns all loads, even bad ones
}

// AFTER (with verification):
async function searchLoads(origin: string, destination: string, equipment: string) {
  // 1. Search for loads
  const potentialLoads = await search123Loadboard({ origin, destination, equipment });
  
  console.log(`Found ${potentialLoads.length} potential loads`);

  // 2. Verify each load
  const verifiedLoads = await Promise.all(
    potentialLoads.map(async (load) => {
      const verification = await verifyLoad({
        load_id: load.id,
        broker_name: load.broker.name,
        broker_mc: load.broker.mc,
        credit_score: load.broker.creditScore,
        posted_at: load.postedAt,
        pickup_city: load.origin.city,
        delivery_city: load.destination.city,
        rate: load.rate,
        equipment: load.equipment,
      });

      return {
        ...load,
        verification,
      };
    })
  );

  // 3. Filter to only approved loads
  const approvedLoads = verifiedLoads.filter(
    load => load.verification.verification_status === 'APPROVED'
  );

  const rejectedCount = verifiedLoads.filter(
    load => load.verification.verification_status === 'REJECTED'
  ).length;

  console.log(`✅ Approved: ${approvedLoads.length}`);
  console.log(`❌ Rejected: ${rejectedCount}`);

  // 4. Return only safe loads
  return {
    loads: approvedLoads,
    totalFound: potentialLoads.length,
    rejected: rejectedCount,
  };
}

// When Pure responds to the driver, mention filtering:
function formatLoadResponse(result: any): string {
  if (result.loads.length === 0) {
    return `I searched but found no verified loads. I filtered out ${result.rejected} loads with safety concerns.`;
  }

  let response = `Found ${result.loads.length} verified loads:\n\n`;
  
  result.loads.forEach((load: any, idx: number) => {
    response += `${idx + 1}. ${load.origin.city} → ${load.destination.city}\n`;
    response += `   Rate: $${load.rate} | ${load.equipment}\n`;
    response += `   Broker: ${load.broker.name} ✅ VERIFIED\n\n`;
  });

  if (result.rejected > 0) {
    response += `\n⚠️ Note: I filtered out ${result.rejected} loads due to low broker credit scores or other red flags.`;
  }

  return response;
}
