import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';

export default async function DashboardIndex() {
  const { profile } = await getSessionProfile();
  redirect(profile?.role === 'studio' ? '/dashboard/studio' : '/dashboard/client');
}
