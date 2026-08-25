'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { parseRepoInput } from '@/lib/github';

const anthropic = new Anthropic();

function paths(projectId) {
  revalidatePath(`/dashboard/client/${projectId}/dev`);
  revalidatePath(`/dashboard/studio/${projectId}/dev`);
}

export async function createDevScope(projectId) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('project_dev_scopes').insert({
    project_id: projectId,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function updateDevScope(devScopeId, projectId, payload) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('project_dev_scopes')
    .update({
      features: payload.features,
      tech_stack: payload.techStack,
      phases: payload.phases,
      risks: payload.risks,
    })
    .eq('id', devScopeId);

  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function updateRepoLink(devScopeId, projectId, repoInput) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const trimmed = repoInput?.trim();
  let repoOwner = null;
  let repoName = null;

  if (trimmed) {
    const parsed = parseRepoInput(trimmed);
    if (!parsed) return { error: 'Could not read that as a repo — try "owner/repo" or a github.com URL.' };
    repoOwner = parsed.owner;
    repoName = parsed.repo;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('project_dev_scopes')
    .update({ repo_owner: repoOwner, repo_name: repoName })
    .eq('id', devScopeId);

  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function generateDevScopeDraft(projectId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('title, description')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) return { error: 'Project not found.' };

  const systemPrompt = `You are a senior software architect at BuildIsago. Given a client's project brief, respond with ONLY a JSON object (no markdown fencing, no prose before or after) matching exactly this shape:
{"features": ["...", ...], "tech_stack": [{"name": "...", "rationale": "..."}, ...], "phases": [{"title": "...", "description": "..."}, ...], "risks": ["...", ...]}
"features" is 4-8 short user-story-style bullets. "tech_stack" is 3-6 technology choices each with a one-line rationale. "phases" is 3-5 build phases in sequence with a one-sentence description each. "risks" is 2-4 technical risks or open questions.`;

  let raw;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1400,
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
    console.error('Dev scope generation failed for project', projectId, err);
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

  if (
    !Array.isArray(parsed.features) ||
    !Array.isArray(parsed.tech_stack) ||
    !Array.isArray(parsed.phases) ||
    !Array.isArray(parsed.risks)
  ) {
    return { error: 'The AI response was incomplete. Please try again.' };
  }

  return {
    error: null,
    features: parsed.features,
    techStack: parsed.tech_stack,
    phases: parsed.phases,
    risks: parsed.risks,
  };
}
