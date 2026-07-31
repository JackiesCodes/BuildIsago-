import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import InvoiceView from '@/components/InvoiceView';

export default async function ClientInvoiceDetail({ params, searchParams }) {
  const { projectId, invoiceId } = await params;
  const { paid } = await searchParams;
  const { supabase } = await getSessionProfile();

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
      <Link href={`/dashboard/client/${projectId}/invoices`} className="back-link">
        &larr; Back to invoices
      </Link>

      <div className="page-head">
        <div>
          <h1>Invoice {invoice.invoice_number}</h1>
        </div>
      </div>

      <InvoiceView invoice={invoice} projectId={projectId} justPaid={paid === '1'} />
    </>
  );
}
