'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The studio still works a project across every section, so it keeps the
// full set. The client side passes its own much shorter list — see
// app/dashboard/client/[projectId]/layout.js.
const STUDIO_TABS = [
  { slug: '', label: 'Overview' },
  { slug: 'brand', label: 'Brand' },
  { slug: 'dev', label: 'Dev' },
  { slug: 'references', label: 'References' },
  { slug: 'invoices', label: 'Invoices' },
  { slug: 'approvals', label: 'Approvals' },
  { slug: 'retainers', label: 'Retainers' },
];

export default function ProjectTabs({ basePath, hide = [], tabs }) {
  const pathname = usePathname();
  const source = tabs || STUDIO_TABS;
  const visible = hide.length ? source.filter((t) => !hide.includes(t.slug)) : source;

  // A single tab is a label, not a choice — rendering a one-item tab bar
  // just adds furniture.
  if (visible.length < 2) return null;

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {visible.map((tab) => {
        const href = tab.slug ? `${basePath}/${tab.slug}` : basePath;
        const active = tab.slug ? pathname.startsWith(href) : pathname === basePath;
        return (
          <Link key={tab.slug || 'overview'} href={href} className={active ? 'active' : ''}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
