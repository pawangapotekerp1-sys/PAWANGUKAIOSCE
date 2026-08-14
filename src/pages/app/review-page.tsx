import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
  BookOpenCheck,
  Calendar,
  Award,
  ArrowRight,
  ArrowLeft,
  Check,
  HelpCircle,
  User,
  X,
  PieChart
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import Button, { getButtonStyleProps } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { listReviewHistory, getReviewDetailData } from "../../lib/api/review-api";
import { useSession } from "../../lib/auth/use-session";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function formatSubmittedAttemptLabel(value: string) {
  const submittedAt = new Date(value);

  if (Number.isNaN(submittedAt.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(submittedAt);
}

function formatSubmittedAttemptSummaryLabel(value: string | null | undefined) {
  if (!value) {
    return "Waktu submit belum tersedia";
  }

  const submittedAt = new Date(value);

  if (Number.isNaN(submittedAt.getTime())) {
    return "Waktu submit belum tersedia";
  }

  return formatSubmittedAttemptLabel(value);
}

function getUserAnswerCopy(value: string | null | undefined) {
  if (value == null || value === "") {
    return "Belum dijawab";
  }

  return value;
}

function ReviewPage() {
  const { attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/review");
  const [currentIndex, setCurrentIndex] = useState(0);
  const isDetailRoute = Boolean(attemptId);
  const searchSource = searchParams.get("source");
  const source = searchSource === "scheduled" ? "scheduled" : searchSource === "osce" ? "osce" : "tryout";

  const historyQuery = useQuery({
    queryKey: ["review-history", user?.id],
    enabled: !isDetailRoute && Boolean(user?.id),
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: () =>
      listReviewHistory({
        userId: user!.id,
      }),
  });

  const reviewQuery = useQuery({
    queryKey: ["review-detail", attemptId, source],
    enabled: Boolean(attemptId),
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: () =>
      getReviewDetailData({
        attemptId: attemptId!,
        source,
      }),
  });

  const reviewSummary = reviewQuery.data?.summary;
  const items = reviewQuery.data?.items ?? [];
  const currentItem = items[currentIndex] ?? items[0] ?? null;
  const osceData = (reviewQuery.data as any)?.osce_data;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">
        {!isDetailRoute ? (
          <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Pembahasan Soal
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
                  Riwayat Pembahasan
                </h1>
                <p className="text-base text-muted-foreground mt-2 max-w-2xl">
                  Pilih hasil try out atau sesi terjadwal untuk mendalami pembahasan dan kunci jawaban.
                </p>
              </div>
            </div>

            {historyQuery.isLoading ? (
              <div className="mt-6 flex flex-col items-center justify-center space-y-4 py-16 text-center text-muted-foreground border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Riwayat sesi sedang disiapkan.</p>
              </div>
            ) : historyQuery.isError ? (
              <Alert variant="destructive" className="mt-6 border-destructive/50 bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Riwayat pembahasan belum bisa dimuat</AlertTitle>
                <AlertDescription>Coba lagi sebentar.</AlertDescription>
              </Alert>
            ) : (historyQuery.data?.length ?? 0) === 0 ? (
              <Alert className="mt-6 border-border/80 bg-card/60">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle>Belum ada hasil untuk dibahas</AlertTitle>
                <AlertDescription>Hasil yang sudah selesai akan muncul di sini.</AlertDescription>
              </Alert>
            ) : (
              <div className="mt-6 grid gap-4 w-full">
                {historyQuery.data?.map((attempt) => (
                  <Card 
                    key={attempt.attemptId}
                    className="group relative overflow-hidden border-border/80 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Badge 
                            variant={attempt.source === "scheduled" ? "secondary" : attempt.source === "osce" ? "default" : "outline"}
                            className="font-mono text-xs font-semibold px-2.5 py-0.5"
                          >
                            {attempt.source === "scheduled" ? "Terjadwal" : attempt.source === "osce" ? "Simulasi OSCE" : "Try out"}
                          </Badge>
                          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {attempt.title}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {formatSubmittedAttemptLabel(attempt.submittedAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 self-start rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-extrabold text-primary shadow-xs">
                          <Award className="h-4 w-4" />
                          Skor {Math.round(attempt.score)}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center pt-4 border-t border-border/40">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 backdrop-blur-xs">
                            <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Jawaban benar
                            </p>
                            <p className="mt-1.5 text-xl font-extrabold text-foreground">
                              {attempt.correctAnswers} <span className="text-xs font-normal text-muted-foreground">Soal</span>
                            </p>
                          </div>
                          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 backdrop-blur-xs">
                            <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-destructive/80 flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5" />
                              Jawaban salah
                            </p>
                            <p className="mt-1.5 text-xl font-extrabold text-foreground">
                              {attempt.wrongAnswers} <span className="text-xs font-normal text-muted-foreground">Soal</span>
                            </p>
                          </div>
                        </div>

                        <Link
                          aria-label={`Buka pembahasan ${attempt.title}`}
                          {...getButtonStyleProps({
                            variant: "outline",
                            className: "w-full lg:w-auto justify-center font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all",
                          })}
                          to={attempt.source === "scheduled"
                            ? `/app/review/${attempt.attemptId}?source=scheduled`
                            : attempt.source === "osce"
                            ? `/app/review/${attempt.attemptId}?source=osce`
                            : `/app/review/${attempt.attemptId}`}
                        >
                          Buka pembahasan <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Header Title Section */}
            <div className="text-center mb-4 max-w-2xl mx-auto">
              <Badge variant="outline" className="mb-2.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                <BookOpenCheck className="mr-1.5 h-3.5 w-3.5 inline-block" />
                Pembahasan Sesi
              </Badge>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-foreground">
                Jawaban dan Pembahasan
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Navigasikan nomor soal di sebelah kiri untuk melihat pembahasan detail setiap pertanyaan.
              </p>
            </div>

            {reviewQuery.isLoading ? (
              <div className="mt-6 flex flex-col items-center justify-center space-y-4 py-16 text-center text-muted-foreground border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Pembahasan soal sedang disiapkan.</p>
              </div>
            ) : reviewQuery.isError ? (
              <Alert variant="destructive" className="mt-6 border-destructive/50 bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pembahasan belum bisa dimuat</AlertTitle>
                <AlertDescription>Buka lagi dari riwayat.</AlertDescription>
              </Alert>
            ) : (
              <div className="mt-2 space-y-8">
                {source === "osce" ? (
                  !osceData ? (
                    <Alert className="mt-6 border-border/80 bg-card/60">
                      <Info className="h-4 w-4 text-primary" />
                      <AlertTitle>Data OSCE tidak ditemukan</AlertTitle>
                      <AlertDescription>Belum ada data evaluasi untuk sesi ini.</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                        <h2 className="text-2xl font-bold text-slate-800">Detail Evaluasi OSCE</h2>
                        <p className="text-slate-600">Skor Total: <span className="font-bold text-xl text-blue-600">{osceData.total_score}</span> / {osceData.max_score}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">Detail Rubrik</h3>
                        {osceData.rubric_results?.map((r: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-700">{r.competency}</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-full text-sm">Skor: {r.score}</span>
                            </div>
                            <p className="text-sm text-slate-600">{r.reasoning}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                        <h4 className="font-bold text-orange-800 mb-1">Feedback Keseluruhan</h4>
                        <p className="text-sm text-orange-700">{osceData.feedback}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">Log Interaksi</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-h-96 overflow-y-auto space-y-2">
                          {osceData.transcript?.map((t: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg text-sm ${t.role === 'Kandidat' ? 'bg-blue-50' : 'bg-slate-100'}`}>
                              <span className="font-bold text-xs uppercase text-slate-500 block mb-1">{t.role}</span>
                              <span className="text-slate-800">{t.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">Lembar Kerja</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm whitespace-pre-wrap text-sm text-slate-700 font-mono">
                          {osceData.form_data || "Tidak ada data lembar kerja."}
                        </div>
                      </div>
                    </div>
                  )
                ) : items.length === 0 ? (
                  <Alert className="mt-6 border-border/80 bg-card/60">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle>Pembahasan belum tersedia</AlertTitle>
                    <AlertDescription>Belum ada pembahasan untuk sesi ini.</AlertDescription>
                  </Alert>
                ) : (
                  /* 2-Column Tryout Layout (Exact structure of tryout-session-page.tsx) */
                  <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] items-start">
                    {/* Left Sidebar - Navigasi Soal Grid (With p-1.5 padding to prevent active ring cutoff) */}
                    <Card className="shadow-xs h-fit">
                      <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardDescription className="font-semibold uppercase tracking-wider text-primary text-xs">
                          Navigasi Soal
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 px-3 pb-3">
                        <div className="grid grid-cols-4 gap-2.5 max-h-[70vh] overflow-y-auto p-1.5">
                          {items.map((item, index) => {
                            const isCurrent = index === currentIndex;
                            return (
                              <button
                                key={item.id}
                                onClick={() => setCurrentIndex(index)}
                                aria-label={`Soal ${index + 1}`}
                                className={[
                                  "h-10 w-full rounded-2xl border text-sm font-bold transition-all duration-150 flex items-center justify-center cursor-pointer shadow-2xs",
                                  item.isWrong
                                    ? "!border-rose-600 !bg-rose-600 !text-white hover:!bg-rose-700"
                                    : "!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700",
                                  isCurrent ? "ring-2 ring-primary ring-offset-2 !border-primary scale-[1.03]" : "",
                                ].filter(Boolean).join(" ")}
                              >
                                {index + 1}
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right Main View - Current Question & Pembahasan */}
                    {currentItem ? (
                      <Card className="shadow-xs">
                        <CardHeader className="pb-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                {currentItem.blockLabel}
                              </Badge>
                              <CardTitle className="mt-4 text-2xl font-bold leading-tight">
                                Soal {currentIndex + 1} <span className="text-muted-foreground font-normal text-lg">dari {items.length}</span>
                              </CardTitle>
                            </div>

                            {/* Status Badge */}
                            <Badge
                              variant={currentItem.isWrong ? "secondary" : "outline"}
                              className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 border ${
                                currentItem.isWrong
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {currentItem.isWrong ? (
                                <>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  Perlu diulang
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  Sudah benar
                                </>
                              )}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent>
                          {/* Question Text */}
                          <p className="text-base leading-relaxed font-medium text-foreground">
                            {currentItem.question}
                          </p>

                          {/* Question Image if present */}
                          {currentItem.questionImageUrl ? (
                            <div className="mt-6 overflow-hidden rounded-xl border border-border/80 bg-muted/30 p-2">
                              <img
                                alt={`Gambar soal ${currentIndex + 1}`}
                                className="max-h-[26rem] w-full rounded-lg object-contain"
                                src={currentItem.questionImageUrl}
                              />
                            </div>
                          ) : null}

                          {/* Multiple Choice Options List */}
                          {currentItem.options && currentItem.options.length > 0 ? (
                            <div className="mt-8 grid gap-3">
                              {currentItem.options.map((option) => {
                                const isCorrectAnswer =
                                  option.key === currentItem.correctOptionKey ||
                                  option.text === currentItem.correctAnswer;
                                const isUserAnswer =
                                  option.key === currentItem.selectedOptionKey ||
                                  option.text === currentItem.userAnswer;
                                const isUserWrong = isUserAnswer && !isCorrectAnswer;

                                return (
                                  <div
                                    key={option.key}
                                    className={`relative flex items-center justify-between rounded-[1.45rem] border p-4 text-left font-medium transition-all text-sm ${
                                      isCorrectAnswer
                                        ? "border-emerald-500/50 bg-emerald-500/10 shadow-2xs"
                                        : isUserWrong
                                        ? "border-destructive/50 bg-destructive/10 shadow-2xs"
                                        : "border-border/80 bg-card"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 pr-4">
                                      <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${
                                          isCorrectAnswer
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : isUserWrong
                                            ? "bg-destructive text-white border-destructive"
                                            : "border-border/80 bg-muted/40 text-muted-foreground"
                                        }`}
                                      >
                                        {option.key}
                                      </span>
                                      <p className="pt-1 text-sm leading-relaxed text-foreground font-semibold">{option.text}</p>
                                    </div>

                                    {/* Badges */}
                                    {isCorrectAnswer && (
                                      <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 px-3.5 py-1.5 rounded-full shadow-2xs">
                                        <Check className="h-3.5 w-3.5 text-white" />
                                        Jawaban Benar
                                      </span>
                                    )}

                                    {isUserWrong && (
                                      <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 px-3.5 py-1.5 rounded-full shadow-2xs">
                                        <X className="h-3.5 w-3.5 text-white" />
                                        Jawabanmu (Salah)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Fallback to Jawabanmu & Jawaban Benar cards if options array is empty */
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                              <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                                <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-primary" />
                                  Jawabanmu
                                </p>
                                <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground">
                                  {getUserAnswerCopy(currentItem.userAnswer)}
                                </p>
                              </div>
                              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                                <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                  <Check className="h-3.5 w-3.5" />
                                  Jawaban benar
                                </p>
                                <p className="mt-2 text-sm font-bold leading-relaxed text-emerald-700 dark:text-emerald-300">
                                  {currentItem.correctAnswer}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Embedded Pembahasan Box (Circle Yellow Area Screenshot 1) */}
                          <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-5 shadow-2xs">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
                                <HelpCircle className="h-3.5 w-3.5" />
                                PENJELASAN
                              </span>
                            </div>

                            {currentItem.explanationText ? (
                              <p className="text-sm leading-relaxed text-foreground/90 font-medium">
                                {currentItem.explanationText}
                              </p>
                            ) : null}

                            {currentItem.explanationImageUrl ? (
                              <div className={currentItem.explanationText ? "mt-4" : "mt-3"}>
                                <img
                                  alt={`Gambar pembahasan ${currentItem.question}`}
                                  className="max-h-72 w-full rounded-lg border border-border bg-background object-contain"
                                  src={currentItem.explanationImageUrl}
                                />
                              </div>
                            ) : null}
                          </div>
                        </CardContent>

                        {/* Bottom Navigation Controls */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t bg-muted/10 px-6 py-4 mt-4 rounded-b-xl">
                          <Button
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                            variant="outline"
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Sebelumnya
                          </Button>

                          <Button
                            disabled={currentIndex === items.length - 1}
                            onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
                            variant="default"
                          >
                            Selanjutnya
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </Card>
                    ) : null}
                  </div>
                )}

                {/* Redesigned Summary Stats Section at the VERY BOTTOM */}
                {reviewSummary ? (
                  <Card aria-label="Ringkasan hasil sesi" className="mt-12 overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
                    <CardHeader className="pb-4 border-b border-border/40">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <PieChart className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                              Ringkasan Hasil Sesi
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                              Statistik keseluruhan performa dan skor akhir Anda pada sesi ini
                            </CardDescription>
                          </div>
                        </div>
                        
                        <Badge 
                          variant={reviewSummary.source === "scheduled" ? "secondary" : reviewSummary.source === "osce" ? "default" : "outline"}
                          className="font-mono text-xs font-semibold px-3 py-1 self-start sm:self-auto"
                        >
                          {reviewSummary.source === "scheduled" ? "Terjadwal" : reviewSummary.source === "osce" ? "Simulasi OSCE" : "Try out"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {/* Stat 1: Skor */}
                        <div className="group rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-md">
                          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            SKOR AKHIR
                          </p>
                          <p className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-foreground">
                            {Math.round(reviewSummary.score)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground font-medium">Total Skor Perolehan</p>
                        </div>

                        {/* Stat 2: Jawaban Benar */}
                        <div className="group rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-md">
                          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            JAWABAN BENAR
                          </p>
                          <p className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                            {reviewSummary.correctAnswers} <span className="text-sm font-semibold text-muted-foreground">Soal</span>
                          </p>
                          <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                            Soal Terjawab Tepat
                          </p>
                        </div>

                        {/* Stat 3: Jawaban Salah */}
                        <div className="group rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent p-5 transition-all duration-300 hover:border-destructive/40 hover:shadow-md">
                          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            JAWABAN SALAH
                          </p>
                          <p className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-destructive">
                            {reviewSummary.wrongAnswers} <span className="text-sm font-semibold text-muted-foreground">Soal</span>
                          </p>
                          <p className="mt-1 text-xs text-destructive/80 font-medium">Perlu Evaluasi Ulang</p>
                        </div>

                        {/* Stat 4: Tanggal Submit */}
                        <div className="group rounded-2xl border border-border/80 bg-background/60 p-5 transition-all duration-300 hover:border-border hover:shadow-md">
                          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            TANGGAL SUBMIT
                          </p>
                          <p className="mt-3 text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
                            {formatSubmittedAttemptSummaryLabel(reviewSummary.submittedAt)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground font-medium">Selesai Dikirim</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </ProductShell>
  );
}

export default ReviewPage;
