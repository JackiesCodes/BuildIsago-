import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import InvoiceList from '@/components/InvoiceList';
import NewInvoiceButton from '@/components/NewInvoiceButton';

export default async function StudioInvoicesPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: invoices } = await supabase
    .from('project_invoices')
    .select('id, invoice_number, status, currency, line_items, tax_rate, due_date, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Invoices</h1>
          <p>Bill for this project and get paid online via Stripe.</p>
        </div>
        <NewInvoiceButton projectId={projectId} />
      </div>

      <InvoiceList invoices={invoices || []} basePath={`/dashboard/studio/${projectId}/invoices`} />
    </>
  );
}
