'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { formatMoney } from '@/lib/utils/money';
import { getOrigin } from '@/lib/utils/origin';
import { notifyUser, notifyStudio } from '@/lib/notifications';

function paths(projectId) {
  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  revalidatePath(`/dashboard/client/${projectId}/retainers`);
  revalidatePath(`/dashboard/studio/${projectId}/retainers`);
}

export async function createRetainer(projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_retainers')
    .insert({ project_id: projectId, created_by: user.id })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths(projectId);
  redirect(`/dashboard/studio/${projectId}/retainers/${data.id}`);
}

export async function updateRetainer(retainerId, projectId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('project_retainers')
    .select('status')
    .eq('id', retainerId)
    .single();
  if (fetchError || !existing) return { error: 'Retainer not found.' };
  if (existing.status !== 'draft') return { error: 'Only a draft retainer can be edited.' };

  const { error } = await supabase
    .from('project_retainers')
    .update({
      title: payload.title?.trim() || 'Retainer',
      description: payload.description || null,
      amount: Number(payload.amount) || 0,
      currency: payload.currency,
      interval: payload.interval,
    })
    .eq('id', retainerId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function sendRetainer(retainerId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: retainer, error: fetchError } = await supabase
    .from('project_retainers')
    .select('status, title, amount, currency, interval')
    .eq('id', retainerId)
    .single();
  if (fetchError || !retainer) return { error: 'Retainer not found.' };
  if (retainer.status !== 'draft') return { error: 'This retainer was already sent.' };
  if (Number(retainer.amount) <= 0) return { error: 'Set a billing amount before sending.' };

  const { error } = await supabase
    .from('project_retainers')
    .update({ status: 'pending', sent_at: new Date().toISOString() })
    .eq('id', retainerId);
  if (error) return { error: error.message };

  await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    body: `"${retainer.title}" is ready — ${formatMoney(retainer.amount, retainer.currency)}/${retainer.interval}. Review and start it in the Retainers tab.`,
  });

  const { data: project } = await supabase.from('projects').select('client_id, title').eq('id', projectId).single();
  if (project) {
    const origin = await getOrigin();
    await notifyUser(project.client_id, {
      subject: `New retainer: ${retainer.title}`,
      text: `The studio set up "${retainer.title}" for "${project.title}" — ${formatMoney(retainer.amount, retainer.currency)}/${retainer.interval}.\n\nReview it: ${origin}/dashboard/client/${projectId}/retainers/${retainerId}`,
    });
  }

  paths(projectId);
  return { error: null };
}

export async function deleteRetainer(retainerId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('project_retainers')
    .select('status')
    .eq('id', retainerId)
    .single();
  if (fetchError || !existing) return { error: 'Retainer not found.' };
  if (existing.status !== 'draft') return { error: 'Only a draft retainer can be deleted.' };

  const { error } = await supabase.from('project_retainers').delete().eq('id', retainerId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function subscribeToRetainer(retainerId, projectId) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect(`/login?next=/dashboard/client/${projectId}/retainers/${retainerId}`);

  const { data: retainer, error: fetchError } = await supabase
    .from('project_retainers')
    .select('id, title, amount, currency, interval, status')
    .eq('id', retainerId)
    .eq('project_id', projectId)
    .single();
  if (fetchError || !retainer) return { error: 'Retainer not found.' };
  if (retainer.status !== 'pending') return { error: 'This retainer is not open for subscription.' };
  if (Number(retainer.amount) <= 0) return { error: 'This retainer has no billing amount set.' };

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: 'Online billing is not configured yet. Contact the studio to arrange payment.' };
  }

  const roleBase = profile?.role === 'studio' ? 'studio' : 'client';
  const origin = await getOrigin();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: retainer.currency,
            product_data: { name: retainer.title },
            unit_amount: Math.round(Number(retainer.amount) * 100),
            recurring: { interval: retainer.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/${roleBase}/${projectId}/retainers/${retainerId}?subscribed=1`,
      cancel_url: `${origin}/dashboard/${roleBase}/${projectId}/retainers/${retainerId}`,
      metadata: { type: 'retainer', retainer_id: retainer.id, project_id: projectId },
    });
  } catch (err) {
    console.error('Stripe subscription checkout failed for retainer', retainerId, err);
    return { error: 'Could not start checkout. Please try again.' };
  }

  redirect(session.url);
}

export async function cancelRetainer(retainerId, projectId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: retainer, error: fetchError } = await supabase
    .from('project_retainers')
    .select('title, status, stripe_subscription_id')
    .eq('id', retainerId)
    .eq('project_id', projectId)
    .single();
  if (fetchError || !retainer) return { error: 'Retainer not found.' };
  if (!['pending', 'active', 'past_due'].includes(retainer.status)) {
    return { error: 'This retainer cannot be canceled.' };
  }

  if (retainer.stripe_subscription_id) {
    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return { error: 'Payments are not configured — contact the studio directly to stop billing.' };
    }
    try {
      await stripe.subscriptions.cancel(retainer.stripe_subscription_id);
    } catch (err) {
      console.error('Stripe subscription cancel failed', retainerId, err);
      return { error: 'Could not cancel the subscription. Please try again.' };
    }
  }

  const { error } = await supabase.rpc('request_cancel_retainer', { p_retainer_id: retainerId });
  if (error) return { error: error.message };

  await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    body: `"${retainer.title}" has been canceled — billing stops immediately.`,
  });

  await notifyStudio({
    subject: `Retainer canceled: ${retainer.title}`,
    text: `"${retainer.title}" was canceled.`,
  });

  paths(projectId);
  return { error: null };
}
