/**
 * Sidebar navigation, built from the content-type config so new upload pages
 * appear in the menu automatically.
 */
import { FaThLarge, FaUsers, FaCrown, FaUserFriends } from 'react-icons/fa';
import { CONTENT_GROUPS, CONTENT_TYPES } from './contentTypes';

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: FaThLarge }],
  },
  {
    title: 'Members',
    items: [
      { to: '/users/all', label: 'All users', icon: FaUsers },
      { to: '/users/basic', label: 'Basic plan', icon: FaUserFriends },
      { to: '/users/premium', label: 'Premium', icon: FaCrown },
    ],
  },
  ...CONTENT_GROUPS.map((group) => ({
    title: group,
    items: CONTENT_TYPES.filter((type) => type.group === group).map((type) => ({
      to: `/uploads/${type.slug}`,
      label: type.label,
      icon: type.icon,
    })),
  })),
];

/** Flat list used by the top-bar quick search. */
export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title }))
);
