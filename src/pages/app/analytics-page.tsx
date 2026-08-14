import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import DiagnosisHeroCard from "../../components/diagnosis/diagnosis-hero-card";
import GlobalBehaviorPanel from "../../components/diagnosis/global-behavior-panel";
import DiagnosisRangeControls from "../../components/diagnosis/diagnosis-range-controls";
import SubtopicRankingList from "../../components/diagnosis/subtopic-ranking-list";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import Button from "../../components/ui/button";
import { getPersonalWeaknessDiagnosis, generateStudentAiRangeInsight } from "../../lib/api/analytics-api";
import { getGlobalAiCredentialStatus } from "../../lib/api/global-ai-credential-api";
import { useSession } from "../../lib/auth/use-session";
import {
  createDefaultDiagnosisRange,
  createPresetDiagnosisRange,
  resolveUserTimezone,
  toAppliedDiagnosisRange,
} from "../../lib/diagnosis-date-range";
import { usePreviewRouteState } from "../../lib/preview-route-state";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2, AlertCircle, PackageSearch, BarChart3, Bot, Sparkles, Key } from "lucide-react";

function AnalyticsPage() {
  const { user } = useSession();
  const studentShell = useStudentShell("/app/analytics");
  const analyticsView = usePreviewRouteState("analyticsView");
  const [draftRange, setDraftRange] = useState(createDefaultDiagnosisRange);
  const [appliedRange, setAppliedRange] = useState(createDefaultDiagnosisRange);
  const queryClient = useQueryClient();
  const timezone = resolveUserTimezone();

  if (studentShell.role === "osce_pro") {
    return <Navigate to="/app/scheduled-tryout" replace />;
  }

  const diagnosisQuery = useQuery({
    queryKey: [
      "personal-weakness-diagnosis",
      user?.id,
      appliedRange.dateFrom,
      appliedRange.dateTo,
      timezone,
    ],
    enabled: analyticsView === "ready" && Boolean(user?.id),
    placeholderData: (previous) => previous,
    queryFn: () =>
      getPersonalWeaknessDiagnosis({
        dateFrom: appliedRange.dateFrom,
        dateTo: appliedRange.dateTo,
        timezone,
      }),
  });
  const diagnosis = diagnosisQuery.data;
  const diagnosisMode = diagnosis?.summary.diagnosisMode ?? null;
  const weakestSubtopic = diagnosis?.subtopicRankings[0] ?? null;
  const canApplyCustomRange = toAppliedDiagnosisRange(draftRange) !== null;

  const aiCredentialQuery = useQuery({
    queryKey: ["global-ai-credential-status"],
    queryFn: () => getGlobalAiCredentialStatus(),
    enabled: analyticsView === "ready" && diagnosisMode === "full",
  });

  const aiInsightQuery = useQuery({
    queryKey: [
      "student-ai-range-insight",
      user?.id,
      appliedRange.dateFrom,
      appliedRange.dateTo,
      timezone,
    ],
    queryFn: () => generateStudentAiRangeInsight({
      dateFrom: appliedRange.dateFrom,
      dateTo: appliedRange.dateTo,
      timezone,
    }),
    enabled: false, // Only run when triggered
  });

  function handlePresetSelect(preset: "7d" | "14d" | "30d") {
    const nextRange = createPresetDiagnosisRange(preset);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  }

  function handleApplyCustomRange() {
    const nextRange = toAppliedDiagnosisRange(draftRange);

    if (!nextRange) {
      return;
    }

    setAppliedRange(nextRange);
  }

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Analisis Performa
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Area yang Perlu Diperbaiki
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Lihat topik dan materi yang paling sering menahan peningkatan skormu pada rentang waktu ini.
            </p>
          </div>
        </div>

        <DiagnosisRangeControls
          appliedRange={appliedRange}
          canApplyCustomRange={canApplyCustomRange}
          draftRange={draftRange}
          isApplying={diagnosisQuery.isFetching && !diagnosisQuery.isLoading}
          onApplyCustomRange={handleApplyCustomRange}
          onDraftChange={setDraftRange}
          onSelectPreset={handlePresetSelect}
        />

        {analyticsView === "loading" || (analyticsView === "ready" && diagnosisQuery.isLoading) ? (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <div>
               <h3 className="text-lg font-semibold text-foreground">Analisis sedang dimuat</h3>
               <p className="text-sm">Data analisis sedang disiapkan.</p>
             </div>
             <div className="mt-2">
                <Link
                  {...getButtonStyleProps({
                    variant: "primary",
                  })}
                  to="/app/tryout/result"
                >
                  Buka hasil terakhir
                </Link>
             </div>
          </div>
        ) : analyticsView === "error" || (analyticsView === "ready" && diagnosisQuery.isError) ? (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analisis belum bisa dimuat</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">Coba buka review dulu.</p>
              <Link
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                to="/app/review"
              >
                Buka review
              </Link>
            </AlertDescription>
          </Alert>
        ) : analyticsView === "empty" || diagnosisMode === "empty" ? (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
            <PackageSearch className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Belum ada data untuk rentang ini</h3>
              <p className="text-sm">Belum ada try out besar di rentang ini.</p>
            </div>
            <div className="mt-2">
              <Link
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                to="/app/tryout-selection"
              >
                Mulai try out besar
              </Link>
            </div>
          </div>
        ) : diagnosisMode === "basic" && diagnosis ? (
          <>
            <Card className="mt-6">
              <CardHeader>
                 <CardTitle className="text-2xl font-semibold text-foreground">Ringkasan awal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">
                  Baru ada {diagnosis.summary.eligibleAttemptCount} try out besar pada rentang ini.
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Akurasi saat ini {diagnosis.summary.overallAccuracy}% dari{" "}
                  {diagnosis.summary.overallQuestionCount} soal.
                </p>
              </CardContent>
            </Card>

            <GlobalBehaviorPanel
              patterns={diagnosis.basicSummary?.globalBehaviorPatterns ?? diagnosis.globalBehaviorPatterns}
            />

            <Card className="mt-6 border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                 <CardTitle className="text-2xl font-semibold text-foreground">Analisis lengkap belum tersedia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">
                  {diagnosis.basicSummary?.message ?? diagnosis.narrative.nextReadiness}
                </p>
              </CardContent>
            </Card>
          </>
        ) : diagnosisMode === "full" && diagnosis && weakestSubtopic ? (
          <>
            <DiagnosisHeroCard
              behaviorPatterns={diagnosis.globalBehaviorPatterns}
              narrative={diagnosis.narrative}
              weakestSubtopic={weakestSubtopic}
            />

            <GlobalBehaviorPanel
              title="Pola yang paling sering muncul"
              patterns={diagnosis.globalBehaviorPatterns}
            />

            <SubtopicRankingList rankings={diagnosis.subtopicRankings} />

            <Card className="mt-8 border-primary/20 bg-primary/5 shadow-md overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="pb-3">
                 <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                   <Sparkles className="h-5 w-5 text-primary" />
                   Analisis Mendalam AI
                 </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiCredentialQuery.data?.hasCredential ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Key className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold mb-2">Kredensial AI Belum Diatur</h4>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                      Fitur analisis cerdas menggunakan sistem Bring Your Own Key (BYOK). Silakan atur API Key Gemini Anda di Pengaturan AI Global untuk mengaktifkan fitur ini.
                    </p>
                    <Link
                      {...getButtonStyleProps({ variant: "primary" })}
                      to="/app/settings/ai-config"
                    >
                      Buka Pengaturan AI
                    </Link>
                  </div>
                ) : !aiInsightQuery.data && !aiInsightQuery.isFetching && !aiInsightQuery.isError ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                      Dapatkan rangkuman kelemahan yang lebih spesifik dan saran strategi belajar dari asisten AI cerdas berdasarkan {diagnosis.summary.eligibleAttemptCount} try out Anda.
                    </p>
                    <Button 
                      onClick={() => aiInsightQuery.refetch()}
                      className="font-semibold"
                    >
                      Buat Analisis AI
                    </Button>
                  </div>
                ) : aiInsightQuery.isFetching ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">AI sedang menganalisis data try out Anda...</p>
                  </div>
                ) : aiInsightQuery.isError ? (
                  <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Gagal memuat analisis AI</AlertTitle>
                    <AlertDescription className="mt-1 flex flex-col items-start gap-3">
                      <span>{aiInsightQuery.error instanceof Error ? aiInsightQuery.error.message : "Terjadi kesalahan saat memproses data dengan AI."}</span>
                      <Button variant="outline" size="sm" onClick={() => aiInsightQuery.refetch()}>
                        Coba Lagi
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {aiInsightQuery.data?.summary}
                    </div>
                    <div className="text-[11px] font-mono font-medium text-muted-foreground/60 uppercase tracking-wide flex items-center justify-between border-t border-border/50 pt-4 mt-6">
                      <span>Model: Gemini 3.6 Flash</span>
                      <span>Digenerasi: {new Date(aiInsightQuery.data?.generatedAt ?? "").toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="mt-6">
            <CardHeader>
               <CardTitle className="text-2xl font-semibold text-foreground">Analisis untuk rentang ini siap dipakai.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                Periode aktif {appliedRange.dateFrom} sampai {appliedRange.dateTo} di zona waktu {timezone}.
              </p>
              {diagnosis ? (
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Mode analisis saat ini: {diagnosis.summary.diagnosisMode}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </ProductShell>
  );
}

export default AnalyticsPage;
