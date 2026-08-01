import { createClient } from '@/lib/supabase/server';
import StoreHeader from '@/components/StoreHeader';
import ProductCard from '@/components/ProductCard';
import { publicPreviewUrl } from '@/lib/utils/storage';
import { logError } from '@/lib/logging';

export const metadata = {
  title: 'Digital Products — BuildIsago',
  description: 'UI kits, website templates, brand templates, and design systems from BuildIsago, ready to use.',
};

export default async function StorePage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase.rpc('list_published_products');
  if (error) await logError('store.list_published_products', error);

  const withUrls = (products || []).map((p) => ({
    ...p,
    previewUrl: publicPreviewUrl(supabase, p.preview_image_path),
  }));

  return (
    <div className="store-page">
      <StoreHeader />
      <div className="container store-container">
        <div className="page-head">
          <div>
            <h1>Digital Products</h1>
            <p>UI kits, website templates, brand templates, and design systems — built by BuildIsago, ready to use.</p>
          </div>
        </div>

        {!withUrls.length ? (
          <div className="empty-state">
            <h3>{error ? 'Something went wrong' : 'Nothing here yet'}</h3>
            <p>{error ? "We couldn't load the catalog right now — please try again shortly." : 'Check back soon — new products are on the way.'}</p>
          </div>
        ) : (
          <div className="product-grid">
            {withUrls.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
