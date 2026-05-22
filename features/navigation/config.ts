import type { NavigationItem } from "./types";

type NavigationKeySubItem = {
  key: string;
  href: string;
  icon?: string;
};

type NavigationKeyItem = {
  key: string;
  href: string;
  target?: "_blank";
  subItems?: NavigationKeySubItem[];
};

// These are the navigation keys for translation
export const marketingNavigationKeys: NavigationKeyItem[] = [
  {
    key: "industries",
    href: "/industries",
    subItems: [
      {
        key: "pressureWashing",
        href: "/industries/pressure-washing-marketing",
      },
      {
        key: "autoDetailing",
        href: "/industries/auto-detailing-marketing",
      },
    ],
  },
  {
    key: "templates",
    href: "/templates",
  },
  {
    key: "pricing",
    href: "/pricing",
  },
  {
    key: "contact",
    href: "/contact",
  },
];

export const appNavigationKeys: NavigationKeyItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
  },
  {
    key: "settings",
    href: "/settings",
  },
  {
    key: "profile",
    href: "/profile",
  },
];

// Legacy exports for compatibility
export const marketingNavigation: NavigationItem[] = [
  {
    title: "Industries",
    href: "/industries",
  },
  {
    title: "Templates",
    href: "/templates",
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Contact",
    href: "/contact",
  },
];

export const appNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Settings",
    href: "/settings",
  },
  {
    title: "Profile",
    href: "/profile",
  },
];
