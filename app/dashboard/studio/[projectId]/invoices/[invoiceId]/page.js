import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import InvoiceEditor from '@/components/InvoiceEditor';

export default async function StudioInvoiceDetail({ params }) {
  const { projectId, invoiceId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: invoice } = await supabase
    .from('project_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('project_id', projectId)
    .single();

  if (!invoice) notFound();

  return (
    <>
      <Link href={`/dashboard/studio/${projectId}/invoices`} className="back-link">
        &larr; Back to invoices
      </Link>

      <div className="page-head">
        <div>
          <h1>Invoice {invoice.invoice_number}</h1>
        </div>
      </div>

      <InvoiceEditor invoice={invoice} projectId={projectId} />
    </>
  );
}
