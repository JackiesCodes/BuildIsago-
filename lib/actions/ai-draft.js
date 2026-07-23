'use server';

import Anthropic from '@anthropic-ai/sdk';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/supabase/server';

const anthropic = new Anthropic();

const COMMON_INSTRUCTIONS = `
Keep the entire response under 400 words. This is a fast first draft meant to
kick off the project and give the client and studio a shared starting point —
not a finished deliverable. Format with clear markdown headings and bullet
points. Do not add a preamble or closing remarks; start directly with the
first heading.`;

const SERVICE_PROMPTS = {
  software: `You are a senior software architect at BuildIsago, a creative studio. Given a client's project brief, write a first-draft technical scope with these sections: "Feature Breakdown" (bulleted user stories), "Suggested Tech Stack" (with a one-line rationale per choice), "Key Considerations" (technical risks or open questions), and "Phase Breakdown" (a rough sequence of build phases).${COMMON_INSTRUCTIONS}`,
  branding: `You are a senior brand strategist at BuildIsago, a creative studio. Given a client's project brief, write a first-draft brand direction with these sections: "Tagline Options" (3 short taglines), "Brand Voice" (3-4 personality adjectives plus one sentence describing the tone), "Color Palette" (3-5 colors, each with a hex code and a one-line rationale), and "Typography" (a heading font + body font pairing, using real Google Fonts names).${COMMON_INSTRUCTIONS}`,
  design: `You are a senior graphic designer at BuildIsago, a creative studio. Given a client's project brief, write a first-draft creative direction with these sections: "Mood & Style" (a short description of the visual direction), "Style Keywords" (5-8 keywords), "Suggested Copy" (a headline and subhead if applicable to the brief), and "Layout Notes" (composition and structure ideas).${COMMON_INSTRUCTIONS}`,
  multiple: `You are a creative director at BuildIsago, a creative studio that combines software development, branding, and graphic design. Given a client's project brief, write a concise first-draft direction covering all relevant disciplines: a short technical scope if software is involved, a brand direction (tagline + color palette) if branding is involved, and a creative direction if design is involved. Only include sections relevant to the brief.${COMMON_INSTRUCTIONS}`,
};

export async function generateAiDraft(projectId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('title, description, service_type')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) return { error: 'Project not found.' };

  const systemPrompt = SERVICE_PROMPTS[project.service_type] || SERVICE_PROMPTS.multiple;

  let draftText;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
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
    draftText = textBlock?.text;
    if (!draftText) return { error: 'The AI did not return a usable draft. Please try again.' };
  } catch (err) {
    console.error('AI draft generation failed for project', projectId, err);
    return { error: 'Something went wrong generating your draft. Please try again.' };
  }

  const { error: saveError } = await supabase.rpc('set_project_ai_draft', {
    p_project_id: projectId,
    p_draft: draftText,
  });
  if (saveError) return { error: saveError.message };

  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  return { error: null };
}
