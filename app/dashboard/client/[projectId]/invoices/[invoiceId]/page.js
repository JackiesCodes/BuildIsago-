import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import InvoiceView from '@/components/InvoiceView';
import Breadcrumbs from '@/components/Breadcrumbs';

export default async function ClientInvoiceDetail({ params, searchParams }) {
  const { projectId, invoiceId } = await params;
  const { paid } = await searchParams;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).maybeSingle();

  const { data: invoice } = await supabase
    .from('project_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('project_id', projectId)
    .neq('status', 'draft')
    .single();

  if (!invoice) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/dashboard/client' },
          { label: project?.title || 'Project', href: `/dashboard/client/${projectId}` },
          { label: 'Invoices', href: `/dashboard/client/${projectId}/invoices` },
          { label: `Invoice ${invoice.invoice_number}` },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>Invoice {invoice.invoice_number}</h1>
        </div>
      </div>

      <InvoiceView invoice={invoice} projectId={projectId} justPaid={paid === '1'} />
    </>
  );
}
