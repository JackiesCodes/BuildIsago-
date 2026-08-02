import { getSessionProfile } from '@/lib/supabase/server';
import { getOrigin } from '@/lib/utils/origin';
import BrandKitEditor from '@/components/BrandKitEditor';
import { ensureBrandKit } from '@/lib/studioProvision';
import { logError } from '@/lib/logging';

export default async function ClientBrandStudioPage({ params }) {
  const { projectId } = await params;
  const { user, supabase } = await getSessionProfile();

  const { data: brandKit, error } = await ensureBrandKit(supabase, projectId, user.id);
  if (error) await logError('brand.ensureBrandKit', error, { projectId });

  return (
    <>
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
        <div className="empty-state">
          <h3>Couldn&apos;t open the Brand Studio</h3>
          <p>We couldn&apos;t set up this brand kit — please try again shortly.</p>
        </div>
      )}
    </>
  );
}
