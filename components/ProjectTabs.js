'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { slug: '', label: 'Overview' },
  { slug: 'brand', label: 'Brand' },
  { slug: 'dev', label: 'Dev' },
  { slug: 'references', label: 'References' },
  { slug: 'invoices', label: 'Invoices' },
  { slug: 'approvals', label: 'Approvals' },
  { slug: 'retainers', label: 'Retainers' },
];

export default function ProjectTabs({ basePath, hide = [] }) {
  const pathname = usePathname();
  const tabs = hide.length ? TABS.filter((t) => !hide.includes(t.slug)) : TABS;

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {tabs.map((tab) => {
        const href = tab.slug ? `${basePath}/${tab.slug}` : basePath;
        const active = tab.slug
          ? pathname.startsWith(href)
          : pathname === basePath;
        return (
          <Link key={tab.slug || 'overview'} href={href} className={active ? 'active' : ''}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
