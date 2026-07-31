'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';

function paths() {
  revalidatePath('/dashboard/studio/talent');
}

export async function createTalent() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('talent')
    .insert({ created_by: user.id, full_name: 'New Talent' })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths();
  redirect(`/dashboard/studio/talent/${data.id}`);
}

export async function updateTalent(talentId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase
    .from('talent')
    .update({
      full_name: payload.fullName?.trim() || 'New Talent',
      discipline: payload.discipline,
      specialties: payload.specialties,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      rate: payload.rate === '' || payload.rate === null || payload.rate === undefined ? null : Number(payload.rate),
      rate_currency: payload.rateCurrency,
      rate_unit: payload.rateUnit,
      portfolio_url: payload.portfolioUrl?.trim() || null,
      notes: payload.notes || null,
    })
    .eq('id', talentId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function setTalentStatus(talentId, status) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('talent').update({ status }).eq('id', talentId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function deleteTalent(talentId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('talent').delete().eq('id', talentId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}
