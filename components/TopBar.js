'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconSearch } from './icons';

export default function TopBar({ homeHref }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(pathname === homeHref ? searchParams.get('q') || '' : '');

  useEffect(() => {
    if (pathname === homeHref) setValue(searchParams.get('q') || '');
  }, [pathname, homeHref, searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = pathname === homeHref ? searchParams.get('q') || '' : '';
      if (value === current) return;
      const target = value ? `${homeHref}?q=${encodeURIComponent(value)}` : homeHref;
      router.push(target);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="topbar">
      <label className="topbar-search">
        <IconSearch />
        <input
          type="text"
          placeholder="Search your projects…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <kbd title="Open command palette">⌘K</kbd>
      </label>
    </div>
  );
}
