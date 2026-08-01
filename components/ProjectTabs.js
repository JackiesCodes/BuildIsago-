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

export default function ProjectTabs({ basePath }) {
  const pathname = usePathname();

  return (
    <nav className="project-tabs" aria-label="Project sections">
      {TABS.map((tab) => {
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
