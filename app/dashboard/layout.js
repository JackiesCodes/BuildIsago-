import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { NAV_PROJECT_LIMIT } from '@/lib/constants/nav';
import { isSelfServe } from '@/lib/engagement';
import { signOut } from '@/lib/actions/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import MobileNav from '@/components/MobileNav';
import CommandPalette from '@/components/CommandPalette';

export default async function DashboardLayout({ children }) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const role = profile?.role === 'studio' ? 'studio' : 'client';
  const homeHref = role === 'studio' ? '/dashboard/studio' : '/dashboard/client';

  // Recent projects for the nav disclosure. Fetch one past the limit so
  // we know whether to offer "View all" without a second count query.
  // RLS already scopes clients to their own rows; studio sees all.
  const { data: navProjectRows } = await supabase
    .from('projects')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(NAV_PROJECT_LIMIT + 1);

  const navProjects = (navProjectRows || []).slice(0, NAV_PROJECT_LIMIT);
  const hasMoreProjects = (navProjectRows || []).length > NAV_PROJECT_LIMIT;
  const selfServe = isSelfServe(profile);

  return (
    <div className="app-shell">
      <Sidebar
        role={role}
        name={profile?.full_name || user.email}
        email={user.email}
        homeHref={homeHref}
        signOutAction={signOut}
        projects={navProjects}
        hasMoreProjects={hasMoreProjects}
        selfServe={selfServe}
      />
      <MobileNav
        role={role}
        name={profile?.full_name || user.email}
        email={user.email}
        homeHref={homeHref}
        signOutAction={signOut}
        projects={navProjects}
        hasMoreProjects={hasMoreProjects}
        selfServe={selfServe}
      />
      <div className="app-body">
        <TopBar homeHref={homeHref} />
        <main className="app-main">
          <div className="container">{children}</div>
        </main>
      </div>
      <CommandPalette role={role} signOutAction={signOut} />
    </div>
  );
}
