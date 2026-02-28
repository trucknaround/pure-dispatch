// ============================================================
// PURE DISPATCH — DOCUMENTS API
// api/documents.js
// ============================================================
// Handles document upload, retrieval, and deletion
// using Supabase Storage and the documents table.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { IncomingForm } from 'formidable';
import fs from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Verify token and get carrier_id
  const { data: userData, error: authError } = await supabase
    .from('users')
    .select('id, carrier_id')
    .eq('auth_token', token)
    .single();

  // Fallback: decode JWT to get user id
  let carrierId = userData?.carrier_id || userData?.id;
  if (!carrierId) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      carrierId = payload.userId || payload.sub;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // ── GET: retrieve all documents for this carrier ──────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('carrier_id', carrierId)
      .order('uploaded_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ documents: data || [] });
  }

  // ── POST: upload a document ───────────────────────────────
  if (req.method === 'POST') {
    const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 }); // 10MB limit

    return new Promise((resolve) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          res.status(400).json({ error: 'File parse error: ' + err.message });
          return resolve();
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const docType = Array.isArray(fields.docType) ? fields.docType[0] : fields.docType;

        if (!file || !docType) {
          res.status(400).json({ error: 'File and docType are required' });
          return resolve();
        }

        try {
          const fileBuffer = fs.readFileSync(file.filepath);
          const fileName = file.originalFilename || file.newFilename;
          const mimeType = file.mimetype;
          const fileSize = file.size;

          // Upload to Supabase Storage
          const storagePath = `${carrierId}/${docType}/${Date.now()}_${fileName}`;

          const { data: storageData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileBuffer, {
              contentType: mimeType,
              upsert: true,
            });

          if (storageError) {
            res.status(500).json({ error: 'Storage upload failed: ' + storageError.message });
            return resolve();
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(storagePath);

          const fileUrl = urlData?.publicUrl || storagePath;

          // Delete existing document of same type for this carrier
          await supabase
            .from('documents')
            .delete()
            .eq('carrier_id', carrierId)
            .eq('document_type', docType);

          // Insert new document record
          const { data: docData, error: dbError } = await supabase
            .from('documents')
            .insert({
              carrier_id: carrierId,
              document_type: docType,
              file_url: fileUrl,
              file_name: fileName,
              file_size: fileSize,
              mime_type: mimeType,
              uploaded_at: new Date().toISOString(),
              verified: false,
            })
            .select()
            .single();

          if (dbError) {
            res.status(500).json({ error: 'Database insert failed: ' + dbError.message });
            return resolve();
          }

          res.status(200).json({ success: true, document: docData });
          resolve();
        } catch (uploadErr) {
          res.status(500).json({ error: 'Upload failed: ' + uploadErr.message });
          resolve();
        }
      });
    });
  }

  // ── DELETE: remove a document ─────────────────────────────
  if (req.method === 'DELETE') {
    const { docType } = req.query;
    if (!docType) return res.status(400).json({ error: 'docType is required' });

    // Get the file path first
    const { data: doc } = await supabase
      .from('documents')
      .select('file_url, file_name')
      .eq('carrier_id', carrierId)
      .eq('document_type', docType)
      .single();

    if (doc) {
      // Delete from storage
      const storagePath = `${carrierId}/${docType}`;
      await supabase.storage
        .from('documents')
        .remove([`${carrierId}/${docType}/${doc.file_name}`]);
    }

    // Delete from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('carrier_id', carrierId)
      .eq('document_type', docType);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
