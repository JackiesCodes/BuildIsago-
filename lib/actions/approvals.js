'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { notifyUser, notifyStudio } from '@/lib/notifications';
import { getOrigin } from '@/lib/utils/origin';

function paths(projectId) {
  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  revalidatePath(`/dashboard/client/${projectId}/approvals`);
  revalidatePath(`/dashboard/studio/${projectId}/approvals`);
}

export async function createApproval(projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_approvals')
    .insert({ project_id: projectId, created_by: user.id })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths(projectId);
  redirect(`/dashboard/studio/${projectId}/approvals/${data.id}`);
}

export async function updateApproval(approvalId, projectId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('project_approvals')
    .select('status')
    .eq('id', approvalId)
    .single();
  if (fetchError || !existing) return { error: 'Approval request not found.' };
  if (existing.status !== 'draft') return { error: 'Only draft approval requests can be edited.' };

  const { error } = await supabase
    .from('project_approvals')
    .update({
      title: payload.title?.trim() || 'Approval request',
      description: payload.description || null,
      design_id: payload.designId || null,
    })
    .eq('id', approvalId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function sendApproval(approvalId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: approval, error: fetchError } = await supabase
    .from('project_approvals')
    .select('status, title, description')
    .eq('id', approvalId)
    .single();
  if (fetchError || !approval) return { error: 'Approval request not found.' };
  if (approval.status !== 'draft') return { error: 'This request was already sent.' };
  if (!approval.description?.trim()) {
    return { error: 'Add a description of what needs approval before sending.' };
  }

  const { error } = await supabase
    .from('project_approvals')
    .update({ status: 'pending', sent_at: new Date().toISOString() })
    .eq('id', approvalId);
  if (error) return { error: error.message };

  await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    body: `Approval request "${approval.title}" is ready for your review — check the Approvals tab.`,
  });

  const { data: project } = await supabase.from('projects').select('client_id, title').eq('id', projectId).single();
  if (project) {
    const origin = await getOrigin();
    await notifyUser(project.client_id, {
      subject: `Approval needed: ${approval.title}`,
      text: `The studio needs your sign-off on "${approval.title}" for "${project.title}".\n\nReview it: ${origin}/dashboard/client/${projectId}/approvals/${approvalId}`,
    });
  }

  paths(projectId);
  return { error: null };
}

export async function deleteApproval(approvalId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('project_approvals')
    .select('status')
    .eq('id', approvalId)
    .single();
  if (fetchError || !existing) return { error: 'Approval request not found.' };
  if (existing.status !== 'draft') return { error: 'Only a draft request can be deleted.' };

  const { error } = await supabase.from('project_approvals').delete().eq('id', approvalId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function decideApproval(approvalId, projectId, decision, feedback) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  if (decision === 'changes_requested' && !feedback?.trim()) {
    return { error: 'Let the studio know what needs to change.' };
  }

  const { data: approval, error: fetchError } = await supabase
    .from('project_approvals')
    .select('title, status')
    .eq('id', approvalId)
    .eq('project_id', projectId)
    .single();
  if (fetchError || !approval) return { error: 'Approval request not found.' };
  if (approval.status !== 'pending') return { error: 'This request was already decided.' };

  const { error } = await supabase.rpc('decide_approval', {
    p_approval_id: approvalId,
    p_decision: decision,
    p_feedback: feedback?.trim() || null,
  });
  if (error) return { error: error.message };

  const verb = decision === 'approved' ? 'Approved' : 'Requested changes on';
  await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    body: `${verb} "${approval.title}"${feedback?.trim() ? `: ${feedback.trim()}` : ''}`,
  });

  const origin = await getOrigin();
  const clientName = profile?.full_name || 'The client';
  await notifyStudio({
    subject: `${verb}: ${approval.title}`,
    text: `${clientName} ${verb.toLowerCase()} "${approval.title}"${feedback?.trim() ? `:\n\n${feedback.trim()}` : '.'}\n\nView it: ${origin}/dashboard/studio/${projectId}/approvals/${approvalId}`,
  });

  paths(projectId);
  return { error: null };
}
