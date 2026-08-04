import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/server';
import { NAV_PROJECT_LIMIT } from '@/lib/constants/nav';
import { isSelfServe } from '@/lib/engagement';
import { signOut } from '@/lib/actions/auth';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import CommandPalette from '@/components/CommandPalette';

export default async function DashboardLayout({ children }) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const role = profile?.role === 'studio' ? 'studio' : 'client';
  const homeHref = role === 'studio' ? '/dashboard/studio' : '/dashboard/client';

  // Recent projects for the nav disclosure. Fetch one past the limit so
  // we know whether to offer "View all" without a second count query.
  // RLS already scopes clients to their own rows.
  let navProjectQuery = supabase
    .from('projects')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(NAV_PROJECT_LIMIT + 1);

  // Studio sees every project through RLS, but its nav should match its
  // pipeline: work the studio was actually given, not the private
  // workspaces of self-serve accounts.
  if (role === 'studio') {
    navProjectQuery = supabase
      .from('projects')
      .select('id, title, profiles!inner(engagement_mode)')
      .eq('profiles.engagement_mode', 'managed')
      .order('created_at', { ascending: false })
      .limit(NAV_PROJECT_LIMIT + 1);
  }

  const { data: navProjectRows } = await navProjectQuery;

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
        {/* No top bar: search was the only thing in it, and it now lives
            on the Projects page it filters. An empty 73px strip across
            every screen would be worse than none. ⌘K still opens the
            command palette from anywhere. */}
        <main className="app-main">
          <div className="container">{children}</div>
        </main>
      </div>
      <CommandPalette role={role} signOutAction={signOut} />
    </div>
  );
}
