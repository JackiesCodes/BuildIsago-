'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createProject } from '@/lib/actions/projects';

const initialState = { error: null };

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    <>
      <Link href="/dashboard/client" className="back-link">&larr; Back to projects</Link>
      <div className="page-head">
        <div>
          <h1>Start a new project</h1>
          <p>Tell us what you need — we&apos;ll follow up with next steps.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {state?.error && <div className="form-error">{state.error}</div>}
        <form action={formAction}>
          <div className="field">
            <label htmlFor="title">Project title</label>
            <input id="title" name="title" type="text" required placeholder="e.g. New brand identity" />
          </div>
          <div className="field">
            <label htmlFor="service_type">Service</label>
            <select id="service_type" name="service_type" defaultValue="software" required>
              <option value="software">Software Development</option>
              <option value="branding">Branding</option>
              <option value="design">Graphic Design</option>
              <option value="multiple">More than one</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="description">Project details</label>
            <textarea id="description" name="description" rows={5} required placeholder="Goals, timeline, anything we should know…" />
          </div>
          <div className="field">
            <label htmlFor="due_date">Target date (optional)</label>
            <input id="due_date" name="due_date" type="date" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit project'}
          </button>
        </form>
      </div>
    </>
  );
}
