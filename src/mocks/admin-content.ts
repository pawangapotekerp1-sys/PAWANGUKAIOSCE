import type { Icon } from "@phosphor-icons/react";
import {
  ChartLineUp,
  CheckCircle,
  ClockCountdown,
  MagicWand,
  NotePencil,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: Icon;
  active?: boolean;
};

export type AdminMetric = {
  label: string;
  value: string;
  tone: "teal" | "gold" | "green";
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: ChartLineUp,
    active: true,
  },
  {
    href: "/admin/payments",
    label: "Pembayaran",
    icon: CheckCircle,
  },
  {
    href: "/admin/question-generator",
    label: "Penyusun Soal",
    icon: MagicWand,
  },
  {
    href: "/admin/questions",
    label: "Bank Soal",
    icon: NotePencil,
  },
  {
    href: "/admin/users",
    label: "Pengguna",
    icon: UsersThree,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: UserCircle,
  },
] as const;

export function createAdminNavItems(activeHref: string): AdminNavItem[] {
  return adminNavItems.map((item) => ({
    ...item,
    active: item.href === activeHref,
  }));
}

export const adminMetrics: AdminMetric[] = [
  {
    label: "Pembayaran menunggu",
    value: "12 pembayaran",
    tone: "gold",
  },
  {
    label: "Pengguna aktif",
    value: "842 pengguna",
    tone: "teal",
  },
  {
    label: "Attempt tercatat",
    value: "1.284 attempt",
    tone: "green",
  },
] as const;

export const paymentQueue = [
  {
    name: "Nadira Puspandari",
    packageName: "Pro 30 Hari",
    submittedAt: "08:14 WIB",
    status: "pending_review",
  },
  {
    name: "Rafi Arkananda",
    packageName: "Sprint 14 Hari",
    submittedAt: "07:52 WIB",
    status: "reupload_needed",
  },
] as const;

export const adminShellMeta = {
  brand: "Pawang Masuk Apoteker",
  summaryTitle: "Ringkasan admin hari ini",
  summaryDescription:
    "Pantau pembayaran, pengguna aktif, dan aktivitas try out dari satu tempat.",
  userPulse: {
    title: "Pengguna baru hari ini",
    detail: "26 akun baru mulai berlangganan hari ini.",
    icon: UserCircle,
  },
  reviewPulse: {
    title: "Pembayaran menunggu verifikasi",
    detail: "7 pembayaran masih menunggu verifikasi.",
    icon: ClockCountdown,
  },
} as const;
