import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import VentureAdminList from '@/components/VentureAdminList';
import VentureApplicationsList from '@/components/VentureApplicationsList';
import NewVentureButton from '@/components/NewVentureButton';

export default async function StudioVenturesPage() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: ventures } = await supabase
    .from('ventures')
    .select('id, name, stage, status, created_at')
    .order('created_at', { ascending: false });

  const { data: applications } = await supabase
    .from('venture_applications')
    .select('id, venture_name, tagline, description, stage, website_url, status, promoted_venture_id, created_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ventures</h1>
          <p>BuildIsago's portfolio of incubated and invested-in startups.</p>
        </div>
        <NewVentureButton />
      </div>

      <VentureAdminList ventures={ventures || []} />

      <div style={{ marginTop: 28 }}>
        <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 14 }}>Pitches</h4>
        <VentureApplicationsList applications={applications || []} />
      </div>
    </>
  );
}
