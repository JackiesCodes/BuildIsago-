import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { hiddenProjectTabs } from '@/lib/engagement';
import InvoiceList from '@/components/InvoiceList';

export default async function ClientInvoicesPage({ params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();

  // Hiding the tab is presentation; this is the actual gate. Uses the
  // same rule, so a self-serve client who does have records here is
  // still let through.
  const hide = await hiddenProjectTabs(supabase, { projectId, profile });
  if (hide.includes('invoices')) redirect(`/dashboard/client/${projectId}`);

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
