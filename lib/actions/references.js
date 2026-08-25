'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, getSessionProfile } from '@/lib/supabase/server';

const anthropic = new Anthropic();
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function paths(projectId) {
  revalidatePath(`/dashboard/client/${projectId}/references`);
  revalidatePath(`/dashboard/studio/${projectId}/references`);
}

function isSafeUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
  if (/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^169\.254\./.test(host)) return false;
  return true;
}

export async function createReference(projectId, storagePath, title, sourceUrl) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_references')
    .insert({
      project_id: projectId,
      created_by: user.id,
      title: title?.trim() || 'Reference',
      storage_path: storagePath,
      source_url: sourceUrl || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  paths(projectId);
  return { error: null, referenceId: data.id };
}

export async function importReferenceFromUrl(projectId, sourceUrl) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  if (!isSafeUrl(sourceUrl)) {
    return { error: 'That doesn\'t look like a valid, public image URL.' };
  }

  let response;
  try {
    response = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BuildIsagoBot/1.0; +https://buildisago.com)' },
    });
  } catch {
    return { error: 'Could not reach that URL.' };
  }

  if (!response.ok) return { error: `That URL returned an error (${response.status}).` };

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    return { error: 'That URL does not point directly to an image file.' };
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    return { error: 'That image is too large (max 10MB).' };
  }

  const extension = contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') || 'jpg';
  const storagePath = `${projectId}/references/${Date.now()}.${extension}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, buffer, { contentType });

  if (uploadError) return { error: uploadError.message };

  const { data, error: insertError } = await supabase
    .from('project_references')
    .insert({
      project_id: projectId,
      created_by: user.id,
      title: 'Reference',
      storage_path: storagePath,
      source_url: sourceUrl,
    })
    .select('id')
    .single();

  if (insertError) return { error: insertError.message };

  paths(projectId);
  return { error: null, referenceId: data.id };
}

export async function saveExtractedColors(referenceId, projectId, colors) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('project_references').update({ colors }).eq('id', referenceId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function detectReferenceText(referenceId, projectId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: reference, error: fetchError } = await supabase
    .from('project_references')
    .select('storage_path')
    .eq('id', referenceId)
    .single();

  if (fetchError || !reference) return { error: 'Reference not found.' };

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('project-files')
    .download(reference.storage_path);

  if (downloadError || !fileBlob) return { error: 'Could not load the reference image.' };

  const arrayBuffer = await fileBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mediaType = fileBlob.type || 'image/jpeg';

  let raw;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 500,
      system:
        'You read text out of images for a design studio. Respond with ONLY a JSON array of strings — every distinct piece of text visible in the image (headlines, labels, captions), in natural reading order. If there is no legible text, respond with an empty array: []. No markdown, no prose.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'List the text in this image.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { error: "This image couldn't be processed." };
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    raw = textBlock?.text;
  } catch (err) {
    console.error('Reference text detection failed for', referenceId, err);
    return { error: 'Something went wrong reading this image. Please try again.' };
  }

  if (!raw) return { error: 'No text could be read from this image.' };

  let detected;
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    detected = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return { error: 'Could not read the AI response.' };
  }

  if (!Array.isArray(detected)) return { error: 'Unexpected AI response.' };

  const { error: updateError } = await supabase
    .from('project_references')
    .update({ detected_text: detected })
    .eq('id', referenceId);

  if (updateError) return { error: updateError.message };

  paths(projectId);
  return { error: null, detectedText: detected };
}

export async function addColorToBrandKit(projectId, hex, name) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('project_brand_kits')
    .select('id, colors')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    const nextColors = [...(existing.colors || []), { name: name || 'From reference', hex }];
    const { error } = await supabase
      .from('project_brand_kits')
      .update({ colors: nextColors })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('project_brand_kits').insert({
      project_id: projectId,
      created_by: user.id,
      colors: [{ name: name || 'From reference', hex }],
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/client/${projectId}/brand`);
  revalidatePath(`/dashboard/studio/${projectId}/brand`);
  return { error: null };
}

export async function deleteReference(referenceId, projectId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: reference } = await supabase
    .from('project_references')
    .select('storage_path')
    .eq('id', referenceId)
    .single();

  const { error } = await supabase.from('project_references').delete().eq('id', referenceId);
  if (error) return { error: error.message };

  if (reference?.storage_path) {
    await supabase.storage.from('project-files').remove([reference.storage_path]);
  }

  paths(projectId);
  return { error: null };
}
