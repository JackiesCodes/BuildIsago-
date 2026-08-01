import { getSessionProfile } from '@/lib/supabase/server';
import MessageThread from '@/components/MessageThread';
import FileUploader from '@/components/FileUploader';
import MilestoneChecklist from '@/components/MilestoneChecklist';
import AiDraftPanel from '@/components/AiDraftPanel';
import DesignsList from '@/components/DesignsList';

export default async function ClientProjectDetail({ params, searchParams }) {
  const { projectId } = await params;
  const { setup } = await searchParams;
  const { user, supabase } = await getSessionProfile();

  const { data: project } = await supabase
    .from('projects')
    .select('id, description, ai_draft, ai_draft_generated_at')
    .eq('id', projectId)
    .single();

  const { data: rawMessages } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, profiles(full_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  const messages = (rawMessages || []).map((m) => ({
    ...m,
    sender_name: m.profiles?.full_name || 'Studio',
  }));

  const { data: files } = await supabase
    .from('project_files')
    .select('id, file_name, storage_path, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const filesWithUrls = await Promise.all(
    (files || []).map(async (f) => {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(f.storage_path, 3600);
      return { ...f, url: data?.signedUrl };
    })
  );

  const { data: milestones } = await supabase
    .from('project_milestones')
    .select('id, title, completed, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  const { data: designs } = await supabase
    .from('project_designs')
    .select('id, title, width, height, updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });

  return (
    <>
      {setup === 'partial' && (
        <div className="form-error" style={{ marginBottom: 24 }}>
          Your project was created, but we couldn&apos;t set up the milestone checklist
          automatically. Send us a message below and we&apos;ll add it manually.
        </div>
      )}

      <div className="detail-grid">
        <div className="card">
          <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Conversation</h3>
          <MessageThread projectId={projectId} messages={messages} currentUserId={user.id} />
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Progress</h3>
            <MilestoneChecklist projectId={projectId} milestones={milestones || []} editable={false} />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>AI First Draft</h3>
            <AiDraftPanel projectId={projectId} draft={project?.ai_draft} generatedAt={project?.ai_draft_generated_at} />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Designs</h3>
            <DesignsList projectId={projectId} designs={designs || []} />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Brief</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 22, whiteSpace: 'pre-wrap' }}>
              {project?.description}
            </p>

            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Files</h3>
            <div className="file-list">
              {!filesWithUrls.length && (
                <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem' }}>No files yet.</p>
              )}
              {filesWithUrls.map((f) => (
                <div key={f.id} className="file-row">
                  <span>{f.file_name}</span>
                  {f.url && <a href={f.url} target="_blank" rel="noreferrer">Download</a>}
                </div>
              ))}
            </div>
            <FileUploader projectId={projectId} />
          </div>
        </div>
      </div>
    </>
  );
}
