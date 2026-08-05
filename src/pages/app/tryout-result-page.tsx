import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, Timer, Loader2, AlertTriangle, Package } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import SectionHeading from "../../components/ui/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useSession } from "../../lib/auth/use-session";
import { findLatestSubmittedAttemptId, getAttemptResultPageData } from "../../lib/api/tryout-api";
import { formatDurationAsClock } from "../../lib/mappers/tryout-mappers";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

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
    queryFn: () => getAttemptResultPageData({ attemptId: resolvedAttemptId! }),
  });
  
  const resultData = resultQuery.data;
  const totalQuestions = resultData ? resultData.correctAnswers + resultData.wrongAnswers + resultData.unansweredCount : 0;
  
  const weakestWrongCount = resultData && resultData.blocks.length > 0 ? Math.max(...resultData.blocks.map(b => b.wrong)) : null;
  const weakestBlocks = resultData && weakestWrongCount !== null ? resultData.blocks.filter(b => b.wrong === weakestWrongCount) : [];
  
  let weakestBlockInsight = "Review jawaban yang masih salah lebih dulu.";
  if (weakestWrongCount === 0) weakestBlockInsight = "Semua jawaban sudah tepat. Lanjut review untuk mengunci strategi ini.";
  else if (weakestWrongCount !== null && weakestWrongCount > 0 && weakestBlocks.length === 1) weakestBlockInsight = `Review jawaban ${weakestBlocks[0].blockLabel} yang masih salah lebih dulu.`;

  return (
    <ProductShell brand={productShellMeta.brand} tierLabel={studentShell.tierLabel} navItems={studentShell.navItems}>
      <section id="tryout">
        <SectionHeading title="Hasil try out" description="Skor akhir, hasil per blok, dan akses pembahasan." />

        {latestAttemptQuery.isLoading || resultQuery.isLoading ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div><CardTitle>Menyiapkan hasil...</CardTitle><CardDescription>Mohon tunggu sebentar.</CardDescription></div>
            </CardHeader>
          </Card>
        ) : latestAttemptQuery.isError || resultQuery.isError ? (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div><CardTitle className="text-destructive">Gagal memuat hasil</CardTitle><CardDescription>Coba muat ulang halaman.</CardDescription></div>
            </CardHeader>
          </Card>
        ) : !resolvedAttemptId || !resultData ? (
          <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-row items-center gap-4">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div><CardTitle>Belum ada hasil</CardTitle><CardDescription>Belum ada hasil try out untuk ditampilkan.</CardDescription></div>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl shadow-primary/20 border-primary/20">
              <CardHeader>
                <Badge variant="secondary" className="w-fit flex items-center gap-1 bg-white/20 text-white border-transparent">
                  <CheckCircle className="w-4 h-4" /> Sesi selesai
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-7xl font-bold tracking-tighter text-white">{Math.round(resultData.score)}</span>
                  <span className="pb-2 text-sm font-semibold uppercase tracking-wider text-white/70">Skor Akhir</span>
                </div>
                <p className="text-lg text-white/90 mb-2">
                  {resultData.correctAnswers} dari {totalQuestions} soal terjawab benar pada sesi ini.
                </p>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/20 mb-8">
                  <p className="text-sm font-medium text-white">{weakestBlockInsight}</p>
                </div>
                <Link {...getButtonStyleProps({ className: "bg-white text-primary hover:bg-white/90" })} to={`/app/review/${resultData.attemptId}`}>
                  Review jawaban <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </CardContent>
            </Card>

            <div className="grid gap-6 content-start">
              <div className="grid gap-6 sm:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase tracking-wider font-semibold text-primary">Jawaban Benar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{resultData.correctAnswers}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase tracking-wider font-semibold text-primary">Waktu Terpakai</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{formatDurationAsClock(resultData.timeUsedSeconds)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary mb-2">
                    <Timer className="w-4 h-4" /> Distribusi Hasil
                  </div>
                </CardHeader>
                <CardContent>
                  {resultData.blocks.length > 0 ? (
                    <div className="space-y-4">
                      {resultData.blocks.map((item) => (
                        <div key={item.blockLabel} className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                          <div>
                            <p className="font-semibold">{item.blockLabel}</p>
                            <p className="text-sm text-muted-foreground">{item.correct} benar, {item.wrong} salah</p>
                          </div>
                          <Badge variant={item.wrong > item.correct ? "destructive" : "secondary"} className={item.wrong <= item.correct ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                            {item.correct + item.wrong} soal
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Distribusi hasil belum tersedia.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </section>
    </ProductShell>
  );
}
export default TryoutResultPage;
