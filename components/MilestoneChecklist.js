'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleMilestone } from '@/lib/actions/milestones';

export default function MilestoneChecklist({ projectId, milestones, editable }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const total = milestones.length;
  const done = milestones.filter((m) => m.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function handleToggle(milestone) {
    if (!editable) return;
    startTransition(async () => {
      await toggleMilestone(milestone.id, projectId, !milestone.completed);
      router.refresh();
    });
  }

  if (!total) {
    return <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem' }}>No milestones set.</p>;
  }

  return (
    <div className="milestones">
      <div className="milestone-progress-track">
        <div className="milestone-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="milestone-progress-label">{done} of {total} complete</p>

      <ul className="milestone-list">
        {milestones.map((m) => (
          <li key={m.id} className={`milestone-item ${m.completed ? 'is-done' : ''}`}>
            <button
              type="button"
              className="milestone-check"
              onClick={() => handleToggle(m)}
              disabled={!editable || pending}
              aria-pressed={m.completed}
              aria-label={m.completed ? `Mark ${m.title} incomplete` : `Mark ${m.title} complete`}
            >
              {m.completed && (
                <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
                  <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className="milestone-title">{m.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
