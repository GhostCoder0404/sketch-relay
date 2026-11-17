import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bsinavmkwyrnywnffjsn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_c1GxioF6HNw6rPgrZBaxfQ_A3JIau8A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generate a random 6-character cute pair code like LOVE-4829
 */
export function generatePairCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LOVE-${random}`;
}

/**
 * Check if an email is already associated with an existing couple
 */
export async function findCoupleByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .or(`partner1_email.ilike.${cleanEmail},partner2_email.ilike.${cleanEmail}`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error finding couple by email:', error);
    return null;
  }
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Create a new couple space (Partner 1)
 */
export async function createCouple(partner1Name, partner1Email) {
  const pairCode = generatePairCode();
  const cleanEmail = partner1Email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('couples')
    .insert([
      {
        pair_code: pairCode,
        partner1_name: partner1Name.trim(),
        partner1_email: cleanEmail,
        is_linked: false
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating couple:', error);
    throw error;
  }
  return data;
}

/**
 * Join an existing couple space (Partner 2)
 */
export async function joinCouple(pairCode, partner2Name, partner2Email) {
  const cleanCode = pairCode.trim().toUpperCase();
  const cleanEmail = partner2Email.trim().toLowerCase();

  // Find the couple with this code
  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select('*')
    .eq('pair_code', cleanCode)
    .single();

  if (findError || !couple) {
    throw new Error('Couple code not found. Please double check the code.');
  }

  if (couple.is_linked && couple.partner2_email && couple.partner2_email !== cleanEmail) {
    throw new Error('This couple space is already linked to another partner.');
  }

  // Update with partner 2 details
  const { data: updatedCouple, error: updateError } = await supabase
    .from('couples')
    .update({
      partner2_name: partner2Name.trim(),
      partner2_email: cleanEmail,
      is_linked: true
    })
    .eq('id', couple.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error joining couple:', updateError);
    throw updateError;
  }

  return updatedCouple;
}

/**
 * Get couple by ID
 */
export async function getCoupleById(coupleId) {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', coupleId)
    .single();

  if (error) {
    console.error('Error fetching couple:', error);
    return null;
  }
  return data;
}

/**
 * Save a completed drawing into Supabase Storage & Database
 */
export async function saveDrawingToCloud(coupleId, prompt, dataUrl) {
  try {
    if (!coupleId || !dataUrl) return null;

    // 0. Double-save protection: Check if a drawing with this prompt was already saved in the last 30s
    const thirtySecAgo = new Date(Date.now() - 30000).toISOString();
    const { data: recentDuplicates } = await supabase
      .from('drawings')
      .select('id, image_url')
      .eq('couple_id', coupleId)
      .eq('prompt', prompt || 'Couple Sketch')
      .gte('created_at', thirtySecAgo)
      .limit(1);

    if (recentDuplicates && recentDuplicates.length > 0) {
      return recentDuplicates[0];
    }

    // Convert dataUrl to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${coupleId}/${Date.now()}_sketch.png`;

    // 1. Upload to Supabase Storage 'drawings' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('drawings')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('drawings')
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl || '';

    // 3. Insert record into 'drawings' table
    const { data: drawingRecord, error: dbError } = await supabase
      .from('drawings')
      .insert([
        {
          couple_id: coupleId,
          prompt: prompt || 'Couple Sketch',
          image_url: publicUrl
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert drawing error:', dbError);
      return null;
    }

    return drawingRecord;
  } catch (err) {
    console.error('saveDrawingToCloud error:', err);
    return null;
  }
}

/**
 * Fetch all past drawings for a couple, newest first
 */
export async function getCoupleDrawings(coupleId) {
  if (!coupleId) return [];

  const { data, error } = await supabase
    .from('drawings')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching drawings:', error);
    return [];
  }
  return data || [];
}
