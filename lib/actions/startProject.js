'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { SERVICE_MAP, serviceTool } from '@/lib/constants/services';
import { logError } from '@/lib/logging';

/**
 * Self-serve path: picking a service on the dashboard opens the tool
 * rather than a brief form. The brief exists so the BuildIsago team knows
 * what to build — if nobody is being briefed, asking for one is a form
 * standing between the user and the thing they clicked.
 *
 * Deliberately does NOT notify the studio: no one is being asked to do
 * work here.
 */
export async function startSelfServeProject(serviceType, title) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const service = SERVICE_MAP[serviceType];
  if (!service) return { error: 'Unknown service.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id: user.id,
      // Named from what the person typed when they used the composer;
      // the bare cards still fall back to a placeholder.
      title: (title || '').trim().slice(0, 120) || `Untitled ${service.shortLabel.toLowerCase()}`,
      service_type: serviceType,
      // No brief — nothing is being handed to the studio. The field is
      // nullable, and the user can add one later if they switch modes.
      description: null,
    })
    .select('id')
    .single();

  if (error) {
    await logError('startProject.startSelfServeProject', error, { serviceType });
    return { error: error.message };
  }

  revalidatePath('/dashboard/client');

  redirect(`/dashboard/client/${data.id}/${serviceTool(serviceType)}`);
}
