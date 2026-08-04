'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconSearch } from './icons';

/**
 * Search that lives on the page it filters, rather than in the app's top
 * bar. In the top bar it was always visible and only ever did one thing,
 * so on every screen but this one it was a control that did nothing.
 *
 * Uses replace() rather than push(): typing five characters should not
 * put five entries in the history and make Back a per-keystroke undo.
 */
export default function ProjectSearch({ placeholder = 'Search projects…' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [value, setValue] = useState(queryParam);

  // Keeps the field honest when the URL changes underneath it — a back
  // navigation, or landing here with ?q= already set.
  useEffect(() => {
    setValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value === queryParam) return;
      router.replace(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="project-search">
      <IconSearch />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        aria-label={placeholder}
      />
    </label>
  );
}
