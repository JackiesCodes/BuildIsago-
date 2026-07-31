'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleLessonComplete } from '@/lib/actions/academy';
import { IconCheck } from './icons';

export default function LessonCompleteToggle({ lessonId, completed }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleLessonComplete(lessonId, !completed);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        className={completed ? 'btn btn-ghost' : 'btn btn-primary'}
        style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={handleToggle}
        disabled={pending}
      >
        <IconCheck /> {completed ? 'Completed — mark incomplete' : 'Mark complete'}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
