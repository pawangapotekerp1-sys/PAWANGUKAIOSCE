import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Timer } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import Button, { getButtonStyleProps } from "../../components/ui/button";
import {
  createAttempt,
  findActiveAttemptForUser,
  getAttemptSessionPageData,
  pauseAttempt,
  resumeAttempt,
  saveAnswer,
  submitAttempt,
} from "../../lib/api/tryout-api";
import { formatDurationAsClock } from "../../lib/mappers/tryout-mappers";
import { usePreviewRouteState } from "../../lib/preview-route-state";
import SectionHeading from "../../components/ui/section-heading";
import { SessionAnswerOptionButton, SessionQuestionNavButton } from "../../components/ui/session-option-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useSession } from "../../lib/auth/use-session";
import { useStudentShell } from "./use-student-shell";

function TryoutSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const studentShell = useStudentShell("/app/tryout");
  const [searchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isQuestionNavHidden, setIsQuestionNavHidden] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const hasTriggeredAutoSubmit = useRef(false);
  const hasRequestedPause = useRef(false);
  const hasStartedSubmit = useRef(false);
  const questionActiveSinceRef = useRef<number | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const resumeRequestedAttemptIdRef = useRef<string | null>(null);
  const inFlightAnswerSaveRef = useRef<Promise<unknown> | null>(null);
  const questionView = usePreviewRouteState("questionView");
  const attemptId = searchParams.get("attempt");
  const templateId = searchParams.get("template");

  const createAttemptMutation = useMutation({
    mutationFn: () =>
      createAttempt({
        examTemplateId: templateId!,
      }),
    onSuccess: (attempt) => {
      navigate(`/app/tryout/session?attempt=${attempt.id}`, {
        replace: true,
      });
    },
  });
  const sessionQuery = useQuery({
    queryKey: ["tryout-session", attemptId],
    enabled: questionView === "ready" && Boolean(attemptId),
    queryFn: () =>
      getAttemptSessionPageData({
        attemptId: attemptId!,
      }),
  });
  const activeAttemptFallbackQuery = useQuery({
    queryKey: ["active-tryout-attempt", user?.id, "session-start-fallback"],
    enabled: questionView === "ready" && Boolean(templateId) && !attemptId && Boolean(user?.id),
    queryFn: () =>
      findActiveAttemptForUser({
        userId: user!.id,
      }),
    refetchInterval: 1_000,
  });
  const answerMutation = useMutation({
    mutationFn: (variables: {
      attemptItemId: string;
      selectedOptionKey: string | null;
      isDoubtful: boolean;
      timeSpentDeltaSeconds: number;
    }) =>
      saveAnswer({
        attemptId: attemptId!,
        attemptItemId: variables.attemptItemId,
        selectedOptionKey: variables.selectedOptionKey,
        isDoubtful: variables.isDoubtful,
        timeSpentDeltaSeconds: variables.timeSpentDeltaSeconds,
      }),
    onMutate: async (variables) => {
      const queryKey = ["tryout-session", attemptId];
      await queryClient.cancelQueries({
        queryKey,
      });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getAttemptSessionPageData>>>(queryKey);

      queryClient.setQueryData<Awaited<ReturnType<typeof getAttemptSessionPageData>>>(queryKey, (current) => {
        if (!current || current.view !== "ready") {
          return current;
        }

        return {
          ...current,
          questions: current.questions.map((question) =>
                question.id === variables.attemptItemId
              ? {
                  ...question,
                  selectedOptionKey: variables.selectedOptionKey,
                  isDoubtful: variables.isDoubtful,
                }
              : question),
        };
      });

      return {
        previous,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tryout-session", attemptId], context.previous);
      }
    },
  });
  const pauseMutation = useMutation({
    mutationFn: () =>
      pauseAttempt({
        attemptId: attemptId!,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tryout-session", attemptId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["active-tryout-attempt"],
      });
    },
  });
  const resumeMutation = useMutation({
    mutationFn: () =>
      resumeAttempt({
        attemptId: attemptId!,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tryout-session", attemptId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["active-tryout-attempt"],
      });
    },
  });
  const submitMutation = useMutation({
    mutationFn: () =>
      submitAttempt({
        attemptId: attemptId!,
      }),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ["active-tryout-attempt"],
      });
      navigate(`/app/tryout/result?attempt=${attemptId}`, {
        replace: true,
      });
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Hasil belum bisa dikirim.");
    },
  });

  useEffect(() => {
    if (
      questionView !== "ready"
      || attemptId
      || !templateId
      || createAttemptMutation.isPending
      || createAttemptMutation.isError
      || createAttemptMutation.isSuccess
    ) {
      return;
    }

    createAttemptMutation.mutate();
  }, [
    attemptId,
    createAttemptMutation.isError,
    createAttemptMutation.isPending,
    createAttemptMutation.isSuccess,
    createAttemptMutation.mutate,
    questionView,
    templateId,
  ]);

  useEffect(() => {
    if (attemptId || !activeAttemptFallbackQuery.data?.attemptId) {
      return;
    }

    navigate(`/app/tryout/session?attempt=${activeAttemptFallbackQuery.data.attemptId}`, {
      replace: true,
    });
  }, [activeAttemptFallbackQuery.data?.attemptId, attemptId, navigate]);

  const sessionData = sessionQuery.data;
  const sessionAttempt = sessionData?.view === "ready" ? sessionData.attempt : null;
  const questions = sessionData?.view === "ready" ? sessionData.questions : [];
  const currentQuestion = questions[currentIndex] ?? null;
  const currentQuestionRef = useRef<typeof currentQuestion>(null);
  const isLastQuestion = currentIndex === questions.length - 1;
  const isAttemptRunning = sessionAttempt?.status === "in_progress";
  const isAttemptInteractionDisabled =
    !isAttemptRunning || resumeMutation.isPending || pauseMutation.isPending || submitMutation.isPending;
  const isQuestionMutationPending = answerMutation.isPending;
  const isQuestionNavigationDisabled = isAttemptInteractionDisabled || isQuestionMutationPending;

  currentQuestionRef.current = currentQuestion;

  function saveAnswerProgress(variables: {
    attemptItemId: string;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
    timeSpentDeltaSeconds: number;
  }) {
    const savePromise = answerMutation.mutateAsync(variables);
    inFlightAnswerSaveRef.current = savePromise;

    void savePromise.finally(() => {
      if (inFlightAnswerSaveRef.current === savePromise) {
        inFlightAnswerSaveRef.current = null;
      }
    });

    return savePromise;
  }

  function consumeQuestionTimeDeltaSeconds() {
    const activeQuestion = currentQuestionRef.current;

    if (!activeQuestion) {
      return 0;
    }

    if (activeQuestionIdRef.current !== activeQuestion.id || questionActiveSinceRef.current === null) {
      activeQuestionIdRef.current = activeQuestion.id;
      questionActiveSinceRef.current = Date.now();
      return 0;
    }

    const deltaSeconds = Math.max(0, Math.floor((Date.now() - questionActiveSinceRef.current) / 1000));
    questionActiveSinceRef.current = Date.now();
    return deltaSeconds;
  }

  async function flushCurrentQuestionProgress() {
    if (inFlightAnswerSaveRef.current) {
      await inFlightAnswerSaveRef.current;
    }

    const activeQuestion = currentQuestionRef.current;

    if (!activeQuestion || !attemptId) {
      return;
    }

    await saveAnswerProgress({
      attemptItemId: activeQuestion.id,
      selectedOptionKey: activeQuestion.selectedOptionKey,
      isDoubtful: activeQuestion.selectedOptionKey ? activeQuestion.isDoubtful : false,
      timeSpentDeltaSeconds: consumeQuestionTimeDeltaSeconds(),
    });
  }

  async function triggerSubmit() {
    if (hasStartedSubmit.current || submitMutation.isPending) {
      return;
    }

    hasStartedSubmit.current = true;
    setSubmitError(null);

    try {
      await flushCurrentQuestionProgress();
      await submitMutation.mutateAsync();
    } catch (error) {
      hasStartedSubmit.current = false;
      setSubmitError(error instanceof Error ? error.message : "Progress terakhir belum bisa disimpan.");
    }
  }

  useEffect(() => {
    if (questions.length === 0) {
      setCurrentIndex(0);
      return;
    }

    if (currentIndex > questions.length - 1) {
      setCurrentIndex(questions.length - 1);
    }
  }, [currentIndex, questions.length]);

  useEffect(() => {
    if (!sessionAttempt) {
      setTimeRemainingSeconds(null);
      return;
    }

    setTimeRemainingSeconds(sessionAttempt.timeRemainingSeconds);
  }, [sessionAttempt?.id, sessionAttempt?.status, sessionAttempt?.timeRemainingSeconds]);

  useEffect(() => {
    if (sessionAttempt?.status === "in_progress") {
      hasTriggeredAutoSubmit.current = false;
      hasRequestedPause.current = false;
      hasStartedSubmit.current = false;
      resumeRequestedAttemptIdRef.current = null;
    }
  }, [sessionAttempt?.id, sessionAttempt?.status]);

  useEffect(() => {
    if (sessionAttempt?.status !== "paused" || !attemptId) {
      return;
    }

    if (resumeMutation.isPending || resumeRequestedAttemptIdRef.current === attemptId) {
      return;
    }

    resumeRequestedAttemptIdRef.current = attemptId;
    resumeMutation.mutate();
  }, [attemptId, resumeMutation, sessionAttempt?.status]);

  useEffect(() => {
    if (sessionAttempt?.status !== "in_progress") {
      return;
    }

    const initialTimeRemaining = sessionAttempt.timeRemainingSeconds;

    if (initialTimeRemaining <= 0) {
      return;
    }

    const expectedEndTime = Date.now() + initialTimeRemaining * 1000;

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((expectedEndTime - Date.now()) / 1000));
      setTimeRemainingSeconds(remaining);

      if (remaining <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionAttempt?.id, sessionAttempt?.status, sessionAttempt?.timeRemainingSeconds]);

  useEffect(() => {
    if (sessionAttempt?.status !== "in_progress") {
      return;
    }

    if (timeRemainingSeconds !== 0) {
      return;
    }

    if (submitMutation.isPending || hasTriggeredAutoSubmit.current) {
      return;
    }

    hasTriggeredAutoSubmit.current = true;
    void triggerSubmit();
  }, [sessionAttempt?.status, submitMutation, timeRemainingSeconds]);

  useEffect(() => {
    if (sessionAttempt?.status !== "in_progress" || !attemptId) {
      return;
    }

    async function requestPause() {
      if (
        hasRequestedPause.current
        || hasStartedSubmit.current
        || submitMutation.isPending
        || pauseMutation.isPending
      ) {
        return;
      }

      hasRequestedPause.current = true;

      try {
        await flushCurrentQuestionProgress();
      } finally {
        pauseMutation.mutate();
      }
    }

    function handlePageHide() {
      void requestPause();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        void requestPause();
      }
    }

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId, pauseMutation, sessionAttempt?.status, submitMutation.isPending]);

  useEffect(() => {
    if (!currentQuestion) {
      activeQuestionIdRef.current = null;
      questionActiveSinceRef.current = null;
      return;
    }

    activeQuestionIdRef.current = currentQuestion.id;
    questionActiveSinceRef.current = Date.now();
  }, [currentQuestion?.id]);

  const timerLabel = useMemo(() => {
    if (sessionData?.view !== "ready" || !sessionData.attempt) {
      return "Timer sesi --:--:--";
    }

    const visibleSeconds = timeRemainingSeconds ?? sessionData.attempt.timeRemainingSeconds;

    return `Timer sesi ${formatDurationAsClock(visibleSeconds)}`;
  }, [sessionData, timeRemainingSeconds]);
  const timerTone = timeRemainingSeconds !== null && timeRemainingSeconds < 300 ? "danger" : "success";
  const createAttemptErrorMessage = createAttemptMutation.error instanceof Error
    ? createAttemptMutation.error.message
    : "Sesi baru belum bisa dibuka. Coba lagi sebentar.";

  function goToQuestion(index: number) {
    if (index === currentIndex) {
      return;
    }

    if (isAttemptRunning) {
      void flushCurrentQuestionProgress();
    }

    startTransition(() => {
      setCurrentIndex(index);
    });
  }

  function persistAnswer(selectedOptionKey: string | null, isDoubtful: boolean, timeSpentDeltaSeconds: number) {
    if (!currentQuestion || !attemptId) {
      return;
    }

    void saveAnswerProgress({
      attemptItemId: currentQuestion.id,
      selectedOptionKey,
      isDoubtful: selectedOptionKey ? isDoubtful : false,
      timeSpentDeltaSeconds,
    });
  }

  function selectAnswer(optionKey: string) {
    if (!isAttemptRunning) {
      return;
    }

    persistAnswer(optionKey, currentQuestion?.isDoubtful ?? false, consumeQuestionTimeDeltaSeconds());
  }

  function toggleDoubtful() {
    if (!isAttemptRunning || !currentQuestion?.selectedOptionKey) {
      return;
    }

    persistAnswer(
      currentQuestion.selectedOptionKey,
      !currentQuestion.isDoubtful,
      consumeQuestionTimeDeltaSeconds(),
    );
  }

  const hasSelectedAnswer = Boolean(currentQuestion?.selectedOptionKey);
  const resumeErrorMessage = resumeMutation.error instanceof Error
    ? resumeMutation.error.message
    : "Sesi yang tertunda belum bisa dilanjutkan.";

  if (studentShell.role === "osce_pro") {
    return <Navigate to="/app/scheduled-tryout" replace />;
  }

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <section id="tryout">
        <SectionHeading
          title="Sesi try out berjalan"
          description="Pilih nomor soal untuk berpindah dan kirim hasil saat selesai."
          eyebrow="Sesi aktif"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                aria-pressed={isQuestionNavHidden}
                onClick={() => {
                  startTransition(() => {
                    setIsQuestionNavHidden((current) => !current);
                  });
                }}
                size="sm"
                variant="outline"
              >
                {isQuestionNavHidden ? "Tampilkan navigasi soal" : "Sembunyikan navigasi soal"}
              </Button>
              <Badge variant={timerTone === "danger" ? "destructive" : "secondary"} className="text-sm py-1.5 px-3 flex items-center gap-1.5">
                <Timer className="w-4 h-4" />
                {timerLabel}
              </Badge>
            </div>
          }
        />

        {questionView === "ready" && createAttemptMutation.isPending ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-center">
                <CardTitle>Sesi try out sedang dimuat</CardTitle>
                <CardDescription>Sesi baru sedang disiapkan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && createAttemptMutation.isError ? (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle className="text-destructive">Sesi try out belum berhasil dibuka</CardTitle>
                <CardDescription>{createAttemptErrorMessage}</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Kembali ke katalog try out
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && !attemptId && !templateId ? (
          <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle>Belum ada sesi aktif</CardTitle>
                <CardDescription>Pilih sesi dari katalog untuk mulai.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Pilih sesi dari katalog
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && sessionQuery.isLoading ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-center">
                <CardTitle>Soal try out sedang dimuat</CardTitle>
                <CardDescription>Soal sedang disiapkan.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "secondary" })} to="/app/tryout">
                Kembali ke katalog try out
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && sessionQuery.isError ? (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle className="text-destructive">Soal try out belum bisa dimuat</CardTitle>
                <CardDescription>Buka katalog lalu coba lagi.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Buka katalog lagi
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && sessionData?.view === "ready" && currentQuestion ? (
          <div className={["mt-6 grid gap-6", isQuestionNavHidden ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[18rem_minmax(0,1fr)]"].join(" ")}>
            {!isQuestionNavHidden ? (
              <Card className="shadow-sm h-fit">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardDescription className="font-semibold uppercase tracking-wider text-primary text-xs">
                    Navigasi Soal
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-3 pb-3">
                  <div className="grid grid-cols-4 gap-2.5 max-h-[70vh] overflow-y-auto p-1.5">
                    {questions.map((question, index) => (
                      <SessionQuestionNavButton
                        key={question.id}
                        disabled={isQuestionNavigationDisabled}
                        number={index + 1}
                        onClick={() => goToQuestion(index)}
                        isCurrent={index === currentIndex}
                        state={
                          question.isDoubtful
                            ? "doubtful"
                            : question.selectedOptionKey
                              ? "answered"
                              : "idle"
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="shadow-sm">
              {sessionAttempt?.status === "paused" && resumeMutation.isError ? (
                <div className="m-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-4" role="alert">
                  <p className="text-sm font-semibold text-destructive">{resumeErrorMessage}</p>
                  <Button
                    className="mt-3"
                    loading={resumeMutation.isPending}
                    loadingLabel="Mencoba lanjutkan sesi..."
                    onClick={() => {
                      resumeMutation.reset();
                      resumeRequestedAttemptIdRef.current = attemptId;
                      resumeMutation.mutate();
                    }}
                    variant="default"
                  >
                    Coba lanjutkan sesi
                  </Button>
                </div>
              ) : null}

              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {currentQuestion.blockLabel}
                    </Badge>
                    <CardTitle className="mt-4 text-2xl font-bold leading-tight">
                      Soal {currentIndex + 1} <span className="text-muted-foreground font-normal text-lg">dari {questions.length}</span>
                    </CardTitle>
                  </div>
                  <Badge variant={sessionData.attempt?.status === "submitted" ? "default" : "secondary"}>
                    {sessionData.attempt?.status === "submitted" ? "Sudah submit" : "Belum submit"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-base leading-relaxed">{currentQuestion.stem}</p>

                {currentQuestion.questionImageUrl ? (
                  <div className="mt-6 overflow-hidden rounded-xl border bg-muted/30 p-2">
                    <img
                      alt={`Gambar soal ${currentIndex + 1}`}
                      className="max-h-[26rem] w-full rounded-lg object-contain"
                      src={currentQuestion.questionImageUrl}
                    />
                  </div>
                ) : null}

                <div className="mt-8 grid gap-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = currentQuestion.selectedOptionKey === option.key;
                    return (
                      <SessionAnswerOptionButton
                        key={option.key}
                        disabled={isAttemptInteractionDisabled || isQuestionMutationPending}
                        onClick={() => selectAnswer(option.key)}
                        optionKey={option.key}
                        optionText={option.text}
                        selected={isSelected}
                      />
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-start">
                  <Button
                    className={
                      currentQuestion.isDoubtful
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:border-amber-500/60 hover:text-amber-700"
                        : "hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 text-muted-foreground"
                    }
                    disabled={!hasSelectedAnswer || isAttemptInteractionDisabled || isQuestionMutationPending}
                    onClick={toggleDoubtful}
                    variant="outline"
                  >
                    {currentQuestion.isDoubtful ? "Batal ragu-ragu" : "Tandai ragu-ragu"}
                  </Button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t bg-muted/10 py-4 mt-4 rounded-b-xl">
                <Button
                  disabled={currentIndex === 0 || isQuestionNavigationDisabled}
                  onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Sebelumnya
                </Button>

                {isLastQuestion ? (
                  <Button
                    disabled={isAttemptInteractionDisabled || isQuestionMutationPending}
                    loading={submitMutation.isPending}
                    loadingLabel="Mengirim hasil..."
                    onClick={() => { void triggerSubmit(); }}
                    variant="default"
                  >
                    Kirim hasil
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    disabled={isQuestionNavigationDisabled}
                    onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                    variant="default"
                  >
                    Selanjutnya
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardFooter>

              {submitError ? (
                <div className="px-6 pb-6">
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
                    {submitError}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        ) : questionView === "loading" ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-center">
                <CardTitle>Soal try out sedang dimuat</CardTitle>
                <CardDescription>Soal sedang disiapkan.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "secondary" })} to="/app/tryout">
                Kembali ke katalog try out
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "empty" ? (
          <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle>Belum ada soal untuk sesi ini</CardTitle>
                <CardDescription>Pilih sesi lain atau kembali nanti.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Pilih sesi lain
              </Link>
            </CardHeader>
          </Card>
        ) : (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle className="text-destructive">Soal try out belum bisa dimuat</CardTitle>
                <CardDescription>Buka katalog lalu coba lagi.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Buka katalog lagi
              </Link>
            </CardHeader>
          </Card>
        )}
      </section>
    </ProductShell>
  );
}

export default TryoutSessionPage;
