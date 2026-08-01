'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { notifyUser, notifyStudio } from '@/lib/notifications';
import { getOrigin } from '@/lib/utils/origin';
import { withinRateLimit } from '@/lib/utils/rateLimit';

function paths() {
  revalidatePath('/marketplace');
  revalidatePath('/dashboard/marketplace');
  revalidatePath('/dashboard/studio/talent');
}

export async function joinMarketplace() {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login?next=/dashboard/marketplace');

  const supabase = await createClient();
  const { error } = await supabase.rpc('join_marketplace_as_talent');
  if (error) return { error: error.message };

  paths();
  redirect('/dashboard/marketplace');
}

export async function updateMyTalentProfile(talentId, payload) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('talent')
    .update({
      full_name: payload.fullName?.trim() || 'New Talent',
      discipline: payload.discipline,
      specialties: payload.specialties,
      bio: payload.bio || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      rate: payload.rate === '' || payload.rate === null || payload.rate === undefined ? null : Number(payload.rate),
      rate_currency: payload.rateCurrency,
      rate_unit: payload.rateUnit,
      portfolio_url: payload.portfolioUrl?.trim() || null,
    })
    .eq('id', talentId)
    .eq('profile_id', user.id);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function setMyTalentVisibility(talentId, visibility) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('talent')
    .update({ visibility })
    .eq('id', talentId)
    .eq('profile_id', user.id);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function sendTalentRequest(talentId, message) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect(`/login?next=/marketplace/${talentId}`);

  if (!message?.trim()) return { error: 'Say a bit about what you need.' };

  const allowed = await withinRateLimit(supabase, `talent-request:${user.id}`, 10, 60);
  if (!allowed) return { error: 'Too many inquiries sent recently — please wait a while and try again.' };

  const { data: talent, error: fetchError } = await supabase
    .rpc('get_public_talent', { p_id: talentId })
    .maybeSingle();
  if (fetchError || !talent) return { error: 'This profile is not available.' };

  const { error } = await supabase.from('talent_requests').insert({
    talent_id: talentId,
    requester_id: user.id,
    message: message.trim(),
  });
  if (error) return { error: error.message };

  const origin = await getOrigin();

  // The talent row may or may not have an account behind it (studio-added
  // entries have no profile_id) — only notify a real account.
  const { data: talentRow } = await supabase.from('talent').select('profile_id').eq('id', talentId).maybeSingle();
  if (talentRow?.profile_id) {
    await notifyUser(talentRow.profile_id, {
      subject: `New inquiry: ${talent.full_name}`,
      text: `Someone is interested in working with you.\n\n${message.trim()}\n\nView it: ${origin}/dashboard/marketplace`,
    });
  }

  await notifyStudio({
    subject: `New marketplace inquiry for ${talent.full_name}`,
    text: `${message.trim()}\n\nView it: ${origin}/dashboard/studio/talent/${talentId}`,
  });

  return { error: null };
}

export async function updateTalentRequestStatus(requestId, status) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('talent_requests').update({ status }).eq('id', requestId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}
