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
import { FeatureCard } from "../../components/ui/feature-card";
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

        {/* Cards Grid Layout */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 w-full mt-6">
          {STUDY_FEATURES.map((item, index) => {
            if (studentShell.role === "osce_pro" && item.id === "flash-card") {
              return null;
            }
            
            const isAiFeature = item.id === "flash-card" || item.id === "osce-simulator";
            const isLocked = isAiFeature && aiStatus.data && !aiStatus.data.hasCredential;
            
            // Assign some preset colors based on index or ID
            const presetColors: ("blue" | "emerald" | "purple" | "orange" | "rose" | "cyan")[] = ["blue", "purple", "emerald", "orange", "cyan"];
            const preset = presetColors[index % presetColors.length];

            return (
              <FeatureCard
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                href={item.href}
                actionLabel={item.buttonText}
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
