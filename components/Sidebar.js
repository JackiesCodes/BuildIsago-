'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconPlus, IconSettings } from './icons';
import { NAV, PROJECTS_HREF, SETTINGS_ITEM } from '@/lib/constants/nav';
import ProfileMenu from './ProfileMenu';
import NavProjectsDisclosure from './NavProjectsDisclosure';

export default function Sidebar({ role, name, email, homeHref, signOutAction, projects = [], hasMoreProjects = false }) {
  const pathname = usePathname();
  const navItems = NAV[role] || NAV.client;

  // Longest matching href wins — several nav items can share a path
  // prefix (e.g. /dashboard/studio and /dashboard/studio/products), so a
  // plain startsWith() would light up more than one at a time.
  const activeHref = navItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside className="sidebar">
      <Link href={homeHref} className="sidebar-brand">
        <img src="/logo-icon.png" alt="" />
        <span>
          Build<span className="accent">Isago</span>
        </span>
      </Link>

      {role === 'client' && (
        <Link href="/dashboard/client/new" className="sidebar-cta">
          <IconPlus />
          <span>New Project</span>
        </Link>
      )}

      <nav className="sidebar-nav">
        <span className="sidebar-nav-label">Main</span>
        <ul>
          {navItems.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            if (item.href === PROJECTS_HREF[role]) {
              return (
                <NavProjectsDisclosure
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={Icon}
                  projects={projects}
                  hasMore={hasMoreProjects}
                  pathname={pathname}
                  active={active}
                />
              );
            }
            return (
              <li key={item.href}>
                <Link href={item.href} className={active ? 'active' : ''}>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <span className="sidebar-nav-label">Preferences</span>
        <ul>
          <li>
            <Link
              href={SETTINGS_ITEM.href}
              className={pathname.startsWith(SETTINGS_ITEM.href) ? 'active' : ''}
            >
              <IconSettings />
              <span>{SETTINGS_ITEM.label}</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Sign-out and theme now live inside the profile menu, matching how
          this is done nearly everywhere else — a permanently-visible
          sign-out button is a destructive action sitting in the nav. */}
      <div className="sidebar-footer">
        <ProfileMenu name={name} email={email} role={role} signOutAction={signOutAction} />
      </div>
    </aside>
  );
}
