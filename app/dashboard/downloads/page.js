import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import DownloadProductButton from '@/components/DownloadProductButton';
import { formatMoney } from '@/lib/utils/money';

export default async function DownloadsPage({ searchParams }) {
  const { purchased, claimed } = await searchParams;
  const { supabase } = await getSessionProfile();

  const { data: purchases } = await supabase.rpc('get_my_purchases');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Downloads</h1>
          <p>Anything you&apos;ve bought or claimed from the BuildIsago store.</p>
        </div>
        <Link href="/store" className="btn btn-ghost" style={{ width: 'auto' }}>
          Browse the store
        </Link>
      </div>

      {(purchased || claimed) && (
        <div className="form-success" style={{ marginBottom: 24 }}>
          You&apos;re all set — your download is ready below.
        </div>
      )}

      {!purchases?.length ? (
        <div className="empty-state">
          <h3>No downloads yet</h3>
          <p>Anything you buy or claim from the store will show up here.</p>
        </div>
      ) : (
        <div className="project-list">
          {purchases.map((p) => (
            <div key={p.purchase_id} className="project-row" style={{ cursor: 'default' }}>
              <div>
                <div className="title">{p.product_title}</div>
                <div className="meta">
                  <span>{new Date(p.purchased_at).toLocaleDateString()}</span>
                  <span>· {Number(p.amount_paid) === 0 ? 'Free' : formatMoney(p.amount_paid, p.currency)}</span>
                </div>
              </div>
              <DownloadProductButton productId={p.product_id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
