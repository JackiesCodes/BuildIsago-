import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import TalentEditor from '@/components/TalentEditor';

export default async function StudioTalentDetail({ params }) {
  const { talentId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: talent } = await supabase.from('talent').select('*').eq('id', talentId).single();
  if (!talent) notFound();

  const { data: requests } = await supabase
    .from('talent_requests')
    .select('id, message, status, created_at')
    .eq('talent_id', talentId)
    .order('created_at', { ascending: false });

  return (
    <>
      <Link href="/dashboard/studio/talent" className="back-link">
        &larr; Back to talent
      </Link>

      <div className="page-head">
        <div>
          <h1>Talent Profile</h1>
        </div>
      </div>

      <TalentEditor talent={talent} requests={requests || []} />
    </>
  );
}
