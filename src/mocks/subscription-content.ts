import type { Icon } from "@phosphor-icons/react";
import {
  ArrowClockwise,
  Bank,
  CheckCircle,
  ClockCountdown,
  FileArrowUp,
  IdentificationBadge,
  SealWarning,
} from "@phosphor-icons/react";
import type { SubscriptionState } from "../lib/preview-session";

export type SubscriptionPreviewState = Extract<
  SubscriptionState,
  "active" | "pending_review" | "rejected" | "expired"
>;

export type SubscriptionPackage = {
  name: string;
  duration: string;
  price: string;
  summary: string;
  highlights: string[];
  emphasis?: "default" | "accent";
};

export type TransferStep = {
  title: string;
  description: string;
  icon: Icon;
};

export type StatusNotice = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  variant: "loading" | "empty" | "error";
  icon: Icon;
};

export const subscriptionPackages: SubscriptionPackage[] = [
  {
    name: "Sprint 14 Hari",
    duration: "Akses dua minggu",
    price: "Rp129.000",
    summary: "Untuk fokus mengejar blok yang masih lemah sebelum simulasi penuh.",
    highlights: [
      "Try out per blok",
      "Review jawaban salah",
      "Analitik dasar untuk prioritas belajar",
    ],
  },
  {
    name: "Pro 30 Hari",
    duration: "Akses satu bulan",
    price: "Rp229.000",
    summary: "Pilihan utama untuk fase latihan intensif menjelang ujian.",
    highlights: [
      "Try out besar 50 soal",
      "Try out per blok dan review",
      "Insight AI opsional untuk membaca pola salah",
    ],
    emphasis: "accent",
  },
] as const;

export const transferSteps: TransferStep[] = [
  {
    title: "Pilih paket yang sesuai",
    description:
      "Mulai dari Sprint 14 Hari atau langsung Pro 30 Hari sesuai ritme belajarmu.",
    icon: IdentificationBadge,
  },
  {
    title: "Transfer sesuai instruksi",
    description:
      "Samakan nominal dan rekening tujuan agar verifikasi lebih cepat.",
    icon: Bank,
  },
  {
    title: "Unggah bukti transfer",
    description:
      "Setelah dikirim, bukti transfer akan kami tinjau sebelum akses aktif.",
    icon: FileArrowUp,
  },
] as const;

export const uploadChecklist = [
  "Pastikan nama pengirim atau bank pengirim masih terbaca.",
  "Nominal transfer terlihat utuh tanpa terpotong.",
  "Jika transfer dilakukan lewat e-wallet, sertakan layar yang memuat waktu transaksi.",
] as const;

export const subscriptionStatuses: Record<SubscriptionPreviewState, StatusNotice> = {
  active: {
    eyebrow: "Akses aktif",
    title: "Akses belajar sudah aktif",
    description:
      "Pembayaran sudah disetujui. Akses belajar sudah terbuka.",
    actionLabel: "Buka dashboard",
    variant: "empty",
    icon: CheckCircle,
  },
  pending_review: {
    eyebrow: "Menunggu verifikasi",
    title: "Bukti transfer sedang ditinjau",
    description:
      "Pembayaran sedang kami cek. Akses aktif setelah verifikasi selesai.",
    actionLabel: "Lihat cara bayar",
    variant: "loading",
    icon: ClockCountdown,
  },
  rejected: {
    eyebrow: "Perlu unggah ulang",
    title: "Bukti transfer perlu diperbaiki",
    description:
      "Unggah ulang bukti yang lebih jelas agar pembayaran bisa kami cek.",
    actionLabel: "Unggah ulang bukti",
    variant: "error",
    icon: SealWarning,
  },
  expired: {
    eyebrow: "Aktifkan akses lagi",
    title: "Akses belum aktif lagi",
    description:
      "Pilih paket baru lalu kirim bukti transfer untuk mengaktifkan akses lagi.",
    actionLabel: "Pilih paket",
    variant: "empty",
    icon: ArrowClockwise,
  },
};
