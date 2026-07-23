'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconKanban, IconLayoutGrid, IconLogOut, IconPlus } from './icons';

const NAV = {
  client: [{ href: '/dashboard/client', label: 'Projects', icon: IconLayoutGrid }],
  studio: [{ href: '/dashboard/studio', label: 'Pipeline', icon: IconKanban }],
};

export default function Sidebar({ role, name, email, homeHref, signOutAction }) {
  const pathname = usePathname();
  const navItems = NAV[role] || NAV.client;
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

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
          New Project
        </Link>
      )}

      <nav className="sidebar-nav">
        <span className="sidebar-nav-label">Main</span>
        <ul>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
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
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-avatar">{initial}</span>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{name}</span>
            <span className="sidebar-user-role">{role === 'studio' ? 'Studio account' : 'Client account'}</span>
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="sidebar-signout" title="Sign out" aria-label="Sign out">
            <IconLogOut />
          </button>
        </form>
      </div>
    </aside>
  );
}
