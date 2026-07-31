'use client';

import { useState, useTransition } from 'react';
import { sendTalentRequest } from '@/lib/actions/marketplace';

export default function ContactTalentForm({ talentId }) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await sendTalentRequest(talentId, message);
      if (result?.error) setError(result.error);
      else setSent(true);
    });
  }

  if (sent) {
    return <div className="form-success">Sent — they (and the studio) will follow up with you directly.</div>;
  }

  return (
    <div>
      <div className="field">
        <label>What do you need help with?</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A quick summary of the project and timeline."
        />
      </div>
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button type="button" className="btn btn-primary" onClick={handleSend} disabled={pending}>
        {pending ? 'Sending…' : 'Send inquiry'}
      </button>
    </div>
  );
}
