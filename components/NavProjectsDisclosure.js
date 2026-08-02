'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { IconChevronDown } from './icons';

/**
 * The Projects/Pipeline nav item, with the list of projects collapsed
 * underneath it. Used by both the desktop sidebar and the mobile drawer,
 * which style it differently but behave identically.
 *
 * The row keeps two separate targets on purpose: the label still
 * navigates to the full list, and only the chevron expands. Making the
 * whole row a toggle would take away the "show me everything" click that
 * was there before.
 */
export default function NavProjectsDisclosure({
  href,
  label,
  icon: Icon,
  projects = [],
  hasMore = false,
  pathname,
  active,
  onNavigate,
}) {
  const listId = useId();
  const onAProject = pathname.startsWith(`${href}/`);
  // Open by default when you're already inside a project, so the list
  // shows where you are rather than hiding it behind a click.
  const [open, setOpen] = useState(onAProject);

  return (
    <li className="nav-disclosure">
      <div className={`nav-disclosure-row${active ? ' active' : ''}`}>
        <Link href={href} className={active ? 'active' : ''} onClick={onNavigate}>
          <Icon />
          <span>{label}</span>
        </Link>
        <button
          type="button"
          className={`nav-disclosure-toggle${open ? ' open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
        >
          <IconChevronDown />
        </button>
      </div>

      {open && (
        <ul className="nav-project-list" id={listId}>
          {!projects.length && <li className="nav-project-empty">No projects yet</li>}
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`${href}/${project.id}`}
                className={pathname.startsWith(`${href}/${project.id}`) ? 'active' : ''}
                onClick={onNavigate}
                title={project.title}
              >
                {project.title}
              </Link>
            </li>
          ))}
          {hasMore && (
            <li>
              <Link href={href} className="nav-project-more" onClick={onNavigate}>
                View all
              </Link>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
