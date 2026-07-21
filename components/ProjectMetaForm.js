'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectMeta } from '@/lib/actions/projects';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function ProjectMetaForm({ projectId, dueDate, priority }) {
  const router = useRouter();
  const [due, setDue] = useState(dueDate || '');
  const [prio, setPrio] = useState(priority);
  const [pending, startTransition] = useTransition();

  function save(next) {
    startTransition(async () => {
      await updateProjectMeta(projectId, next);
      router.refresh();
    });
  }

  return (
    <div className="meta-form">
      <div className="meta-field">
        <label htmlFor="dueDate">Due date</label>
        <input
          id="dueDate"
          type="date"
          value={due}
          disabled={pending}
          onChange={(e) => {
            setDue(e.target.value);
            save({ due_date: e.target.value, priority: prio });
          }}
        />
      </div>
      <div className="meta-field">
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={prio}
          disabled={pending}
          onChange={(e) => {
            setPrio(e.target.value);
            save({ due_date: due, priority: e.target.value });
          }}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
