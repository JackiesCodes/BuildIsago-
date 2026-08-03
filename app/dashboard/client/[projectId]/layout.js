import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import DueDate from '@/components/DueDate';
import ProjectTabs from '@/components/ProjectTabs';
import ProjectActions from '@/components/ProjectActions';
import { serviceLabel } from '@/lib/constants/services';
import { hiddenProjectTabs } from '@/lib/engagement';

export default async function ClientProjectLayout({ children, params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, service_type, status, due_date, priority')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const basePath = `/dashboard/client/${projectId}`;
  const hide = await hiddenProjectTabs(supabase, { projectId, profile });

  return (
    <>
      <Link href="/dashboard/client" className="back-link">&larr; Back to projects</Link>

      <div className="page-head">
        <div>
          <h1>{project.title}</h1>
          <p className="service-tag">{serviceLabel(project.service_type)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <DueDate date={project.due_date} />
          <PriorityBadge priority={project.priority} />
          <StatusBadge status={project.status} />
          <ProjectActions projectId={project.id} title={project.title} />
        </div>
      </div>

      <ProjectTabs basePath={basePath} hide={hide} />

      {children}
    </>
  );
}
