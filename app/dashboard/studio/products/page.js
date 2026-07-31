import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ProductAdminList from '@/components/ProductAdminList';
import NewProductButton from '@/components/NewProductButton';

export default async function StudioProductsPage() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: products } = await supabase
    .from('products')
    .select('id, title, status, price, currency, created_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Digital Products</h1>
          <p>The storefront catalog — UI kits, templates, and design systems you sell directly.</p>
        </div>
        <NewProductButton />
      </div>

      <ProductAdminList products={products || []} />
    </>
  );
}
