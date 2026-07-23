import { getSessionProfile } from '@/lib/supabase/server';
import AppearanceSettings from '@/components/AppearanceSettings';

export default async function SettingsPage() {
  const { user, profile } = await getSessionProfile();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Your account and how the portal looks.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, maxWidth: 560 }}>
        <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-display)' }}>Account</h3>
        <div className="settings-row">
          <span className="settings-row-label">Name</span>
          <span>{profile?.full_name || '—'}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Email</span>
          <span>{user.email}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Role</span>
          <span className="role-pill">{profile?.role === 'studio' ? 'Studio' : 'Client'}</span>
        </div>
        {profile?.company && (
          <div className="settings-row">
            <span className="settings-row-label">Company</span>
            <span>{profile.company}</span>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginBottom: 6, fontFamily: 'var(--font-display)' }}>Appearance</h3>
        <p style={{ color: 'var(--muted-2)', fontSize: '0.85rem', marginBottom: 16 }}>
          System follows your device&apos;s light/dark setting automatically.
        </p>
        <AppearanceSettings />
      </div>
    </>
  );
}
