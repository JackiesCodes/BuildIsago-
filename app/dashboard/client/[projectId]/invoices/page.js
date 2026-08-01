import { getSessionProfile } from '@/lib/supabase/server';
import InvoiceList from '@/components/InvoiceList';

export default async function ClientInvoicesPage({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: invoices } = await supabase
    .from('project_invoices')
    .select('id, invoice_number, status, currency, line_items, tax_rate, due_date, created_at')
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Invoices</h1>
          <p>View and pay invoices for this project.</p>
        </div>
      </div>

      <InvoiceList invoices={invoices || []} basePath={`/dashboard/client/${projectId}/invoices`} />
    </>
  );
}
