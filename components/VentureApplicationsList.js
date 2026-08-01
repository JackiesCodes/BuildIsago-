'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateApplicationStatus, promoteApplication } from '@/lib/actions/ventures';
import { ventureStageLabel } from '@/lib/constants/ventureStages';

const STATUS_LABELS = { new: 'New', reviewing: 'Reviewing', accepted: 'Accepted', declined: 'Declined' };

export default function VentureApplicationsList({ applications }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleStatusChange(applicationId, status) {
    startTransition(async () => {
      await updateApplicationStatus(applicationId, status);
      router.refresh();
    });
  }

  function handlePromote(applicationId) {
    startTransition(async () => {
      await promoteApplication(applicationId);
    });
  }

  if (!applications?.length) {
    return <p style={{ color: 'var(--muted-2)', fontSize: '0.88rem' }}>No pitches yet.</p>;
  }

  return (
    <div className="scope-list">
      {applications.map((a) => (
        <div key={a.id} className="approval-decision" style={{ marginBottom: 10 }}>
          <span className="approval-decision-label">
            {a.venture_name} · {ventureStageLabel(a.stage)} · {new Date(a.created_at).toLocaleString()}
          </span>
          {a.tagline && <p className="approval-feedback" style={{ fontStyle: 'italic' }}>{a.tagline}</p>}
          <p className="approval-feedback">{a.description}</p>
          {a.website_url && (
            <p style={{ marginBottom: 8 }}>
              <a href={a.website_url} target="_blank" rel="noreferrer" className="devscope-repo-name" style={{ fontSize: '0.85rem' }}>
                {a.website_url}
              </a>
            </p>
          )}
          {a.promoted_venture_id ? (
            <Link href={`/dashboard/studio/ventures/${a.promoted_venture_id}`} className="btn btn-ghost btn-sm" style={{ width: 'auto' }}>
              View venture
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={a.status} onChange={(e) => handleStatusChange(a.id, e.target.value)} disabled={pending}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: 'auto' }}
                onClick={() => handlePromote(a.id)}
                disabled={pending}
              >
                Promote to venture
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
