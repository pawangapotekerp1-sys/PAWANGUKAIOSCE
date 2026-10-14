import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Timer,
  Loader2,
  AlertTriangle,
  Package,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import SectionHeading from "../../components/ui/section-heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useSession } from "../../lib/auth/use-session";
import {
  findLatestSubmittedAttemptId,
  getAttemptResultPageData,
} from "../../lib/api/tryout-api";
import { formatDurationAsClock } from "../../lib/mappers/tryout-mappers";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { cn } from "../../lib/utils";

function TryoutResultPage() {
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/tryout");
  const attemptId = searchParams.get("attempt");

  const latestAttemptQuery = useQuery({
    queryKey: ["latest-submitted-attempt", user?.id],
    enabled: !attemptId && Boolean(user?.id),
    queryFn: () => findLatestSubmittedAttemptId({ userId: user!.id }),
  });

  const resolvedAttemptId = attemptId ?? latestAttemptQuery.data ?? null;
  const resultQuery = useQuery({
    queryKey: ["tryout-result", resolvedAttemptId],
    enabled: Boolean(resolvedAttemptId),
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: () => getAttemptResultPageData({ attemptId: resolvedAttemptId! }),
  });

  const resultData = resultQuery.data;
  const totalQuestions = resultData
    ? resultData.correctAnswers +
      resultData.wrongAnswers +
      resultData.unansweredCount
    : 0;
  const totalAnswered = resultData
    ? resultData.correctAnswers + resultData.wrongAnswers
    : 0;

  const weakestWrongCount =
    resultData && resultData.blocks.length > 0
      ? Math.max(...resultData.blocks.map((b) => b.wrong))
      : null;
  const weakestBlocks =
    resultData && weakestWrongCount !== null
      ? resultData.blocks.filter((b) => b.wrong === weakestWrongCount)
      : [];

  let weakestBlockInsight = "Review jawaban yang masih salah lebih dulu.";
  if (weakestWrongCount === 0) {
    weakestBlockInsight =
      "Semua jawaban sudah tepat. Lanjut review untuk mengunci strategi ini.";
  } else if (
    weakestWrongCount !== null &&
    weakestWrongCount > 0 &&
    weakestBlocks.length === 1
  ) {
    weakestBlockInsight = `Review jawaban ${weakestBlocks[0].blockLabel} yang masih salah lebih dulu.`;
  }

  const isPassed = resultData ? Math.round(resultData.score) >= 68 : false;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <section id="tryout" className="space-y-8">
        <div className="flex flex-col gap-4">
          <Link
            data-testid="btn-back-to-tryout"
            to="/app/tryout-selection"
            {...getButtonStyleProps({
              variant: "ghost",
              size: "sm",
              className: "w-fit -ml-2 text-muted-foreground hover:text-foreground",
            })}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Pilihan Try Out
          </Link>
          <SectionHeading
            title="Hasil try out"
            description="Skor akhir, hasil per blok, dan akses pembahasan."
          />
        </div>

        {latestAttemptQuery.isLoading || resultQuery.isLoading ? (
          <Card className="border-dashed shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <CardTitle>Menyiapkan hasil...</CardTitle>
                <CardDescription>Mohon tunggu sebentar.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : latestAttemptQuery.isError || resultQuery.isError ? (
          <Card className="border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle className="text-destructive">
                  Gagal memuat hasil
                </CardTitle>
                <CardDescription>Coba muat ulang halaman.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : !resolvedAttemptId || !resultData ? (
          <Card className="border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-row items-center gap-4">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Belum ada hasil</CardTitle>
                <CardDescription>
                  Belum ada hasil try out untuk ditampilkan.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* 1. Hero Performance Card */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2">
                {isPassed ? (
                  <Badge
                    variant="outline"
                    className="w-fit flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Memenuhi Standar Kelulusan (Target ≥ 68)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="w-fit flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Belum Mencapai Target (Target ≥ 68)
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-foreground">
                      {Math.round(resultData.score)}
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      / 100
                    </span>
                  </div>
                  <p className="text-base text-muted-foreground sm:border-l sm:border-border sm:pl-4">
                    {resultData.correctAnswers} dari {totalQuestions} soal terjawab benar pada sesi ini.
                  </p>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-foreground">
                  <p>{weakestBlockInsight}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    {...getButtonStyleProps({
                      variant: "primary",
                      className: "font-semibold shadow-sm",
                    })}
                    to={`/app/review/${resultData.attemptId}`}
                  >
                    Review jawaban <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                  <Link
                    {...getButtonStyleProps({
                      variant: "outline",
                      className: "font-semibold",
                    })}
                    to="/app/tryout-selection"
                  >
                    Coba Try Out Baru
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 2. 4-Metric Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Jawaban Benar
                    </CardDescription>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {resultData.correctAnswers}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalQuestions > 0
                      ? `${Math.round((resultData.correctAnswers / totalQuestions) * 100)}% dari total`
                      : "0%"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Jawaban Salah
                    </CardDescription>
                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {resultData.wrongAnswers}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalQuestions > 0
                      ? `${Math.round((resultData.wrongAnswers / totalQuestions) * 100)}% dari total`
                      : "0%"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tidak Dijawab
                    </CardDescription>
                    <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {resultData.unansweredCount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalQuestions > 0
                      ? `${Math.round((resultData.unansweredCount / totalQuestions) * 100)}% dari total`
                      : "0%"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-2xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Waktu Terpakai
                    </CardDescription>
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {formatDurationAsClock(resultData.timeUsedSeconds)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rata-rata ~{totalAnswered > 0 ? Math.round(resultData.timeUsedSeconds / totalAnswered) : 0} dtk / soal
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 3. Block Performance Analysis */}
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg font-bold text-foreground">
                    Analisis Performa Per Blok
                  </CardTitle>
                </div>
                <CardDescription>
                  Tingkat penguasaan materi dan akurasi jawaban per bidang keilmuan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resultData.blocks.length > 0 ? (
                  <div className="space-y-4">
                    {resultData.blocks.map((item) => {
                      const totalInBlock = item.correct + item.wrong;
                      const accuracy =
                        totalInBlock > 0
                          ? Math.round((item.correct / totalInBlock) * 100)
                          : 0;
                      const correctWidth =
                        totalInBlock > 0
                          ? (item.correct / totalInBlock) * 100
                          : 0;
                      const wrongWidth =
                        totalInBlock > 0
                          ? (item.wrong / totalInBlock) * 100
                          : 0;

                      let masteryLabel = "Perlu Latihan";
                      let masteryBadgeClass =
                        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
                      if (accuracy >= 75) {
                        masteryLabel = "Kuasai Baik";
                        masteryBadgeClass =
                          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
                      } else if (accuracy >= 50) {
                        masteryLabel = "Cukup";
                        masteryBadgeClass =
                          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
                      }

                      return (
                        <div
                          key={item.blockLabel}
                          className="rounded-xl border border-border/70 bg-muted/20 p-4 transition-all duration-200 hover:bg-muted/40"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground text-sm sm:text-base">
                                  {item.blockLabel}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs font-medium", masteryBadgeClass)}
                                >
                                  {masteryLabel}
                                </Badge>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground font-medium"
                              >
                                {totalInBlock} soal
                              </Badge>
                            </div>

                            {/* Progress bar */}
                            <div
                              className="h-2 w-full overflow-hidden rounded-full bg-muted flex"
                              role="progressbar"
                              aria-valuenow={accuracy}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className="bg-emerald-500 transition-all duration-300"
                                style={{ width: `${correctWidth}%` }}
                              />
                              <div
                                className="bg-rose-500 transition-all duration-300"
                                style={{ width: `${wrongWidth}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {item.correct} benar, {item.wrong} salah
                              </span>
                              <span className="font-semibold text-foreground">
                                {accuracy}% akurasi
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Distribusi hasil belum tersedia.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </ProductShell>
  );
}

export default TryoutResultPage;
