'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, getSessionProfile } from '@/lib/supabase/server';

const anthropic = new Anthropic();

const DEFAULT_COLORS = [
  { name: 'Primary', hex: '#0b8b9e' },
  { name: 'Accent', hex: '#2cc6d3' },
  { name: 'Ink', hex: '#0c1b21' },
];

function paths(projectId) {
  revalidatePath(`/dashboard/client/${projectId}/brand`);
  revalidatePath(`/dashboard/studio/${projectId}/brand`);
}

export async function createBrandKit(projectId) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('project_brand_kits').insert({
    project_id: projectId,
    created_by: user.id,
    colors: DEFAULT_COLORS,
  });
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function updateBrandKit(brandKitId, projectId, payload) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('project_brand_kits')
    .update({
      colors: payload.colors,
      heading_font: payload.headingFont,
      body_font: payload.bodyFont,
      tagline: payload.tagline,
      voice_tone: payload.voiceTone,
    })
    .eq('id', brandKitId);

  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function generateBrandVoiceDraft(projectId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('title, description')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) return { error: 'Project not found.' };

  const systemPrompt = `You are a senior brand strategist at BuildIsago. Given a client's project brief, respond with ONLY a JSON object (no markdown fencing, no prose before or after) matching exactly this shape:
{"taglines": ["...", "...", "..."], "voice_tone": "..."}
"taglines" must be an array of exactly 3 short, distinct tagline options.
"voice_tone" must be 2-3 sentences: name 3-4 personality adjectives for the brand, then one sentence on how that translates into tone of voice.`;

  let raw;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 600,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Project title: ${project.title}\n\nClient brief:\n${project.description}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { error: "This brief couldn't be processed. Please rephrase it and try again." };
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    raw = textBlock?.text;
  } catch (err) {
    console.error('Brand voice generation failed for project', projectId, err);
    return { error: 'Something went wrong generating a draft. Please try again.' };
  }

  if (!raw) return { error: 'The AI did not return a usable draft. Please try again.' };

  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return { error: 'The AI response could not be read. Please try again.' };
  }

  if (!Array.isArray(parsed.taglines) || typeof parsed.voice_tone !== 'string') {
    return { error: 'The AI response was incomplete. Please try again.' };
  }

  return { error: null, taglines: parsed.taglines, voiceTone: parsed.voice_tone };
}
