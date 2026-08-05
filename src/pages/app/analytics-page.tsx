import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import DiagnosisHeroCard from "../../components/diagnosis/diagnosis-hero-card";
import GlobalBehaviorPanel from "../../components/diagnosis/global-behavior-panel";
import DiagnosisRangeControls from "../../components/diagnosis/diagnosis-range-controls";
import SubtopicRankingList from "../../components/diagnosis/subtopic-ranking-list";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import { getPersonalWeaknessDiagnosis } from "../../lib/api/analytics-api";
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
import { Loader2, AlertCircle, PackageSearch, BarChart3 } from "lucide-react";

function AnalyticsPage() {
  const { user } = useSession();
  const studentShell = useStudentShell("/app/analytics");
  const analyticsView = usePreviewRouteState("analyticsView");
  const [draftRange, setDraftRange] = useState(createDefaultDiagnosisRange);
  const [appliedRange, setAppliedRange] = useState(createDefaultDiagnosisRange);
  const timezone = resolveUserTimezone();
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
