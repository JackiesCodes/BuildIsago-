import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import StatusSelect from '@/components/StatusSelect';
import ProjectTabs from '@/components/ProjectTabs';
import { serviceLabel } from '@/lib/constants/services';

export default async function StudioProjectLayout({ children, params }) {
  const { projectId } = await params;
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, service_type, status, profiles(full_name, company)')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const basePath = `/dashboard/studio/${projectId}`;

  return (
    <>
      <Link href="/dashboard/studio" className="back-link">&larr; Back to all projects</Link>

      <div className="page-head">
        <div>
          <h1>{project.title}</h1>
          <p>
            {project.profiles?.full_name}
            {project.profiles?.company ? ` · ${project.profiles.company}` : ''}
            {' · '}
            <span className="service-tag">{serviceLabel(project.service_type)}</span>
          </p>
        </div>
        <StatusSelect projectId={project.id} status={project.status} />
      </div>

      <ProjectTabs basePath={basePath} />

      {children}
    </>
  );
}
