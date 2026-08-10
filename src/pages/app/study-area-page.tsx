import React from "react";
import { Link } from "react-router";
import {
  Video,
  Presentation,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Lock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { getButtonStyleProps } from "../../components/ui/button";
import { getGlobalAiCredentialStatus } from "../../lib/api/global-ai-credential-api";

interface StudyFeatureCard {
  id: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STUDY_FEATURES: StudyFeatureCard[] = [
  {
    id: "rekaman",
    title: "Rekaman",
    description: "Akses seluruh rekaman kelas dan video pembelajaran interaktif yang telah disediakan.",
    href: "/app/rekaman-kelas?mode=student",
    buttonText: "Pilih Rekaman",
    icon: Video,
  },
  {
    id: "materi",
    title: "Materi",
    description: "Pelajari modul materi pembelajaran, PDF ringkasan, dan presentasi pembahasan.",
    href: "/app/materi-ppt?mode=student",
    buttonText: "Pilih Materi",
    icon: Presentation,
  },
  {
    id: "flash-card",
    title: "Flash Card",
    description: "Ulang dan kuasai poin-poin penting indikasi, dosis, dan resep obat dengan kartu belajar singkat.",
    href: "/app/flash-cards",
    buttonText: "Pilih Flash Card",
    icon: Sparkles,
  },
  {
    id: "osce-simulator",
    title: "Simulasi OSCE",
    description: "Latih kemampuan komunikasi klinis dan peracikan obat melalui simulasi kasus interaktif bersama AI.",
    href: "/app/osce-demo",
    buttonText: "Mulai Simulasi OSCE",
    icon: Stethoscope,
  },
];

export default function StudyAreaPage() {
  const currentHref = "/app/area-belajar";
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
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Pusat Materi
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Area Belajar
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Selesaikan materi pembelajaran, pemahaman konsep, dan kartu belajar untuk memperkuat dasar kefarmasianmu.
            </p>
          </div>
        </div>

        {/* Cards Grid Layout */}
        <div className="grid gap-6 md:grid-cols-3 w-full">
          {STUDY_FEATURES.map((item) => {
            if (studentShell.role === "osce_pro" && item.id === "flash-card") {
              return null;
            }
            const Icon = item.icon;
            const isAiFeature = item.id === "flash-card" || item.id === "osce-simulator";
            const isLocked = isAiFeature && aiStatus.data && !aiStatus.data.hasCredential;

            return (
              <Card
                key={item.id}
                className={`group relative flex flex-col justify-between overflow-hidden transition-all duration-300 border-border bg-card rounded-2xl ${
                  isLocked ? "opacity-70 grayscale-[0.3]" : "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40"
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shrink-0 transition-colors ${
                      isLocked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    }`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-2xl font-extrabold tracking-tight">
                      {item.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </CardDescription>
                  {isLocked && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      <Lock className="h-4 w-4" />
                      Butuh Pengaturan API Key (BYOK)
                    </div>
                  )}
                </CardHeader>
                <CardFooter className="pt-4 border-t-0 bg-transparent mt-auto relative">
                  {isLocked ? (
                    <div
                      {...getButtonStyleProps({
                        variant: "outline",
                        className: "w-full font-semibold rounded-xl py-2.5 opacity-50 cursor-not-allowed",
                      })}
                    >
                      {item.buttonText} <Lock className="ml-2 h-4 w-4" />
                    </div>
                  ) : (
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
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
