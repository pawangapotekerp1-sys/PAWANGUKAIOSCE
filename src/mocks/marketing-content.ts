import type { Icon } from "@phosphor-icons/react";
import {
  Brain,
  ChartLineUp,
  ClockCountdown,
  Exam,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";

export type MarketingFeatureId = "tryout" | "analytics" | "ai";

export type MarketingFeature = {
  id: MarketingFeatureId;
  icon: Icon;
  title: string;
  summary: string;
  detail: string;
};

export type SimulationStep = {
  icon: Icon;
  title: string;
  description: string;
  accent: string;
};

export type PricingPreview = {
  name: string;
  tagline: string;
  price: string;
  cadence: string;
  highlights: string[];
  emphasis?: "default" | "accent";
};

export const heroMetrics = [
  {
    label: "Format ujian",
    value: "Simulasi bertimer",
  },
  {
    label: "Fokus belajar",
    value: "Blok lemah lebih dulu",
  },
  {
    label: "Pendampingan",
    value: "Insight AI opsional",
  },
] as const;

export const marketingFeatures: MarketingFeature[] = [
  {
    id: "tryout",
    icon: Exam,
    title: "Simulasi penuh dan try out per blok",
    summary: "Latihan dimulai dari format yang paling dekat dengan ujian profesi apoteker.",
    detail:
      "Kerjakan sesi besar untuk membaca stamina, lalu turun ke try out per blok saat butuh mengunci topik tertentu.",
  },
  {
    id: "analytics",
    icon: ChartLineUp,
    title: "Analitik area lemah yang langsung bisa dipakai belajar",
    summary: "Setelah sesi selesai, kamu langsung tahu blok mana yang menahan skor.",
    detail:
      "Skor, tren, dan prioritas review disusun agar waktu belajar habis di materi yang paling menentukan kelulusan.",
  },
  {
    id: "ai",
    icon: Brain,
    title: "Insight AI opsional untuk membaca pola salah",
    summary: "Bukan pengganti latihan, tetapi lapisan bantu saat kamu ingin membaca pola kesalahan lebih cepat.",
    detail:
      "Gunakan saat perlu ringkasan miskonsepsi, saran urutan review, atau pembahasan kenapa pola jawabanmu terus turun di blok tertentu.",
  },
];

export const simulationSteps: SimulationStep[] = [
  {
    icon: ClockCountdown,
    title: "Mulai dari ritme yang terasa seperti ujian asli",
    description:
      "Timer, komposisi soal, dan alur pengerjaan dibuat untuk melatih keputusan saat tekanan mulai naik.",
    accent: "01",
  },
  {
    icon: ShieldCheck,
    title: "Baca ulang hasil dengan analitik yang tidak berputar-putar",
    description:
      "Setelah simulasi, platform merangkum bagian yang paling sering menurunkan skor dan menyambungkannya ke blok belajar berikutnya.",
    accent: "02",
  },
  {
    icon: Sparkle,
    title: "Tambahkan AI hanya ketika butuh sudut pandang kedua",
    description:
      "AI hadir sebagai opsional, supaya keputusan belajar tetap bertumpu pada hasil try out yang benar-benar kamu kerjakan.",
    accent: "03",
  },
] as const;

export const pricingPreview: PricingPreview[] = [
  {
    name: "Pemanasan 7 Hari",
    tagline: "Mulai dari akses mingguan untuk pemanasan",
    price: "Rp79.000",
    cadence: "/7 hari",
    highlights: [
      "Akses try out per blok",
      "Analitik dasar hasil latihan",
      "Cocok untuk mengukur titik awal",
    ],
  },
  {
    name: "Pro 30 Hari",
    tagline: "Untuk fase serius sebelum pendaftaran ujian",
    price: "Rp229.000",
    cadence: "/30 hari",
    highlights: [
      "Simulasi penuh dan try out per blok",
      "Analitik progres dan prioritas review",
      "Insight AI opsional untuk pola salah",
    ],
    emphasis: "accent",
  },
] as const;

export const homepageCopy = {
  brand: "Pawang Apoteker",
  heroTitle: "Lolos ujian profesi apoteker dengan latihan yang terasa seperti hari H",
  heroDescription:
    "Pawang Apoteker membantu mahasiswa dan lulusan baru farmasi membangun ritme try out sebelum menghadapi ujian profesi apoteker.",
  heroLead:
    "Fokusnya bukan sekadar banyak soal, tetapi simulasi, pembacaan area lemah, dan keputusan belajar yang lebih tenang dari sesi ke sesi.",
  heroPrimaryCta: "Mulai perjalanan try out",
  heroSecondaryCta: "Lihat alur belajar",
  featureHeading:
    "Try out, analitik, dan insight AI yang tetap berpijak pada hasil simulasi",
  featureDescription:
    "Setiap bagian dirancang untuk membantu kamu bergerak dari latihan, ke pembacaan pola salah, lalu ke agenda review yang lebih tajam.",
  simulationHeading: "Belajar dimulai dari simulasi, bukan dari tebakan belajar",
  simulationDescription:
    "Platform ini disusun dengan alur yang sama seperti cara peserta serius menyiapkan ujian: kerjakan, ukur, baca pola, lalu ulang dengan target yang lebih sempit.",
  pricingHeading: "Pilih ritme belajar sebelum masuk paket penuh",
  pricingDescription:
    "Mulai dari pemanasan singkat atau langsung masuk paket 30 hari saat persiapanmu sudah padat.",
  footerNote:
    "Serius untuk persiapan ujian profesi apoteker. Ringkas saat dipakai setiap hari.",
} as const;
