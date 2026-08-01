import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';

export default async function StudioActivityPage() {
  const { profile, supabase } = await getSessionProfile();
  if (profile?.role !== 'studio') redirect('/dashboard/client');

  const [{ data: auditEvents }, { data: errors }] = await Promise.all([
    supabase
      .from('audit_log')
      .select('id, action, target_type, target_id, detail, created_at, actor:profiles!actor_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('error_log').select('id, context, message, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Activity</h1>
          <p>An audit trail of sensitive actions, and recent errors caught by the app.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Audit log</h3>
        {!auditEvents?.length ? (
          <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>Nothing logged yet.</p>
        ) : (
          <div className="project-list">
            {auditEvents.map((e) => (
              <div key={e.id} className="project-row" style={{ cursor: 'default' }}>
                <div>
                  <div className="title">{e.action}</div>
                  <div className="meta">
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                    <span>· {e.actor?.full_name || 'System'}</span>
                    {e.target_type && <span>· {e.target_type}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Recent errors</h3>
        {!errors?.length ? (
          <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>No errors logged. That&apos;s a good sign.</p>
        ) : (
          <div className="project-list">
            {errors.map((e) => (
              <div key={e.id} className="project-row" style={{ cursor: 'default' }}>
                <div>
                  <div className="title">{e.context}</div>
                  <div className="meta">
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 6 }}>{e.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
