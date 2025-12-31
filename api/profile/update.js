import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT
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
    
    // Support both old format (personalInfo/companyInfo) and new format (flat structure)
    const { 
      personalInfo, 
      companyInfo, 
      newPassword,
      // New flat format
      fullName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      companyName,
      mcNumber,
      dotNumber,
      ein,
      numberOfTrucks,
      equipmentTypes,
      mcVerified,
      dotVerified,
    } = req.body;

    console.log('📝 Updating profile for user:', userId);

    // Get existing carrier data to check verification status
    const { data: existingCarrier } = await supabase
      .from('carriers')
      .select('mc_number, dot_number, mc_verified, dot_verified')
      .eq('user_id', userId)
      .single();

    // VERIFICATION LOCK CHECK - Prevent changes to verified MC/DOT
    if (existingCarrier) {
      const newMcNumber = mcNumber || companyInfo?.mcNumber;
      const newDotNumber = dotNumber || companyInfo?.dotNumber;

      if (existingCarrier.mc_verified && newMcNumber && newMcNumber !== existingCarrier.mc_number) {
        return res.status(403).json({
          error: 'MC Number is verified and locked',
          message: 'Contact support to change your verified MC Number',
        });
      }

      if (existingCarrier.dot_verified && newDotNumber && newDotNumber !== existingCarrier.dot_number) {
        return res.status(403).json({
          error: 'DOT Number is verified and locked',
          message: 'Contact support to change your verified DOT Number',
        });
      }
    }

    // Update user table (personal info)
    const userUpdate = {};
    
    // Old format
    if (personalInfo?.email) userUpdate.email = personalInfo.email;
    // New format
    if (email) userUpdate.email = email;
    if (fullName) userUpdate.full_name = fullName;
    
    // Handle password change
    if (newPassword && newPassword.length >= 8) {
      userUpdate.password_hash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('id', userId);

      if (userError) {
        console.error('❌ User update failed:', userError);
        return res.status(500).json({ error: 'Failed to update user info' });
      }
    }

    // Update carrier table (company info)
    const carrierUpdate = {};

    // Old format support
    if (companyInfo) {
      if (companyInfo.companyName) carrierUpdate.company_name = companyInfo.companyName;
      if (companyInfo.phone) carrierUpdate.phone = companyInfo.phone;
      if (companyInfo.address) carrierUpdate.address = companyInfo.address;
      if (companyInfo.city) carrierUpdate.city = companyInfo.city;
      if (companyInfo.state) carrierUpdate.state = companyInfo.state;
      if (companyInfo.zip) carrierUpdate.zip = companyInfo.zip;
      if (companyInfo.ein) carrierUpdate.ein = companyInfo.ein;
      if (companyInfo.numberOfTrucks) carrierUpdate.number_of_trucks = companyInfo.numberOfTrucks;
      if (companyInfo.equipmentTypes) carrierUpdate.equipment_types = companyInfo.equipmentTypes;
      if (companyInfo.contactPerson) carrierUpdate.contact_person = companyInfo.contactPerson;
      if (companyInfo.mcNumber) carrierUpdate.mc_number = companyInfo.mcNumber;
      if (companyInfo.dotNumber) carrierUpdate.dot_number = companyInfo.dotNumber;
    }

    // New format support
    if (companyName) carrierUpdate.company_name = companyName;
    if (phone) carrierUpdate.phone = phone;
    if (address) carrierUpdate.address = address;
    if (city) carrierUpdate.city = city;
    if (state) carrierUpdate.state = state;
    if (zipCode) carrierUpdate.zip = zipCode;
    if (ein) carrierUpdate.ein = ein;
    if (numberOfTrucks) carrierUpdate.number_of_trucks = parseInt(numberOfTrucks);
    if (equipmentTypes) carrierUpdate.equipment_types = equipmentTypes;
    if (mcNumber) carrierUpdate.mc_number = mcNumber;
    if (dotNumber) carrierUpdate.dot_number = dotNumber;

    // NEW: Handle verification flags
    if (mcVerified !== undefined) {
      carrierUpdate.mc_verified = mcVerified;
      if (mcVerified) {
        carrierUpdate.mc_verified_at = new Date().toISOString();
      }
    }
    if (dotVerified !== undefined) {
      carrierUpdate.dot_verified = dotVerified;
      if (dotVerified) {
        carrierUpdate.dot_verified_at = new Date().toISOString();
      }
    }

    if (Object.keys(carrierUpdate).length > 0) {
      carrierUpdate.updated_at = new Date().toISOString();

      const { error: carrierError } = await supabase
        .from('carriers')
        .update(carrierUpdate)
        .eq('user_id', userId);

      if (carrierError) {
        console.error('❌ Carrier update failed:', carrierError);
        return res.status(500).json({ error: 'Failed to update company info' });
      }
    }

    // Get updated data
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    const { data: carrier } = await supabase
      .from('carriers')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('✅ Profile updated successfully');

    return res.status(200).json({
      success: true,
      user: user,
      carrier: carrier,
      profile: {
        fullName: user?.full_name,
        email: user?.email,
        phone: carrier?.phone,
        address: carrier?.address,
        city: carrier?.city,
        state: carrier?.state,
        zipCode: carrier?.zip,
        companyName: carrier?.company_name,
        mcNumber: carrier?.mc_number,
        dotNumber: carrier?.dot_number,
        ein: carrier?.ein,
        numberOfTrucks: carrier?.number_of_trucks,
        equipmentTypes: carrier?.equipment_types,
        mcVerified: carrier?.mc_verified,
        dotVerified: carrier?.dot_verified,
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
