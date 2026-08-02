'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { SERVICE_MAP } from '@/lib/constants/services';
import { logError } from '@/lib/logging';

// Where each service actually gets worked. Anything without a dedicated
// studio lands on the project overview, which is where Designs live.
const STUDIO_FOR_SERVICE = {
  branding: 'brand',
  software: 'dev',
  design: '',
  multiple: '',
};

/**
 * Self-serve path: picking a service on the dashboard opens the tool
 * rather than a brief form. The brief exists so the BuildIsago team knows
 * what to build — if nobody is being briefed, asking for one is a form
 * standing between the user and the thing they clicked.
 *
 * Deliberately does NOT notify the studio: no one is being asked to do
 * work here.
 */
export async function startSelfServeProject(serviceType) {
  const { user } = await getSessionProfile();
  if (!user) redirect('/login');

  const service = SERVICE_MAP[serviceType];
  if (!service) return { error: 'Unknown service.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id: user.id,
      title: `Untitled ${service.shortLabel.toLowerCase()}`,
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

  const tab = STUDIO_FOR_SERVICE[serviceType] ?? '';
  redirect(`/dashboard/client/${data.id}${tab ? `/${tab}` : ''}`);
}
