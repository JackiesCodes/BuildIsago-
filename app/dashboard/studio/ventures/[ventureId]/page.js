import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import VentureEditor from '@/components/VentureEditor';
import { publicVentureLogoUrl } from '@/lib/utils/storage';

export default async function StudioVentureDetail({ params }) {
  const { ventureId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: venture } = await supabase.from('ventures').select('*').eq('id', ventureId).single();
  if (!venture) notFound();

  const logoUrl = publicVentureLogoUrl(supabase, venture.logo_path);

  return (
    <>
      <Link href="/dashboard/studio/ventures" className="back-link">
        &larr; Back to Ventures
      </Link>

      <div className="page-head">
        <div>
          <h1>Edit Venture</h1>
        </div>
      </div>

      <VentureEditor venture={venture} logoUrl={logoUrl} />
    </>
  );
}
