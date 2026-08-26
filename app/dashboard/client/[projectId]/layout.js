import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import ProjectTabs from '@/components/ProjectTabs';
import ProjectActions from '@/components/ProjectActions';
import { serviceLabel, serviceTool } from '@/lib/constants/services';

/**
 * A client project is now one service's tool, not a workspace with seven
 * tabs. Overview, Invoices, Approvals and Retainers are gone from here —
 * they were the managed-engagement machinery, and this portal is
 * self-service.
 *
 * Nothing was deleted: /invoices, /approvals and /retainers still exist and
 * still render, so an invoice link the studio sends a client opens and can
 * be paid. They are simply not something you navigate to.
 *
 * Two tabs at most: the tool this project is for, and the references that
 * feed it.
 */
const TOOL_LABELS = { dev: 'Dev Studio', brand: 'Brand Studio', designs: 'Designs' };

export default async function ClientProjectLayout({ children, params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, service_type')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const basePath = `/dashboard/client/${projectId}`;
  const tool = serviceTool(project.service_type);
  const tabs = [
    { slug: tool, label: TOOL_LABELS[tool] || 'Workspace' },
    { slug: 'references', label: 'References' },
  ];

  return (
    <>
      <Link href="/dashboard/client/projects" className="back-link">
        &larr; Back to your work
      </Link>

      <div className="page-head">
        <div>
          <h1>{project.title}</h1>
          <p className="service-tag">{serviceLabel(project.service_type)}</p>
        </div>
        <ProjectActions projectId={project.id} title={project.title} />
      </div>

      <ProjectTabs basePath={basePath} tabs={tabs} />

      {children}
    </>
  );
}
