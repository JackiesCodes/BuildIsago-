import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ProductEditor from '@/components/ProductEditor';
import { publicPreviewUrl } from '@/lib/utils/storage';

export default async function StudioProductDetail({ params }) {
  const { productId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
  if (!product) notFound();

  const previewUrl = publicPreviewUrl(supabase, product.preview_image_path);

  return (
    <>
      <Link href="/dashboard/studio/products" className="back-link">
        &larr; Back to products
      </Link>

      <div className="page-head">
        <div>
          <h1>Edit Product</h1>
        </div>
      </div>

      <ProductEditor product={product} previewUrl={previewUrl} />
    </>
  );
}
