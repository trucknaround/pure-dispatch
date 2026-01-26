/**
 * Pure Dispatch - FMCSA Carrier Verification API
 * 
 * Endpoint: /api/verify-carrier
 * 
 * Verifies MC and DOT numbers via FMCSA API
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mcNumber, dotNumber } = req.body;

    if (!mcNumber && !dotNumber) {
      return res.status(400).json({ 
        error: 'MC Number or DOT Number required' 
      });
    }

    console.log('🔍 Verifying carrier:', { mcNumber, dotNumber });

    // FMCSA API endpoint
    const fmcsaUrl = mcNumber 
      ? `https://mobile.fmcsa.dot.gov/qc/services/carriers/${mcNumber}?webKey=${process.env.FMCSA_API_KEY}`
      : `https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/${dotNumber}?webKey=${process.env.FMCSA_API_KEY}`;

    const response = await fetch(fmcsaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      // Carrier not found or invalid
      return res.status(200).json({
        verified: false,
        error: 'Carrier not found in FMCSA database',
      });
    }

    const data = await response.json();

    // Extract carrier information
    const carrierInfo = {
      verified: true,
      legalName: data.content?.carrier?.legalName || 'Unknown',
      dbaName: data.content?.carrier?.dbaName || null,
      mcNumber: data.content?.carrier?.docketNumber || mcNumber,
      dotNumber: data.content?.carrier?.usdotNumber || dotNumber,
      physicalAddress: {
        street: data.content?.carrier?.phyStreet || '',
        city: data.content?.carrier?.phyCity || '',
        state: data.content?.carrier?.phyState || '',
        zip: data.content?.carrier?.phyZipcode || '',
      },
      mailingAddress: {
        street: data.content?.carrier?.maiStreet || '',
        city: data.content?.carrier?.maiCity || '',
        state: data.content?.carrier?.maiState || '',
        zip: data.content?.carrier?.maiZipcode || '',
      },
      phone: data.content?.carrier?.telephone || '',
      email: data.content?.carrier?.emailAddress || '',
      operatingStatus: data.content?.carrier?.carrierOperation?.carrierOperationCode || 'UNKNOWN',
      totalPowerUnits: data.content?.carrier?.totalPowerUnits || 0,
      verifiedAt: new Date().toISOString(),
    };

    console.log('✅ Carrier verified:', carrierInfo.legalName);

    return res.status(200).json(carrierInfo);

  } catch (error) {
    console.error('FMCSA verification error:', error);
    
    // For development/testing - return mock verification
    if (process.env.NODE_ENV === 'development' || !process.env.FMCSA_API_KEY) {
      return res.status(200).json({
        verified: true,
        legalName: 'Mock Carrier LLC',
        dbaName: 'Mock Transport',
        mcNumber: req.body.mcNumber,
        dotNumber: req.body.dotNumber,
        physicalAddress: {
          street: '123 Main St',
          city: 'Atlanta',
          state: 'GA',
          zip: '30303',
        },
        phone: '555-0123',
        operatingStatus: 'ACTIVE',
        totalPowerUnits: 5,
        verifiedAt: new Date().toISOString(),
        _note: 'MOCK DATA - Configure FMCSA_API_KEY for real verification',
      });
    }

    return res.status(500).json({
      verified: false,
      error: 'Verification service unavailable',
      message: error.message,
    });
  }
}
