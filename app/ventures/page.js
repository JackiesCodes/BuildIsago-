import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import VenturesHeader from '@/components/VenturesHeader';
import VentureCard from '@/components/VentureCard';
import { publicVentureLogoUrl } from '@/lib/utils/storage';
import { logError } from '@/lib/logging';

export const metadata = {
  title: 'Ventures — BuildIsago',
  description: 'Startups BuildIsago is incubating or has invested in.',
};

export default async function VenturesPage() {
  const supabase = await createClient();
  const { data: ventures, error } = await supabase.rpc('list_published_ventures');
  if (error) await logError('ventures.list_published_ventures', error);

  const withUrls = (ventures || []).map((v) => ({
    ...v,
    logoUrl: publicVentureLogoUrl(supabase, v.logo_path),
  }));

  return (
    <div className="store-page">
      <VenturesHeader />
      <div className="container store-container">
        <div className="page-head">
          <div>
            <h1>BuildIsago Ventures</h1>
            <p>Startup incubation and product investments — the studio&apos;s own portfolio.</p>
          </div>
          <Link href="/dashboard/ventures" className="btn btn-ghost" style={{ width: 'auto' }}>
            Pitch your startup
          </Link>
        </div>

        {!withUrls.length ? (
          <div className="empty-state">
            <h3>{error ? 'Something went wrong' : 'Nothing published yet'}</h3>
            <p>
              {error
                ? "We couldn't load the portfolio right now — please try again shortly."
                : 'Check back soon — the portfolio is just getting started.'}
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {withUrls.map((v) => (
              <VentureCard key={v.id} venture={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
