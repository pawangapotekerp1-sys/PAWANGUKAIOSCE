import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, Clock, Loader2 } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import Button, { getButtonStyleProps } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import SectionHeading from "../../components/ui/section-heading";
import { SessionAnswerOptionButton, SessionQuestionNavButton } from "../../components/ui/session-option-buttons";
import {
  createScheduledTryoutAttempt,
  getScheduledAttemptSessionPageData,
  pauseScheduledTryoutAttempt,
  resumeScheduledTryoutAttempt,
  saveScheduledTryoutAnswer,
  submitScheduledTryoutAttempt,
} from "../../lib/api/scheduled-tryout-api";
import { formatScheduledDurationAsClock } from "../../lib/mappers/scheduled-tryout-mappers";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function ScheduledTryoutSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const studentShell = useStudentShell("/app/scheduled-tryout");
  const [searchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isQuestionNavHidden, setIsQuestionNavHidden] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const hasTriggeredAutoSubmit = useRef(false);
  const hasRequestedPause = useRef(false);
  const hasStartedSubmit = useRef(false);
  const resumeRequestedAttemptIdRef = useRef<string | null>(null);
  const inFlightAnswerSaveRef = useRef<Promise<unknown> | null>(null);
  const currentQuestionRef = useRef<{
    id: string;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
  } | null>(null);
  const previousQuestionCountRef = useRef<number | null>(null);
  const attemptId = searchParams.get("attempt");
  const eventId = searchParams.get("event");

  const createAttemptMutation = useMutation({
    mutationFn: () =>
      createScheduledTryoutAttempt({
        eventId: eventId!,
      }),
    onSuccess: (attempt) => {
      navigate(`/app/scheduled-tryout/session?attempt=${attempt.id}`, {
        replace: true,
      });
    },
  });
  const sessionQuery = useQuery({
    queryKey: ["scheduled-tryout-session", attemptId],
    enabled: Boolean(attemptId),
    queryFn: () =>
      getScheduledAttemptSessionPageData({
        attemptId: attemptId!,
      }),
    refetchInterval: 15_000,
  });
  const answerMutation = useMutation({
    mutationFn: (variables: {
      attemptItemId: string;
      selectedOptionKey: string | null;
      isDoubtful: boolean;
    }) =>
      saveScheduledTryoutAnswer({
        attemptId: attemptId!,
        attemptItemId: variables.attemptItemId,
        selectedOptionKey: variables.selectedOptionKey,
        isDoubtful: variables.isDoubtful,
      }),
    onMutate: async (variables) => {
      const queryKey = ["scheduled-tryout-session", attemptId];
      await queryClient.cancelQueries({
        queryKey,
      });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getScheduledAttemptSessionPageData>>>(queryKey);

      queryClient.setQueryData<Awaited<ReturnType<typeof getScheduledAttemptSessionPageData>>>(queryKey, (current) => {
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
                  isDoubtful: variables.selectedOptionKey ? variables.isDoubtful : false,
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
        queryClient.setQueryData(["scheduled-tryout-session", attemptId], context.previous);
      }
    },
  });
  const pauseMutation = useMutation({
    mutationFn: () =>
      pauseScheduledTryoutAttempt({
        attemptId: attemptId!,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["scheduled-tryout-session", attemptId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["active-scheduled-tryout-attempt"],
      });
    },
  });
  const resumeMutation = useMutation({
    mutationFn: () =>
      resumeScheduledTryoutAttempt({
        attemptId: attemptId!,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["scheduled-tryout-session", attemptId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["active-scheduled-tryout-attempt"],
      });
    },
  });
  const submitMutation = useMutation({
    mutationFn: () =>
      submitScheduledTryoutAttempt({
        attemptId: attemptId!,
      }),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: ["active-scheduled-tryout-attempt"],
      });
      navigate(`/app/scheduled-tryout/result?attempt=${attemptId}`, {
        replace: true,
      });
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Hasil belum berhasil dikirim.");
    },
  });

  useEffect(() => {
    if (
      attemptId
      || !eventId
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
    eventId,
  ]);

  const sessionData = sessionQuery.data;
  const sessionAttempt = sessionData?.view === "ready" ? sessionData.attempt : null;
  const questions = sessionData?.view === "ready" ? sessionData.questions : [];
  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isAttemptRunning = sessionAttempt?.status === "in_progress";
  const isAttemptInteractionDisabled =
    !isAttemptRunning || resumeMutation.isPending || pauseMutation.isPending || submitMutation.isPending;
  const isQuestionMutationPending = answerMutation.isPending;
  const isQuestionNavigationDisabled = isAttemptInteractionDisabled || isQuestionMutationPending;

  currentQuestionRef.current = currentQuestion
    ? {
        id: currentQuestion.id,
        selectedOptionKey: currentQuestion.selectedOptionKey,
        isDoubtful: currentQuestion.isDoubtful,
      }
    : null;

  function saveAnswerProgress(variables: {
    attemptItemId: string;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
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
      setSubmitError(error instanceof Error ? error.message : "Progress belum berhasil disimpan.");
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
    if (!sessionData || sessionData.view !== "ready") {
      previousQuestionCountRef.current = null;
      setSyncNotice(null);
      return;
    }

    const nextCount = sessionData.questions.length;
    const previousCount = previousQuestionCountRef.current;

    if (previousCount !== null && previousCount !== nextCount) {
      setSyncNotice("Daftar soal diperbarui. Sesi kamu sudah menyesuaikan.");
    }

    previousQuestionCountRef.current = nextCount;
  }, [sessionData]);

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

    if (timeRemainingSeconds === null || timeRemainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemainingSeconds((current) => {
        if (current === null) {
          return current;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionAttempt?.status, timeRemainingSeconds]);

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
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId, pauseMutation, sessionAttempt?.status, submitMutation.isPending]);

  const timerLabel = sessionData?.view !== "ready" || !sessionData.attempt
    ? "Timer sesi --:--:--"
    : `Timer sesi ${formatScheduledDurationAsClock(timeRemainingSeconds ?? sessionData.attempt.timeRemainingSeconds)}`;
  const timerTone = timeRemainingSeconds !== null && timeRemainingSeconds < 300 ? "danger" : "success";
  const createAttemptErrorMessage = createAttemptMutation.error instanceof Error
    ? createAttemptMutation.error.message
    : "Sesi baru belum bisa dibuka. Coba lagi beberapa saat lagi.";
  const resumeErrorMessage = resumeMutation.error instanceof Error
    ? resumeMutation.error.message
    : "Sesi yang tertunda belum bisa dilanjutkan.";

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

  function persistAnswer(selectedOptionKey: string | null, isDoubtful: boolean) {
    if (!currentQuestion || !attemptId) {
      return;
    }

    void saveAnswerProgress({
      attemptItemId: currentQuestion.id,
      selectedOptionKey,
      isDoubtful,
    });
  }

  function selectAnswer(optionKey: string) {
    if (!isAttemptRunning) {
      return;
    }

    persistAnswer(optionKey, currentQuestion?.isDoubtful ?? false);
  }

  function toggleDoubtful() {
    if (!isAttemptRunning || !currentQuestion?.selectedOptionKey) {
      return;
    }

    persistAnswer(currentQuestion.selectedOptionKey, !currentQuestion.isDoubtful);
  }

  const hasSelectedAnswer = Boolean(currentQuestion?.selectedOptionKey);

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <section id="scheduled-tryout-session">
        <SectionHeading
          title="Sesi try out terjadwal"
          description="Kerjakan soal, pantau waktu, dan kirim hasil saat selesai."
          eyebrow="Sesi aktif"
          actions={(
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
                {isQuestionNavHidden ? "Tampilkan daftar soal" : "Sembunyikan daftar soal"}
              </Button>
              <Badge variant={timerTone === "danger" ? "destructive" : "secondary"} className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {timerLabel}
              </Badge>
            </div>
          )}
        />

        {createAttemptMutation.isPending ? (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Sesi sedang dimuat</h3>
              <p>Sesi baru sedang disiapkan.</p>
            </div>
          </div>
        ) : createAttemptMutation.isError ? (
          <Alert variant="destructive" className="mt-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sesi belum bisa dibuka</AlertTitle>
            </div>
            <AlertDescription>{createAttemptErrorMessage}</AlertDescription>
            <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/scheduled-tryout">
              Kembali ke daftar sesi
            </Link>
          </Alert>
        ) : !attemptId && !eventId ? (
          <Alert className="mt-6 border-dashed flex flex-col items-start gap-4">
            <div>
              <AlertTitle>Belum ada sesi aktif</AlertTitle>
              <AlertDescription>Pilih sesi dari daftar untuk mulai.</AlertDescription>
            </div>
            <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/scheduled-tryout">
              Pilih sesi
            </Link>
          </Alert>
        ) : sessionQuery.isLoading ? (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Soal sedang dimuat</h3>
              <p>Soal sesi sedang disiapkan.</p>
            </div>
            <Link {...getButtonStyleProps({ variant: "outline" })} to="/app/scheduled-tryout">
              Kembali ke daftar sesi
            </Link>
          </div>
        ) : sessionQuery.isError ? (
          <Alert variant="destructive" className="mt-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Soal belum bisa dimuat</AlertTitle>
            </div>
            <AlertDescription>Buka daftar sesi lalu coba lagi.</AlertDescription>
            <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/scheduled-tryout">
              Buka daftar sesi
            </Link>
          </Alert>
        ) : sessionData?.view === "ready" && currentQuestion ? (
          <div
            className={[
              "mt-6 grid gap-4",
              isQuestionNavHidden ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[18rem_minmax(0,1fr)]",
            ].join(" ")}
          >
            {!isQuestionNavHidden ? (
              <Card className="p-5">
                <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  Daftar soal
                </p>
                <div className="mt-5 grid grid-cols-4 gap-3">
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
              </Card>
            ) : null}

            <Card className="p-5">
              {syncNotice ? (
                <Alert className="mb-5 border-primary text-primary">
                  <AlertDescription className="font-semibold text-sm">{syncNotice}</AlertDescription>
                </Alert>
              ) : null}

              {sessionAttempt?.status === "paused" && resumeMutation.isError ? (
                <Alert variant="destructive" className="mb-5">
                  <AlertDescription className="font-semibold text-sm">{resumeErrorMessage}</AlertDescription>
                  <Button
                    className="mt-3"
                    loading={resumeMutation.isPending}
                    loadingLabel="Mencoba lanjutkan sesi..."
                    onClick={() => {
                      resumeMutation.reset();
                      resumeRequestedAttemptIdRef.current = attemptId;
                      resumeMutation.mutate();
                    }}
                    variant="primary"
                  >
                    Coba lanjutkan sesi
                  </Button>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant="secondary">{currentQuestion.blockLabel}</Badge>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight text-foreground">
                    Soal {currentIndex + 1} dari {questions.length}
                  </h2>
                </div>
                <Badge variant={sessionAttempt?.status === "submitted" ? "secondary" : "outline"}>
                  {sessionAttempt?.status === "submitted" ? "Sudah dikirim" : "Belum dikirim"}
                </Badge>
              </div>

              <p className="mt-5 text-base md:text-lg leading-relaxed font-semibold text-foreground tracking-tight">{currentQuestion.stem}</p>

              {currentQuestion.questionImageUrl ? (
                <div className="mt-5 overflow-hidden rounded-xl border bg-muted p-3">
                  <img
                    alt={`Gambar soal ${currentIndex + 1}`}
                    className="max-h-[26rem] w-full rounded-[1.2rem] object-contain"
                    src={currentQuestion.questionImageUrl}
                  />
                </div>
              ) : null}

              <div className="mt-6 grid gap-3">
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

              <div className="mt-6 flex justify-start">
                <Button
                  className={
                    currentQuestion.isDoubtful
                      ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30"
                      : "hover:bg-yellow-500/10"
                  }
                  disabled={!hasSelectedAnswer || isAttemptInteractionDisabled || isQuestionMutationPending}
                  onClick={toggleDoubtful}
                  variant="outline"
                >
                  {currentQuestion.isDoubtful ? "Batalkan tanda ragu" : "Tandai ragu"}
                </Button>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={currentIndex === 0 || isQuestionNavigationDisabled}
                  leadingIcon={<ArrowLeft size={18} />}
                  onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                  variant="outline"
                >
                  Sebelumnya
                </Button>

                {isLastQuestion ? (
                  <Button
                    disabled={isAttemptInteractionDisabled || isQuestionMutationPending}
                    loading={submitMutation.isPending}
                    loadingLabel="Mengirim hasil..."
                    onClick={() => {
                      void triggerSubmit();
                    }}
                    trailingIcon={<ArrowRight size={18} />}
                    variant="primary"
                  >
                    Kirim hasil
                  </Button>
                ) : (
                  <Button
                    disabled={isQuestionNavigationDisabled}
                    onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                    trailingIcon={<ArrowRight size={18} />}
                    variant="primary"
                  >
                    Selanjutnya
                  </Button>
                )}
              </div>

              {submitError ? (
                <p
                  className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  role="alert"
                >
                  {submitError}
                </p>
              ) : null}
            </Card>
          </div>
        ) : (
          <Alert className="mt-6 border-dashed flex flex-col items-start gap-4">
            <div>
              <AlertTitle>Belum ada soal</AlertTitle>
              <AlertDescription>Sesi ini belum punya soal.</AlertDescription>
            </div>
            <Link
              {...getButtonStyleProps({
                variant: "primary",
              })}
              to="/app/scheduled-tryout"
            >
              Buka daftar sesi
            </Link>
          </Alert>
        )}
      </section>
    </ProductShell>
  );
}

export default ScheduledTryoutSessionPage;
