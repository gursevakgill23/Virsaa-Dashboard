/**
 * Sidebar navigation, built from the content-type config so new upload pages
 * appear in the menu automatically.
 */
import { FaThLarge, FaUsers, FaCrown, FaUserFriends, FaUserShield } from 'react-icons/fa';
import { CONTENT_GROUPS, CONTENT_TYPES } from './contentTypes';

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: FaThLarge }],
  },
  {
    title: 'Members',
    items: [
      { to: '/users/all', label: 'All members', icon: FaUsers },
      { to: '/users/free', label: 'Free members', icon: FaUserFriends },
      { to: '/users/paid', label: 'Paid members', icon: FaCrown },
      { to: '/users/admins', label: 'Admins', icon: FaUserShield },
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
