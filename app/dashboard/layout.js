import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions/auth';

export default async function DashboardLayout({ children }) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect('/login');

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/dashboard" className="app-brand">
          <img src="/logo-icon.png" alt="" />
          <span>Build<span className="accent">Isago</span></span>
        </Link>
        <div className="app-user">
          <span className="role-pill">{profile?.role === 'studio' ? 'Studio' : 'Client'}</span>
          <span className="who">
            Signed in as <strong>{profile?.full_name || user.email}</strong>
          </span>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
          </form>
        </div>
      </header>
      <main className="app-main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
