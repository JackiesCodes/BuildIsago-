import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default async function DashboardLayout({ children }) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect('/login');

  const role = profile?.role === 'studio' ? 'studio' : 'client';
  const homeHref = role === 'studio' ? '/dashboard/studio' : '/dashboard/client';

  return (
    <div className="app-shell">
      <Sidebar
        role={role}
        name={profile?.full_name || user.email}
        email={user.email}
        homeHref={homeHref}
        signOutAction={signOut}
      />
      <div className="app-body">
        <TopBar homeHref={homeHref} roleLabel={role === 'studio' ? 'Studio' : 'Client'} />
        <main className="app-main">
          <div className="container">{children}</div>
        </main>
      </div>
    </div>
  );
}
