'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconPlus, IconSettings } from './icons';
import { NAV, PROJECT_BASE, PROJECTS_HREF, SETTINGS_ITEM } from '@/lib/constants/nav';
import ProfileMenu from './ProfileMenu';
import NavProjectsDisclosure from './NavProjectsDisclosure';
import { activeNavHref } from '@/lib/nav';

export default function Sidebar({ role, name, email, homeHref, signOutAction, projects = [], hasMoreProjects = false }) {
  const pathname = usePathname();
  const navItems = NAV[role] || NAV.client;

  const activeHref = activeNavHref({
    hrefs: navItems.map((item) => item.href),
    pathname,
    projectBase: PROJECT_BASE[role],
    projectsHref: PROJECTS_HREF[role],
  });

  return (
    <aside className="sidebar">
      <Link href={homeHref} className="sidebar-brand">
        <img src="/logo-icon.png" alt="" />
        <span>
          Build<span className="accent">Isago</span>
        </span>
      </Link>

      {/* Home is where the five service cards are, and each one creates
          and opens its tool. There is no brief form to send anyone to. */}
      {role === 'client' && (
        <Link href="/dashboard/client" className="sidebar-cta">
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
                  projectBase={PROJECT_BASE[role]}
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
