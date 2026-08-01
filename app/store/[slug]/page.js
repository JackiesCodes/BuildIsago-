import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import StoreHeader from '@/components/StoreHeader';
import BuyProductButton from '@/components/BuyProductButton';
import DownloadProductButton from '@/components/DownloadProductButton';
import { publicPreviewUrl } from '@/lib/utils/storage';
import { productCategoryLabel } from '@/lib/constants/productCategories';
import { formatMoney } from '@/lib/utils/money';
import { logError } from '@/lib/logging';

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const { user, supabase } = await getSessionProfile();

  const { data: product, error } = await supabase.rpc('get_published_product', { p_slug: slug }).maybeSingle();
  if (error) await logError('store.get_published_product', error, { slug });
  if (!product) {
    if (error) {
      return (
        <div className="store-page">
          <StoreHeader />
          <div className="container store-container">
            <div className="empty-state">
              <h3>Something went wrong</h3>
              <p>We couldn&apos;t load this product right now — please try again shortly.</p>
            </div>
          </div>
        </div>
      );
    }
    notFound();
  }

  let alreadyOwned = false;
  if (user) {
    const { data: purchase } = await supabase
      .from('product_purchases')
      .select('id')
      .eq('product_id', product.id)
      .eq('buyer_id', user.id)
      .eq('status', 'paid')
      .maybeSingle();
    alreadyOwned = Boolean(purchase);
  }

  const previewUrl = publicPreviewUrl(supabase, product.preview_image_path);

  return (
    <div className="store-page">
      <StoreHeader />
      <div className="container store-container">
        <Link href="/store" className="back-link">
          &larr; Back to Digital Products
        </Link>

        <div className="store-detail-grid">
          <div className="store-detail-image">
            {previewUrl ? <img src={previewUrl} alt="" /> : <div className="product-card-placeholder" />}
          </div>
          <div>
            <span className="service-tag">{productCategoryLabel(product.category)}</span>
            <h1>{product.title}</h1>
            <p className="store-detail-price">
              {Number(product.price) === 0 ? 'Free' : formatMoney(product.price, product.currency)}
            </p>
            <p className="store-detail-desc">{product.description}</p>
            {alreadyOwned ? (
              <DownloadProductButton productId={product.id} />
            ) : (
              <BuyProductButton slug={product.slug} price={product.price} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
