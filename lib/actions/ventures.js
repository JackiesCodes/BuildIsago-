'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { notifyUser, notifyStudio } from '@/lib/notifications';
import { getOrigin } from '@/lib/utils/origin';
import { withinRateLimit } from '@/lib/utils/rateLimit';
import { slugify } from '@/lib/utils/slugify';

function paths(slug, ventureId) {
  revalidatePath('/ventures');
  revalidatePath('/dashboard/studio/ventures');
  revalidatePath('/dashboard/ventures');
  if (slug) revalidatePath(`/ventures/${slug}`);
  if (ventureId) revalidatePath(`/dashboard/studio/ventures/${ventureId}`);
}


// ============================================
// Studio: managing the portfolio.
// ============================================
export async function createVenture() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ventures')
    .insert({ created_by: user.id, slug: `venture-${randomUUID().slice(0, 8)}` })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths();
  redirect(`/dashboard/studio/ventures/${data.id}`);
}

export async function updateVenture(ventureId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const slug = slugify(payload.slug || payload.name);
  if (!slug) return { error: 'Give the venture a name or a URL slug.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('ventures')
    .update({
      name: payload.name?.trim() || 'New Venture',
      slug,
      tagline: payload.tagline || null,
      description: payload.description || null,
      stage: payload.stage,
      equity_percentage: payload.equityPercentage === '' ? null : Number(payload.equityPercentage),
      investment_amount: payload.investmentAmount === '' ? null : Number(payload.investmentAmount),
      currency: payload.currency,
      website_url: payload.websiteUrl || null,
      founder_name: payload.founderName || null,
      founder_email: payload.founderEmail || null,
      notes: payload.notes || null,
    })
    .eq('id', ventureId);

  if (error) {
    if (error.code === '23505') return { error: 'That URL slug is already taken by another venture.' };
    return { error: error.message };
  }

  paths(slug, ventureId);
  return { error: null };
}

export async function recordVentureLogo(ventureId, storagePath) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('ventures').update({ logo_path: storagePath }).eq('id', ventureId);
  if (error) return { error: error.message };

  paths(null, ventureId);
  return { error: null };
}

export async function publishVenture(ventureId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: venture } = await supabase.from('ventures').select('slug').eq('id', ventureId).single();
  const { error } = await supabase.from('ventures').update({ status: 'published' }).eq('id', ventureId);
  if (error) return { error: error.message };

  paths(venture?.slug, ventureId);
  return { error: null };
}

export async function unpublishVenture(ventureId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: venture } = await supabase.from('ventures').select('slug').eq('id', ventureId).single();
  const { error } = await supabase.from('ventures').update({ status: 'draft' }).eq('id', ventureId);
  if (error) return { error: error.message };

  paths(venture?.slug, ventureId);
  return { error: null };
}

export async function archiveVenture(ventureId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: venture } = await supabase.from('ventures').select('slug').eq('id', ventureId).single();
  const { error } = await supabase.from('ventures').update({ status: 'archived' }).eq('id', ventureId);
  if (error) return { error: error.message };

  paths(venture?.slug, ventureId);
  return { error: null };
}

export async function deleteVenture(ventureId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('ventures').delete().eq('id', ventureId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

// ============================================
// Founders: pitching a startup, and studio reviewing pitches.
// ============================================
export async function submitVentureApplication(payload) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login?next=/dashboard/ventures');

  if (!payload.ventureName?.trim() || !payload.description?.trim()) {
    return { error: 'Give your venture a name and a short description.' };
  }

  const allowed = await withinRateLimit(supabase, `venture-application:${user.id}`, 5, 60);
  if (!allowed) return { error: 'Too many pitches submitted recently — please wait a while and try again.' };

  const { error } = await supabase.from('venture_applications').insert({
    applicant_id: user.id,
    venture_name: payload.ventureName.trim(),
    tagline: payload.tagline || null,
    description: payload.description.trim(),
    stage: payload.stage,
    website_url: payload.websiteUrl || null,
  });
  if (error) return { error: error.message };

  const applicantName = profile?.full_name || user.email;
  await notifyStudio({
    subject: `New venture pitch: ${payload.ventureName}`,
    text: `${applicantName} submitted a pitch for "${payload.ventureName}".\n\n${await getOrigin()}/dashboard/studio/ventures`,
  });

  paths();
  revalidatePath('/dashboard/ventures');
  return { error: null };
}

export async function updateApplicationStatus(applicationId, status) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: application, error } = await supabase
    .from('venture_applications')
    .update({ status })
    .eq('id', applicationId)
    .select('applicant_id, venture_name')
    .single();
  if (error) return { error: error.message };

  if (status === 'accepted' || status === 'declined') {
    await notifyUser(application.applicant_id, {
      subject: `Your pitch was ${status}: ${application.venture_name}`,
      text:
        status === 'accepted'
          ? `Good news — "${application.venture_name}" has been accepted. The studio will be in touch about next steps.`
          : `Thanks for pitching "${application.venture_name}". It's not a fit right now, but we appreciate you sharing it.`,
    });
  }

  revalidatePath('/dashboard/studio/ventures');
  revalidatePath('/dashboard/ventures');
  return { error: null };
}

export async function promoteApplication(applicationId) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const { data: application } = await supabase
    .from('venture_applications')
    .select('applicant_id, venture_name')
    .eq('id', applicationId)
    .single();

  const { data: ventureId, error } = await supabase.rpc('promote_venture_application', {
    p_application_id: applicationId,
  });
  if (error) return { error: error.message };

  if (application) {
    await notifyUser(application.applicant_id, {
      subject: `Your pitch was accepted: ${application.venture_name}`,
      text: `Good news — "${application.venture_name}" has been accepted and the studio is starting to track it as a venture. They'll be in touch about next steps.`,
    });
  }

  paths();
  revalidatePath('/dashboard/ventures');
  redirect(`/dashboard/studio/ventures/${ventureId}`);
}
