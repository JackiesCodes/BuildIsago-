'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { IconChevronDown } from './icons';

/**
 * The Projects/Pipeline nav item, with the projects listed underneath.
 * Shared by the desktop sidebar and the mobile drawer, which style it
 * differently but behave identically.
 *
 * The whole row is the toggle — clicking "Projects" opens the list
 * rather than navigating away from where you are. The full page is
 * still reachable from "All projects" at the foot of the list, and from
 * the brand logo.
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
      <button
        type="button"
        className={`nav-disclosure-row${active ? ' active' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
      >
        <Icon />
        <span>{label}</span>
        <IconChevronDown className="nav-disclosure-chevron" />
      </button>

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
          {/* Always present, not just when the list is truncated: the row
              above no longer navigates, so this is the way back to the
              full page. */}
          <li>
            <Link
              href={href}
              className={`nav-project-more${pathname === href ? ' active' : ''}`}
              onClick={onNavigate}
            >
              {hasMore ? 'View all projects' : 'All projects'}
            </Link>
          </li>
        </ul>
      )}
    </li>
  );
}
