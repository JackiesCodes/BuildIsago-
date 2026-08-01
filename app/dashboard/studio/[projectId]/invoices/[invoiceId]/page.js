import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import InvoiceEditor from '@/components/InvoiceEditor';
import Breadcrumbs from '@/components/Breadcrumbs';

export default async function StudioInvoiceDetail({ params }) {
  const { projectId, invoiceId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: project } = await supabase.from('projects').select('id, title').eq('id', projectId).maybeSingle();

  const { data: invoice } = await supabase
    .from('project_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('project_id', projectId)
    .single();

  if (!invoice) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Pipeline', href: '/dashboard/studio' },
          { label: project?.title || 'Project', href: `/dashboard/studio/${projectId}` },
          { label: 'Invoices', href: `/dashboard/studio/${projectId}/invoices` },
          { label: `Invoice ${invoice.invoice_number}` },
        ]}
      />

      <div className="page-head">
        <div>
          <h1>Invoice {invoice.invoice_number}</h1>
        </div>
      </div>

      <InvoiceEditor invoice={invoice} projectId={projectId} isOwner={Boolean(profile?.is_owner)} />
    </>
  );
}
