import type { Icon } from "@phosphor-icons/react";
import {
  CalendarDots,
  UserCircle,
} from "@phosphor-icons/react";

export type ScheduledOpsNavItem = {
  href: string;
  label: string;
  icon: Icon;
  active?: boolean;
};

export const scheduledOpsNavItems: ScheduledOpsNavItem[] = [
  {
    href: "/scheduled-ops/events",
    label: "Event Terjadwal",
    icon: CalendarDots,
    active: true,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: UserCircle,
  },
] as const;

function getPathFromHref(href: string) {
  return href.split("?")[0];
}

export function createScheduledOpsNavItems(activeHref: string): ScheduledOpsNavItem[] {
  return scheduledOpsNavItems.map((item) => ({
    ...item,
    active: getPathFromHref(item.href) === activeHref,
  }));
}
