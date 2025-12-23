import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

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
    const { personalInfo, companyInfo, newPassword } = req.body;

    console.log('📝 Updating profile for user:', userId);

    // Update user table (personal info)
    if (personalInfo) {
      const userUpdate = {};
      
      if (personalInfo.email) userUpdate.email = personalInfo.email;
      
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
    }

    // Update carrier table (company info)
    if (companyInfo) {
      const { error: carrierError } = await supabase
        .from('carriers')
        .update({
          company_name: companyInfo.companyName,
          phone: companyInfo.phone,
          address: companyInfo.address,
          city: companyInfo.city,
          state: companyInfo.state,
          zip: companyInfo.zip,
          ein: companyInfo.ein,
          number_of_trucks: companyInfo.numberOfTrucks,
          equipment_types: companyInfo.equipmentTypes,
          contact_person: companyInfo.contactPerson,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (carrierError) {
        console.error('❌ Carrier update failed:', carrierError);
        return res.status(500).json({ error: 'Failed to update company info' });
      }
    }

    // Get updated data
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
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
      carrier: carrier
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
