'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/PasswordInput';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The recovery link puts the user into a temporary authenticated
    // session via the URL fragment — the Supabase client picks it up
    // automatically on load. We just wait for that session to exist
    // before allowing the form to submit.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/logo-icon.png" alt="" />
          <span>Build<span className="accent">Isago</span></span>
        </div>
        <h1>Set a new password</h1>
        <p className="auth-sub">
          {ready ? 'Choose a new password for your account.' : 'Verifying your reset link…'}
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <PasswordInput
            id="password"
            label="New password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
