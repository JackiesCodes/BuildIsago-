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
    { href: '/dashboard/client', label: 'Projects', icon: IconLayoutGrid },
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
