import path from 'path';
import { supabase } from './supabase.js';

const BUCKET = 'school-assets';

export const supabaseService = {
  uploadFile: async (file, bucket = BUCKET, folder = 'students') => {
    if (!file || !file.buffer) return null;

    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  },

  deleteFile: async (fileUrl) => {
    try {
      if (!fileUrl || typeof fileUrl !== 'string') return;

      // Extract path from public URL
      const url = new URL(fileUrl);
      const parts = url.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
      if (parts.length < 2) return;

      const filePath = parts[1];
      await supabase.storage.from(BUCKET).remove([filePath]);
    } catch (error) {
      console.error(`Failed to delete file: ${fileUrl}`, error);
    }
  }
};
