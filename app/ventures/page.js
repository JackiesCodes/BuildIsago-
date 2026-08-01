import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import VenturesHeader from '@/components/VenturesHeader';
import VentureCard from '@/components/VentureCard';
import { publicVentureLogoUrl } from '@/lib/utils/storage';

export const metadata = {
  title: 'Ventures — BuildIsago',
  description: 'Startups BuildIsago is incubating or has invested in.',
};

export default async function VenturesPage() {
  const supabase = await createClient();
  const { data: ventures } = await supabase.rpc('list_published_ventures');

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
            <h3>Nothing published yet</h3>
            <p>Check back soon — the portfolio is just getting started.</p>
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
