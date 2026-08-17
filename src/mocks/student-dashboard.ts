import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CalendarDays,
  ChartColumnBig,
  CircleGauge,
  FileCheck2,
  IdCard,
  Sparkles,
  Trophy,
  Video,
  Presentation,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import type { UserRole } from "../lib/auth/permissions";

export type MetricTone = "teal" | "gold" | "green";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
};

export type BlockPerformance = {
  name: string;
  score: number;
  status: string;
};

export type AttemptSummary = {
  title: string;
  meta: string;
  score: string;
  note: string;
};

export type QuickAction = {
  title: string;
  body: string;
  cta: string;
  href: string;
  accent: LucideIcon;
};

export type StudyQueueItem = {
  topic: string;
  focus: string;
};

export type ProductNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  children?: Array<{
    href: string;
    label: string;
    active?: boolean;
  }>;
};

export const productNavItems: ProductNavItem[] = [
  {
    href: "/app/tryout-selection",
    label: "Try Out",
    icon: FileCheck2,
  },
  {
    href: "/app/review",
    label: "Review",
    icon: BookOpenCheck,
  },
  {
    href: "/app/analytics",
    label: "Analisis",
    icon: ChartColumnBig,
  },
  {
    href: "/app/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
  {
    href: "/app/area-belajar",
    label: "Area Belajar",
    icon: Presentation,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: IdCard,
  },
  {
    href: "/app/settings/ai-config",
    label: "Pengaturan AI",
    icon: Settings2,
  },
] as const;

const mentorScheduledEventManagerHref = "/scheduled-ops/events";
const mentorScheduledEventCreatePath = "/scheduled-ops/events/new";
const mentorScheduledEventCreateHref = `${mentorScheduledEventCreatePath}?fresh=1`;
const mentorQuestionGeneratorHref = "/app/question-generator";
const mentorFlashCardGeneratorHref = "/app/flash-card-generator";

export function createProductNavItems(
  activeHref: string,
  role: UserRole | null | undefined = null,
): ProductNavItem[] {
  const visibleItems: ProductNavItem[] = role === "mentor"
    ? [
      productNavItems[0], // Try Out
      productNavItems[1], // Review
      productNavItems[2], // Analisis
      productNavItems[3], // Leaderboard
      productNavItems[4], // Area Belajar
      {
        href: "/app/area-mentor",
        label: "Area Mentor",
        icon: ShieldCheck,
      },
      productNavItems[5], // Profil
      productNavItems[6], // Pengaturan AI
    ]
    : role === "osce_pro"
    ? [
      {
        href: "/app/scheduled-tryout",
        label: "Try Out Terjadwal",
        icon: CalendarDays,
      },
      productNavItems[1], // Review
      productNavItems[4], // Area Belajar
      productNavItems[5], // Profil
      productNavItems[6], // Pengaturan AI
    ]
    : [...productNavItems];

  return visibleItems.map((item) => {
    let isActive = item.children?.length ? item.active : item.href === activeHref;
    if (item.href === "/app/tryout-selection" && (activeHref.startsWith("/app/tryout") || activeHref.startsWith("/app/scheduled-tryout"))) {
      isActive = true;
    }
    if (item.href === "/app/area-belajar" && (activeHref.startsWith("/app/area-belajar") || activeHref === "/app/rekaman-kelas" || activeHref === "/app/materi-ppt" || activeHref.startsWith("/app/flash-cards") || activeHref.startsWith("/app/osce-demo"))) {
      isActive = true;
    }
    return { ...item, active: isActive };
  });
}

export function resolveStudentTierLabel(role: UserRole | null | undefined) {
  if (role === "mentor") return "Mentor";
  if (role === "osce_pro") return "Osce Pro";
  return productShellMeta.tierLabel;
}

export const progressCards: DashboardMetric[] = [
  {
    label: "Skor rata-rata",
    value: "78",
    detail: "Naik 6 poin dari minggu lalu",
    tone: "teal",
  },
  {
    label: "Try out selesai",
    value: "12",
    detail: "2 sesi lagi menuju target pekan ini",
    tone: "gold",
  },
  {
    label: "Akurasi Clinical",
    value: "64%",
    detail: "Masih butuh penguatan farmakoterapi",
    tone: "green",
  },
] as const;

export const blockPerformance: BlockPerformance[] = [
  { name: "Clinical Science", score: 64, status: "Blok terlemah" },
  { name: "Pharmaceutical Science", score: 81, status: "Stabil" },
  { name: "Social, Behavioral & Administrative", score: 76, status: "Meningkat" },
] as const;

export const recentAttempts: AttemptSummary[] = [
  {
    title: "Try Out Besar 04",
    meta: "50 soal campuran",
    score: "74",
    note: "Banyak salah di kardiologi dan sediaan steril.",
  },
  {
    title: "Blok Clinical Science",
    meta: "50 soal",
    score: "68",
    note: "Antihipertensi dan gagal jantung masih perlu diulang.",
  },
  {
    title: "Blok Pharmaceutical Science",
    meta: "30 soal",
    score: "84",
    note: "Perhitungan kuat, evaluasi steril masih aman.",
  },
] as const;

export const quickActions: QuickAction[] = [
  {
    title: "Try Out Besar",
    body: "Masuk ke simulasi penuh 50 soal dengan timer aktif.",
    cta: "Mulai sesi",
    href: "/app/tryout/session",
    accent: CircleGauge,
  },
  {
    title: "Try Out per Blok",
    body: "Persempit latihan ke area yang masih paling terasa lemah.",
    cta: "Pilih blok",
    href: "/app/tryout",
    accent: FileCheck2,
  },
  {
    title: "Review salah saja",
    body: "Buka ulang semua soal yang terakhir membuat skor turun.",
    cta: "Buka review prioritas",
    href: "/app/review",
    accent: BookOpenCheck,
  },
] as const;

export const studyQueue: StudyQueueItem[] = [
  {
    topic: "Kardiologi dasar",
    focus: "Antihipertensi, gagal jantung, dan pemilihan terapi awal.",
  },
  {
    topic: "Sediaan steril",
    focus: "Stabilitas, teknik aseptik, dan evaluasi formulasi.",
  },
  {
    topic: "Pelayanan farmasi klinis",
    focus: "Intervensi, monitoring, dan interpretasi respons terapi.",
  },
] as const;

export const weeklyTrend = [62, 68, 66, 74, 71, 78, 82] as const;

export const productShellMeta = {
  brand: "Pawang Masuk Apoteker",
  tierLabel: "Pro",
  headerEyebrow: "Selamat datang kembali",
  headerTitle: "Kunci ulang blok lemah, lalu gas ke simulasi.",
} as const;
