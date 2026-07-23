export const SERVICES = [
  {
    value: 'software',
    label: 'Software Development',
    shortLabel: 'Software Dev',
    description: 'Web apps, tools, and platforms built from scratch.',
    milestones: ['Requirements', 'Design', 'Build', 'QA', 'Launch'],
  },
  {
    value: 'branding',
    label: 'Branding',
    shortLabel: 'Branding',
    description: 'Identity, voice, and visual direction for your business.',
    milestones: ['Discovery', 'Concepts', 'Revisions', 'Final Delivery'],
  },
  {
    value: 'design',
    label: 'Graphic Design',
    shortLabel: 'Graphic Design',
    description: 'Standalone design work — decks, print, social, more.',
    milestones: ['Brief', 'Drafts', 'Feedback', 'Delivery'],
  },
  {
    value: 'multiple',
    label: 'Full Build',
    shortLabel: 'Multiple',
    description: 'Software, brand, and design together, one team.',
    milestones: ['Discovery', 'In Progress', 'Review', 'Delivery'],
  },
];

export const SERVICE_MAP = Object.fromEntries(SERVICES.map((s) => [s.value, s]));

export function serviceLabel(value) {
  return SERVICE_MAP[value]?.label || value;
}
