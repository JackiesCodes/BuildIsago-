'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitVentureApplication } from '@/lib/actions/ventures';
import { APPLICATION_STAGES } from '@/lib/constants/ventureStages';

export default function VentureApplicationForm() {
  const router = useRouter();
  const [ventureName, setVentureName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState('idea');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await submitVentureApplication({ ventureName, tagline, description, stage, websiteUrl });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setVentureName('');
      setTagline('');
      setDescription('');
      setStage('idea');
      setWebsiteUrl('');
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Pitch your startup</h3>
      <p className="field-hint" style={{ marginBottom: 20 }}>
        A quick pitch is all we need to start a conversation — the studio reviews every submission.
      </p>

      <div className="invoice-meta-row">
        <div className="field">
          <label>Venture name</label>
          <input type="text" value={ventureName} onChange={(e) => setVentureName(e.target.value)} placeholder="e.g. Nimbus Labs" />
        </div>
        <div className="field">
          <label>Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {APPLICATION_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Tagline</label>
        <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One sentence." />
      </div>

      <div className="field">
        <label>Tell us about it</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="The problem, the solution, why now, why you."
        />
      </div>

      <div className="field">
        <label>Website or deck link (optional)</label>
        <input type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
      </div>

      {success && <div className="form-success" style={{ marginBottom: 12 }}>Sent — the studio will review it.</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={pending}>
        {pending ? 'Sending…' : 'Submit pitch'}
      </button>
    </div>
  );
}
