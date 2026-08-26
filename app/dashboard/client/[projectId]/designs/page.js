import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import DesignsList from '@/components/DesignsList';

/**
 * The landing tool for Graphic Design, Product Design and Creative Media.
 *
 * The designs list used to live buried in the project overview, alongside
 * messages, files and milestones. With the overview gone it needs its own
 * route — otherwise three of the five services would open onto nothing.
 */
export default async function ClientDesignsPage({ params }) {
  const { projectId } = await params;
  const { supabase } = await getSessionProfile();

  const { data: designs } = await supabase
    .from('project_designs')
    .select('id, title, format, updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Designs</h2>
          <p>Every canvas in this project. Open one to keep working, or start another.</p>
        </div>
        {/* References are the inputs to this work — the moodboard you draw
            from — so the way in is from here rather than a nav item. */}
        <Link href={`/dashboard/client/${projectId}/references`} className="btn btn-ghost">
          References
        </Link>
      </div>

      <DesignsList projectId={projectId} designs={designs || []} />
    </>
  );
}
