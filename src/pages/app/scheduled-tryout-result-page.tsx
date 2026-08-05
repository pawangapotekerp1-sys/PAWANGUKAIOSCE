import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle, Loader2, Timer } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import SectionHeading from "../../components/ui/section-heading";
import { useStudentShell } from "./use-student-shell";
import { useSession } from "../../lib/auth/use-session";
import { getScheduledAttemptResultPageData } from "../../lib/api/scheduled-tryout-api";
import { formatScheduledDurationAsClock } from "../../lib/mappers/scheduled-tryout-mappers";
import { productShellMeta } from "../../mocks/student-dashboard";

function ScheduledTryoutResultPage() {
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/scheduled-tryout");
  const attemptId = searchParams.get("attempt");
  const resultQuery = useQuery({
    queryKey: ["scheduled-tryout-result", user?.id, attemptId],
    enabled: Boolean(attemptId),
    queryFn: () =>
      getScheduledAttemptResultPageData({
        attemptId: attemptId!,
      }),
  });
  const resultData = resultQuery.data;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <section id="scheduled-tryout-result">
        <SectionHeading
          title="Hasil sesi terjadwal"
          description="Skor akhir, hasil per blok, dan pembahasan setelah sesi selesai."
          eyebrow="Hasil akhir"
        />

        {!attemptId ? (
          <Alert className="mt-6 border-dashed">
            <AlertTitle>Belum ada hasil sesi terjadwal</AlertTitle>
            <AlertDescription>Pilih hasil dari riwayat untuk melihat detail.</AlertDescription>
          </Alert>
        ) : resultQuery.isLoading ? (
          <div className="mt-6 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Hasil sesi sedang dimuat</h3>
              <p>Hasil sesi sedang disiapkan.</p>
            </div>
          </div>
        ) : resultQuery.isError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hasil sesi belum bisa dimuat</AlertTitle>
            <AlertDescription>Coba buka lagi event ini atau cek riwayat terbaru.</AlertDescription>
          </Alert>
        ) : !resultData ? (
          <Alert className="mt-6 border-dashed">
            <AlertTitle>Belum ada hasil sesi terjadwal</AlertTitle>
            <AlertDescription>Belum ada hasil untuk sesi ini.</AlertDescription>
          </Alert>
        ) : (
          <div className="mt-6 grid gap-4">
            <Card className="p-5 bg-accent text-accent-foreground">
              <Badge variant="secondary" className="w-fit flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Event selesai
              </Badge>
              <p className="mt-5 text-6xl font-semibold tracking-tight text-primary">
                {Math.round(resultData.score)}
              </p>
              <p className="mt-4 text-xl font-semibold leading-tight text-foreground">
                Hasil tryout sudah siap ditinjau
              </p>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                Kamu menutup event ini dengan {resultData.correctAnswers} jawaban benar dan skor akhir{" "}
                {Math.round(resultData.score)}.
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                Tinjau jawaban untuk melihat bagian yang perlu diperbaiki.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  {...getButtonStyleProps({
                    variant: "primary",
                  })}
                  to={`/app/review/${resultData.attemptId}?source=scheduled`}
                >
                  <span className="flex items-center gap-2">
                    Review jawaban
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
              <div className="grid gap-4">
                <Card className="p-5 bg-accent text-accent-foreground">
                  <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Jawaban benar
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {resultData.correctAnswers}
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Waktu terpakai
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {formatScheduledDurationAsClock(resultData.timeUsedSeconds)}
                  </p>
                </Card>
              </div>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Timer className="h-4 w-4" />
                  Distribusi hasil
                </div>
                <div className="mt-5 space-y-3">
                  {resultData.blocks.map((item) => (
                    <div
                      key={item.blockLabel}
                      className="rounded-xl border bg-card px-4 py-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.blockLabel}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.correct} benar, {item.wrong} salah
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {item.correct + item.wrong} soal
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {resultData.eventId ? (
              <Card className="p-5">
                <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  Perbandingan hasil
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Lihat posisi hasilmu di leaderboard event ini setelah selesai meninjau jawaban.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    {...getButtonStyleProps({
                      variant: "outline",
                    })}
                    to={`/app/scheduled-tryout/leaderboard?event=${resultData.eventId}${resultData.eventCycle ? `&cycle=${resultData.eventCycle}` : ""}`}
                  >
                    Lihat leaderboard
                  </Link>
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </section>
    </ProductShell>
  );
}

export default ScheduledTryoutResultPage;
