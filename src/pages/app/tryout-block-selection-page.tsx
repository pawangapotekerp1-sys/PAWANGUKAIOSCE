import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  Scale,
  Stethoscope,
  Layers,
  BookOpen,
  AlertCircle,
  Infinity as InfinityIcon
} from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button, getButtonStyleProps } from "../../components/ui/button";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { listTryoutCatalogEntries } from "../../lib/api/tryout-api";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

const getBlockVisuals = (blockId: string | null, blockName: string | null, mode?: string) => {
  if (mode === "full") {
    return {
      icon: InfinityIcon,
      accentBg: "bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 text-fuchsia-600 dark:text-fuchsia-400",
      badgeBg: "bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20",
      proportionLabel: "Komprehensif",
      subtitle: "Seluruh Materi Blok",
    };
  }

  const name = (blockName || "").toLowerCase();
  const id = (blockId || "").toLowerCase();
  
  if (name.includes("clinical") || name.includes("klinis") || id.includes("cs")) {
    return {
      icon: Stethoscope,
      accentBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
      badgeBg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
      proportionLabel: "50% Proporsi UKAI",
      subtitle: "Klinis & Terapetika",
    };
  }
  
  if (name.includes("pharmaceutical") || name.includes("teknologi") || id.includes("ps")) {
    return {
      icon: FlaskConical,
      accentBg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      badgeBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
      proportionLabel: "35% Proporsi UKAI",
      subtitle: "Teknologi & Formulasi",
    };
  }
  
  if (name.includes("social") || name.includes("sba") || name.includes("regulasi") || id.includes("sba")) {
    return {
      icon: Scale,
      accentBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      proportionLabel: "15% Proporsi UKAI",
      subtitle: "Regulasi & Manajemen",
    };
  }
  
  return {
    icon: Layers,
    accentBg: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
    badgeBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    proportionLabel: "Proporsi UKAI",
    subtitle: "Materi Khusus",
  };
};

function TryoutBlockSelectionPage() {
  const studentShell = useStudentShell("/app/tryout-selection");

  const { data: catalogEntries, isLoading, error } = useQuery({
    queryKey: ["tryout-catalog"],
    queryFn: () => listTryoutCatalogEntries(),
  });

  const blockOptions = (catalogEntries || []).filter((entry) => entry.mode === "block" || entry.mode === "full");

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
            <div className="flex items-center gap-2 mb-3">
              <Link
                to="/app/tryout-selection"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-2xs group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Kembali ke Mode Try Out</span>
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Latihan Try Out Per Blok
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Fokuskan penguasaan materi pada salah satu dari kelompok besar bidang kompetensi kefarmasian.
            </p>
          </div>
        </div>

        {error ? (
          <div className="w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal Memuat Data</AlertTitle>
              <AlertDescription>
                Terjadi kesalahan saat memuat pilihan blok try out. Silakan coba beberapa saat lagi.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="group relative flex flex-col justify-between overflow-hidden border-border bg-card">
                  <CardHeader className="pt-8 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted animate-pulse" />
                      <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="h-7 w-3/4 bg-muted rounded animate-pulse mt-2" />
                    <div className="h-5 w-1/2 bg-muted rounded animate-pulse mt-3" />
                    <div className="space-y-2 mt-5">
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                      <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 pb-6 flex flex-col gap-2.5">
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse mt-1" />
                  </CardContent>
                </Card>
              ))
            ) : blockOptions.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                Belum ada data blok try out yang tersedia.
              </div>
            ) : (
              blockOptions.map((block) => {
                const visuals = getBlockVisuals(block.blockId, block.blockName, block.mode);
                const Icon = visuals.icon;
                const buttonText = block.mode === "full" ? "Mulai Try Out Besar" : "Mulai Try Out Blok Ini";
                
                return (
                  <Card
                    key={block.id}
                    className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 border-border hover:border-primary/40 bg-card"
                  >
                    <CardHeader className="pt-8 pb-4">
                      <div className="flex items-center mb-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${visuals.accentBg} transition-transform group-hover:scale-105`}>
                          <Icon className="h-7 w-7" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {block.title}
                      </CardTitle>
                      <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                        {visuals.subtitle}
                      </CardDescription>
                      <p className="text-sm text-muted-foreground/90 mt-3 leading-relaxed">
                        {block.description}
                      </p>
                    </CardHeader>
    
                    <CardContent className="pt-4 pb-6 flex flex-col gap-2.5">
                      {block.isStartable ? (
                        <Link
                          {...getButtonStyleProps({
                            variant: "primary",
                            className: "w-full justify-center shadow-sm font-bold",
                          })}
                          to={`/app/tryout/session?template=${block.sessionTemplateId}`}
                        >
                          {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      ) : (
                        <div className="flex flex-col gap-1 w-full text-center">
                          <Button
                            variant="primary"
                            className="w-full justify-center shadow-sm font-bold"
                            disabled
                          >
                            {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          {block.disabledReason && (
                            <span className="text-xs text-destructive leading-tight px-1">
                              {block.disabledReason}
                            </span>
                          )}
                        </div>
                      )}
    
                      {block.blockId && (
                        <Link
                          {...getButtonStyleProps({
                            variant: "outline",
                            className: "w-full justify-center text-xs font-semibold text-muted-foreground hover:text-foreground",
                          })}
                          to={`/app/tryout/topics?block=${block.blockId}`}
                        >
                          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                          Pilih per Materi
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </ProductShell>
  );
}

export default TryoutBlockSelectionPage;
