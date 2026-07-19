'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectStatus } from '@/lib/actions/projects';

const OPTIONS = [
  { value: 'intake', label: 'Intake' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
];

export default function StatusSelect({ projectId, status }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  function handleChange(e) {
    const next = e.target.value;
    setValue(next);
    startTransition(async () => {
      await updateProjectStatus(projectId, next);
      router.refresh();
    });
  }

  return (
    <select className="status-select" value={value} onChange={handleChange} disabled={pending}>
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
