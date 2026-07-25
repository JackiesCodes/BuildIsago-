import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { getOrigin } from '@/lib/utils/origin';
import BrandKitEditor from '@/components/BrandKitEditor';
import CreateBrandKitButton from '@/components/CreateBrandKitButton';

export default async function ClientBrandStudioPage({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const { data: brandKit } = await supabase
    .from('project_brand_kits')
    .select('id, project_id, colors, heading_font, body_font, tagline, voice_tone, share_token, updated_at')
    .eq('project_id', projectId)
    .maybeSingle();

  return (
    <>
      <Link href={`/dashboard/client/${projectId}`} className="back-link">
        &larr; Back to {project.title}
      </Link>

      <div className="page-head">
        <div>
          <h1>Brand Studio</h1>
          <p>Colors, typography, and voice — one kit, one shareable page.</p>
        </div>
      </div>

      {brandKit ? (
        <BrandKitEditor
          brandKit={brandKit}
          shareUrl={`${await getOrigin()}/brand/${brandKit.share_token}`}
        />
      ) : (
        <div className="card" style={{ maxWidth: 480 }}>
          <CreateBrandKitButton projectId={projectId} />
        </div>
      )}
    </>
  );
}
