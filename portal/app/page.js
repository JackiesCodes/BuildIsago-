import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';

export default async function RootPage() {
  const { user } = await getSessionProfile();
  redirect(user ? '/dashboard' : '/login');
}
