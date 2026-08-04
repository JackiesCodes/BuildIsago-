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
  projectBase,
  label,
  icon: Icon,
  projects = [],
  hasMore = false,
  pathname,
  active,
  onNavigate,
}) {
  const listId = useId();
  // The list page and an individual project are different routes for the
  // client (…/projects vs …/<id>), so project links are built from the
  // project base, not from the section href.
  const base = projectBase || href;

  // Open by default when this nav item is the active one, so the list
  // shows where you are rather than hiding it behind a click.
  //
  // `active` rather than a path test of our own: on the studio side the
  // pipeline and its sibling sections share a prefix (/dashboard/studio
  // vs /dashboard/studio/products), so "does the path start with mine"
  // was true on Products, Academy, Talent, Ventures and Activity — and
  // false on the pipeline itself. The list expanded on every page except
  // the one it belongs to. activeNavHref() already resolves that with a
  // longest-match rule, and it is tested.
  const [open, setOpen] = useState(Boolean(active));

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
                href={`${base}/${project.id}`}
                className={pathname.startsWith(`${base}/${project.id}`) ? 'active' : ''}
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
