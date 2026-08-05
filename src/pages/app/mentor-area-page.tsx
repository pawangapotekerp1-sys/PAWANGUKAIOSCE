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
} from "lucide-react";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { getButtonStyleProps } from "../../components/ui/button";

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
];

export default function MentorAreaPage() {
  const currentHref = "/app/area-mentor";
  const studentShell = useStudentShell(currentHref);

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Panel Pengajaran
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Area Mentor
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Selesaikan pembuatan soal, kelola rekaman & materi, serta operasional try out untuk membimbing siswa.
            </p>
          </div>
        </div>

        {/* 3-Column Cards Layout */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full">
          {MENTOR_FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 border-border hover:border-primary/40 bg-card rounded-2xl"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shrink-0">
                      <Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-2xl font-extrabold tracking-tight">
                      {item.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 border-t-0 bg-transparent mt-auto">
                  <Link
                    {...getButtonStyleProps({
                      variant: "outline",
                      className:
                        "w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all font-semibold rounded-xl py-2.5",
                    })}
                    to={item.href}
                  >
                    <span className="absolute inset-0" aria-hidden="true" />
                    {item.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
