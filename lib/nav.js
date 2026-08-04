/**
 * Which nav item should be highlighted for the current path.
 *
 * Pure and free of the icon imports in lib/constants/nav.js so it can be
 * tested on its own.
 */
export function activeNavHref({ hrefs = [], pathname = '', projectBase, projectsHref }) {
  // Longest matching href wins — several nav items share a path prefix
  // (e.g. /dashboard/studio and /dashboard/studio/products), so a plain
  // startsWith() would light up more than one at a time.
  const direct = hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (direct) return direct;

  // An individual project sits outside its section's path for clients
  // (/dashboard/client/<id> vs /dashboard/client/projects). Without this
  // the sidebar would go blank the moment you opened a project.
  if (projectBase && projectsHref && pathname.startsWith(`${projectBase}/`)) {
    return projectsHref;
  }

  return undefined;
}
