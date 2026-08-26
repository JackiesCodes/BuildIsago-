/**
 * The five services BuildIsago sells, matching the marketing site exactly.
 *
 * They did not match before: the app offered a "Full Build" that the site
 * never mentions, and was missing Product Design and Creative Media, which
 * the site does sell. Someone reading the site and then signing up found a
 * different menu.
 *
 * `tool` is the route segment under /dashboard/client/<projectId> that this
 * service actually opens. It is what makes the portal self-service — a card
 * opens the thing you use, not a form describing what you would like
 * someone else to make.
 */
export const SERVICES = [
  {
    value: 'software',
    label: 'Software Development',
    shortLabel: 'Software',
    description: 'Web apps, tools, and platforms built from scratch.',
    tool: 'dev',
    milestones: ['Requirements', 'Design', 'Build', 'QA', 'Launch'],
  },
  {
    value: 'branding',
    label: 'Branding',
    shortLabel: 'Branding',
    description: 'Identity, voice, and visual direction for your business.',
    tool: 'brand',
    milestones: ['Discovery', 'Concepts', 'Revisions', 'Final Delivery'],
  },
  {
    value: 'design',
    label: 'Graphic Design',
    shortLabel: 'Graphic Design',
    description: 'Decks, print, social posts and everything around them.',
    tool: 'designs',
    milestones: ['Brief', 'Drafts', 'Feedback', 'Delivery'],
  },
  {
    value: 'product',
    label: 'Product Design',
    shortLabel: 'Product Design',
    description: 'Interfaces, screens and flows for the thing you are building.',
    tool: 'designs',
    milestones: ['Research', 'Wireframes', 'UI', 'Handoff'],
  },
  {
    value: 'media',
    label: 'Creative Media',
    shortLabel: 'Creative Media',
    description: 'Covers, thumbnails and campaign artwork for your channels.',
    tool: 'designs',
    milestones: ['Concept', 'Production', 'Review', 'Delivery'],
  },
];

// Retired, but still on existing rows. Kept out of SERVICES so nobody can
// pick it again, and in the map so the projects that already carry it still
// render a real name instead of the raw column value.
const LEGACY_SERVICES = [
  {
    value: 'multiple',
    label: 'Full Build',
    shortLabel: 'Full Build',
    description: 'Software, brand, and design together, one team.',
    tool: 'designs',
    milestones: ['Discovery', 'In Progress', 'Review', 'Delivery'],
  },
];

export const SERVICE_MAP = Object.fromEntries(
  [...SERVICES, ...LEGACY_SERVICES].map((s) => [s.value, s])
);

export function serviceLabel(value) {
  return SERVICE_MAP[value]?.label || value;
}

/** Route segment a project opens on, e.g. 'dev'. Falls back to the design
 *  canvas, which is the one tool that suits any kind of work. */
export function serviceTool(value) {
  return SERVICE_MAP[value]?.tool || 'designs';
}
