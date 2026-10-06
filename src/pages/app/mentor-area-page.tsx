import React from "react";
import { Link } from "react-router";
import {
  BookOpen,
  Sparkles,
  Layers,
  CalendarClock,
  Video,
  Presentation,
  ArrowRight,
  Settings2,
  Lock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { FeatureCard } from "../../components/ui/feature-card";
import { getButtonStyleProps } from "../../components/ui/button";
import { getGlobalAiCredentialStatus } from "../../lib/api/global-ai-credential-api";

interface MentorFeatureCard {
  id: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENTOR_FEATURES: MentorFeatureCard[] = [
  {
    id: "bank-soal",
    title: "Bank Soal",
    description: "Kelola database soal kuis & try out farmasi, sunting pertanyaan, opsi jawaban, serta pembahasan.",
    href: "/app/questions",
    buttonText: "Pilih Bank Soal",
    icon: BookOpen,
  },
  {
    id: "event-terjadwal",
    title: "Event Terjadwal",
    description: "Simulasi ujian sebenarnya dengan batasan waktu yang ketat, penjadwalan try out, dan saingan serentak.",
    href: "/scheduled-ops/events",
    buttonText: "Pilih Event Terjadwal",
    icon: CalendarClock,
  },
  {
    id: "kelola-rekaman",
    title: "Kelola Rekaman",
    description: "Tambah, sunting, buat folder, dan atur link Google Drive / YouTube rekaman kelas untuk siswa.",
    href: "/app/rekaman-kelas?mode=manage",
    buttonText: "Pilih Kelola Rekaman",
    icon: Video,
  },
  {
    id: "kelola-materi",
    title: "Kelola Materi",
    description: "Unggah dan kelola modul materi pembelajaran, PDF ringkasan, serta presentasi bahan ajar.",
    href: "/app/materi-ppt?mode=manage",
    buttonText: "Pilih Kelola Materi",
    icon: Presentation,
  },
  {
    id: "penyusun-soal",
    title: "Penyusun Soal",
    description: "Buat draf soal latihan secara otomatis dan efisien menggunakan bantuan AI berbasis referensi farmasi.",
    href: "/app/question-generator",
    buttonText: "Pilih Penyusun Soal",
    icon: Sparkles,
  },
  {
    id: "penyusun-flashcard",
    title: "Penyusun Flash Card",
    description: "Susun & buat deck kartu belajar instan untuk mempermudah metode hafalan cepat indikasi & dosis obat.",
    href: "/app/flash-card-generator",
    buttonText: "Pilih Penyusun Flash Card",
    icon: Layers,
  },
  {
    id: "pengatur-osce",
    title: "Pengatur OSCE",
    description: "Buat dan sesuaikan stase OSCE, atur rubric penilaian, dan siapkan prompt persona AI pasien/dokter.",
    href: "/app/mentor/osce",
    buttonText: "Pilih Pengatur OSCE",
    icon: Settings2,
  },
];

export default function MentorAreaPage() {
  const currentHref = "/app/area-mentor";
  const studentShell = useStudentShell(currentHref);

  const aiStatus = useQuery({
    queryKey: ["global-ai-credential-status"],
    queryFn: () => getGlobalAiCredentialStatus(),
  });

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">

        {/* 3-Column Cards Layout */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
          {MENTOR_FEATURES.map((item, index) => {
            const Icon = item.icon;
            const isAiFeature = item.id === "penyusun-soal" || item.id === "penyusun-flashcard" || item.id === "pengatur-osce";
            const isLocked = isAiFeature && aiStatus.data && !aiStatus.data.hasCredential;
            
            const presetColors: ("blue" | "emerald" | "purple" | "orange" | "rose" | "cyan")[] = ["blue", "purple", "emerald", "orange", "cyan"];
            const preset = presetColors[index % presetColors.length];

            return (
              <FeatureCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                href={isLocked ? "/app/ai-config" : item.href}
                actionLabel={isLocked ? "Atur API Key" : item.buttonText}
                colorPreset={preset}
                isLocked={isLocked}
              />
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
