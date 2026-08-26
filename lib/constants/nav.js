import {
  IconActivity,
  IconDownload,
  IconGraduationCap,
  IconKanban,
  IconLayoutGrid,
  IconRocket,
  IconSettings,
  IconShoppingBag,
  IconUsers,
} from '@/components/icons';

export const NAV = {
  client: [
    { href: '/dashboard/client/projects', label: 'Your work', icon: IconLayoutGrid },
    { href: '/dashboard/marketplace', label: 'Marketplace', icon: IconUsers },
    { href: '/dashboard/academy', label: 'Academy', icon: IconGraduationCap },
    { href: '/dashboard/ventures', label: 'Ventures', icon: IconRocket },
    { href: '/dashboard/downloads', label: 'Downloads', icon: IconDownload },
  ],
  studio: [
    { href: '/dashboard/studio', label: 'Pipeline', icon: IconKanban },
    { href: '/dashboard/studio/products', label: 'Products', icon: IconShoppingBag },
    { href: '/dashboard/studio/academy', label: 'Academy', icon: IconGraduationCap },
    { href: '/dashboard/studio/talent', label: 'Talent', icon: IconUsers },
    { href: '/dashboard/studio/ventures', label: 'Ventures', icon: IconRocket },
    { href: '/dashboard/studio/activity', label: 'Activity', icon: IconActivity },
    { href: '/dashboard/downloads', label: 'Downloads', icon: IconDownload },
  ],
};

export const SETTINGS_ITEM = { href: '/dashboard/settings', label: 'Settings', icon: IconSettings };

// The nav item whose children are individual projects, per role.
export const PROJECTS_HREF = {
  client: '/dashboard/client/projects',
  studio: '/dashboard/studio',
};

// Where an individual project lives. Separate from PROJECTS_HREF because
// the client's list page is /dashboard/client/projects while a project is
// /dashboard/client/<id> — appending the id to the section would 404.
export const PROJECT_BASE = { client: '/dashboard/client', studio: '/dashboard/studio' };

// How many projects list inline before falling back to "View all".
export const NAV_PROJECT_LIMIT = 8;
