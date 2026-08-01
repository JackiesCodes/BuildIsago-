'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { withinRateLimit } from '@/lib/utils/rateLimit';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    const allowed = await withinRateLimit(supabase, `password-reset:${email.trim().toLowerCase()}`, 5, 30);
    if (!allowed) {
      setLoading(false);
      setError('Too many attempts. Please wait a while and try again.');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    // Always show the same confirmation regardless of whether the email
    // exists — otherwise this becomes an account-enumeration endpoint.
    if (resetError) console.error('resetPasswordForEmail failed:', resetError.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <img src="/logo-icon.png" alt="" />
            <span>Build<span className="accent">Isago</span></span>
          </div>
          <h1>Check your email</h1>
          <p className="auth-sub">
            If an account exists for {email}, we&apos;ve sent a link to reset your password.
          </p>
          <p className="auth-switch">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/logo-icon.png" alt="" />
          <span>Build<span className="accent">Isago</span></span>
        </div>
        <h1>Reset your password</h1>
        <p className="auth-sub">Enter your email and we&apos;ll send you a reset link.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
