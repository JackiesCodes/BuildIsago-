'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MfaSettings() {
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === 'verified') || null;
    setFactor(verified);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleEnroll() {
    setError('');
    setBusy(true);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (enrollError) {
      setError(enrollError.message);
      return;
    }
    setEnrolling(data);
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (challengeError) {
      setBusy(false);
      setError(challengeError.message);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolling.id,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setEnrolling(null);
    setCode('');
    refresh();
  }

  async function handleRemove() {
    if (!confirm('Turn off two-factor authentication?')) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    refresh();
  }

  if (loading) return null;

  if (enrolling) {
    return (
      <div>
        <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
          Scan this with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.
        </p>
        {enrolling.totp?.qr_code && (
          <img
            src={enrolling.totp.qr_code}
            alt="Scan with your authenticator app"
            style={{ width: 180, height: 180, marginBottom: 14, borderRadius: 'var(--radius-sm)' }}
          />
        )}
        <p className="field-hint" style={{ marginBottom: 14 }}>
          Can&apos;t scan? Enter this code manually: <code>{enrolling.totp?.secret}</code>
        </p>
        <form onSubmit={handleVerify}>
          <div className="field">
            <label>6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </div>
          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify and enable'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: 'auto' }}
              onClick={() => {
                setEnrolling(null);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (factor) {
    return (
      <div>
        <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
          Two-factor authentication is <strong>on</strong>. You&apos;ll be asked for a code from your authenticator app when
          signing in.
        </p>
        <button type="button" className="btn btn-danger" onClick={handleRemove} disabled={busy}>
          Turn off
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
        Add an extra layer of protection — a code from an authenticator app in addition to your password.
      </p>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
      <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={handleEnroll} disabled={busy}>
        {busy ? 'Starting…' : 'Enable two-factor authentication'}
      </button>
    </div>
  );
}
