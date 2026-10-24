import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  MoreVertical,
  RotateCcw,
  Shuffle,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "../ui/badge";
import Button, { getButtonStyleProps } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FlashCardAnswerStatus = "unanswered" | "correct" | "wrong";

export type FlashCardViewerCard = {
  id: string;
  frontText: string;
  backText: string;
  sortOrder: number;
  savedDifficulty: "easy" | "medium" | "hard" | null;
  lastReviewedAt: string | null;
};

export type FlashCardViewerProps = {
  cards: FlashCardViewerCard[];
  subtopicTitle?: string;
  subtopicSummary?: string;
  materialTitle?: string;
  academicGroupLabel?: string;
  backHref?: string;
  isSaving?: boolean;
  onCardChange?: (card: FlashCardViewerCard) => void;
  onRateCard?: (
    card: FlashCardViewerCard,
    status: "correct" | "wrong",
  ) => void | Promise<void>;
};

const AUTO_ADVANCE_DELAY_MS = 400;

function StatusPill({
  status,
  isDarkSurface = false,
}: {
  status: FlashCardAnswerStatus;
  isDarkSurface?: boolean;
}) {
  const config = {
    unanswered: {
      label: "Belum dijawab",
      className:
        "bg-amber-400 text-amber-950 border-amber-500/30 shadow-[0_2px_10px_rgba(245,158,11,0.28)]",
    },
    correct: {
      label: "Benar",
      className:
        "bg-emerald-500 text-white border-emerald-400/40 shadow-[0_2px_12px_rgba(16,185,129,0.35)]",
    },
    wrong: {
      label: "Salah",
      className:
        "bg-rose-500 text-white border-rose-400/40 shadow-[0_2px_12px_rgba(244,63,94,0.35)]",
    },
  }[status];

  return (
    <motion.div
      key={status}
      initial={{ scale: 0.84, opacity: 0.7, y: -3 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
    >
      <Badge
        data-testid={`card-status-badge-${status}`}
        className={cn(
          "h-auto rounded-full border px-4 py-1 text-xs font-extrabold tracking-wide select-none",
          config.className,
          isDarkSurface && "ring-2 ring-white/15",
        )}
      >
        {config.label}
      </Badge>
    </motion.div>
  );
}

function FlashCardViewer({
  cards,
  subtopicTitle,
  subtopicSummary,
  materialTitle,
  academicGroupLabel,
  backHref,
  isSaving = false,
  onCardChange,
  onRateCard,
}: FlashCardViewerProps) {
  const [deckCards, setDeckCards] = useState<FlashCardViewerCard[]>(cards);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, FlashCardAnswerStatus>>({});
  const [feedbackAction, setFeedbackAction] = useState<"correct" | "wrong" | null>(null);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDeckCards(cards);
    setActiveIndex(0);
    setIsFlipped(false);
    setStatusMap({});
    setIsRecapOpen(false);
  }, [cards]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const activeCard = deckCards[activeIndex] ?? null;

  useEffect(() => {
    if (activeCard && !isRecapOpen) {
      onCardChange?.(activeCard);
    }
  }, [activeCard, isRecapOpen, onCardChange]);

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    for (const card of deckCards) {
      const status = statusMap[card.id] ?? "unanswered";
      if (status === "correct") {
        correct += 1;
      } else if (status === "wrong") {
        wrong += 1;
      } else {
        unanswered += 1;
      }
    }

    const total = deckCards.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
      total,
      correct,
      wrong,
      unanswered,
      accuracy,
    };
  }, [deckCards, statusMap]);

  if (cards.length === 0) {
    return null;
  }

  const currentStatus: FlashCardAnswerStatus = activeCard
    ? statusMap[activeCard.id] ?? "unanswered"
    : "unanswered";

  function clearPendingTimer() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function moveTo(nextIndex: number) {
    clearPendingTimer();
    setFeedbackAction(null);
    if (nextIndex >= deckCards.length) {
      setIsRecapOpen(true);
      return;
    }
    setActiveIndex(Math.max(0, nextIndex));
    setIsFlipped(false);
  }

  function handleRate(status: "correct" | "wrong") {
    if (!activeCard) {
      return;
    }

    clearPendingTimer();

    const updatedMap: Record<string, FlashCardAnswerStatus> = {
      ...statusMap,
      [activeCard.id]: status,
    };
    setStatusMap(updatedMap);
    setFeedbackAction(status);

    void onRateCard?.(activeCard, status);

    const isLastCard = activeIndex >= deckCards.length - 1;
    const allAnswered = deckCards.every(
      (c) => (updatedMap[c.id] ?? "unanswered") !== "unanswered",
    );

    advanceTimerRef.current = setTimeout(() => {
      setFeedbackAction(null);
      if (isLastCard || allAnswered) {
        setIsRecapOpen(true);
      } else {
        setActiveIndex((prev) => Math.min(deckCards.length - 1, prev + 1));
        setIsFlipped(false);
      }
    }, AUTO_ADVANCE_DELAY_MS);
  }

  function handleResetAll() {
    clearPendingTimer();
    setDeckCards(cards);
    setStatusMap({});
    setActiveIndex(0);
    setIsFlipped(false);
    setFeedbackAction(null);
    setIsRecapOpen(false);
  }

  function handleRetryWrongCards() {
    clearPendingTimer();
    const wrongCards = deckCards.filter((card) => statusMap[card.id] === "wrong");
    if (wrongCards.length === 0) {
      return;
    }
    setDeckCards(wrongCards);
    setStatusMap({});
    setActiveIndex(0);
    setIsFlipped(false);
    setFeedbackAction(null);
    setIsRecapOpen(false);
  }

  function handleShuffleDeck() {
    clearPendingTimer();
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
    setDeckCards(shuffled);
    setActiveIndex(0);
    setIsFlipped(false);
    setFeedbackAction(null);
    setIsRecapOpen(false);
  }

  function renderOptionsMenu(isDarkSurface: boolean) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Opsi kartu"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2",
              isDarkSurface
                ? "text-cyan-100 hover:bg-white/15 focus-visible:ring-cyan-300"
                : "text-cyan-950/70 hover:bg-cyan-900/10 focus-visible:ring-cyan-600",
            )}
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={handleShuffleDeck}>
              <Shuffle className="mr-2 h-4 w-4 text-primary" />
              Acak urutan kartu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResetAll}>
              <RotateCcw className="mr-2 h-4 w-4 text-amber-600" />
              Ulangi dari awal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsRecapOpen(true)}>
              <Award className="mr-2 h-4 w-4 text-emerald-600" />
              Lihat rekapitulasi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      {/* Top Bar: Back Button + Subtopic Context */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backHref ? (
          <Link
            to={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-600/30 bg-cyan-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-cyan-800 shadow-2xs transition-all hover:-translate-x-0.5 hover:bg-cyan-500/20 hover:border-cyan-600/50"
          >
            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            <span>Kembali</span>
          </Link>
        ) : null}

        {subtopicTitle ? (
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-2">
              {academicGroupLabel ? (
                <Badge
                  variant="secondary"
                  className="bg-cyan-950/5 text-cyan-900 border-cyan-800/15 font-mono text-[11px] font-semibold"
                >
                  {academicGroupLabel}
                </Badge>
              ) : null}
              <h1 className="font-display text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                {subtopicTitle}
              </h1>
            </div>
            {materialTitle ? (
              <p className="text-xs font-medium text-muted-foreground">
                {materialTitle}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Main View: Either Recapitulation Screen or Interactive 3D Flashcard */}
      {isRecapOpen ? (
          <motion.div
            key="recap-view"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="overflow-hidden rounded-[2rem] border border-cyan-200/80 bg-white shadow-[0_24px_60px_-15px_rgba(8,145,178,0.14)]">
              <div className="bg-gradient-to-br from-[#0e7490] via-[#155e75] to-[#083344] px-6 py-8 text-white sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 backdrop-blur-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      Sesi Selesai
                    </div>
                    <CardTitle className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                      Rekapitulasi Hasil Belajar
                    </CardTitle>
                    <CardDescription className="text-sm text-cyan-100/85">
                      {subtopicTitle
                        ? `${subtopicTitle}${subtopicSummary ? ` — ${subtopicSummary}` : ""}`
                        : "Ringkasan penguasaan kartu belajar pada sesi ini."}
                    </CardDescription>
                  </div>

                  {/* Mastery Percentage Pill */}
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur-md">
                    <span className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
                      {stats.accuracy}%
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">
                      Penguasaan
                    </span>
                  </div>
                </div>

                {/* Segmented Progress Bar */}
                <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-white/15 p-0.5">
                  {stats.correct > 0 && (
                    <div
                      style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                      className="h-full rounded-l-full bg-emerald-400 transition-all duration-500"
                    />
                  )}
                  {stats.wrong > 0 && (
                    <div
                      style={{ width: `${(stats.wrong / stats.total) * 100}%` }}
                      className="h-full bg-rose-400 transition-all duration-500"
                    />
                  )}
                  {stats.unanswered > 0 && (
                    <div
                      style={{ width: `${(stats.unanswered / stats.total) * 100}%` }}
                      className="h-full rounded-r-full bg-amber-300 transition-all duration-500"
                    />
                  )}
                </div>
              </div>

              <CardContent className="space-y-6 p-6 sm:p-8">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800/80">
                        Benar
                      </p>
                      <p className="font-display text-2xl font-black text-emerald-950">
                        {stats.correct}{" "}
                        <span className="text-xs font-semibold text-emerald-700">
                          kartu
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                      <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-800/80">
                        Salah
                      </p>
                      <p className="font-display text-2xl font-black text-rose-950">
                        {stats.wrong}{" "}
                        <span className="text-xs font-semibold text-rose-700">
                          kartu
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-900/80">
                        Belum Dijawab
                      </p>
                      <p className="font-display text-2xl font-black text-amber-950">
                        {stats.unanswered}{" "}
                        <span className="text-xs font-semibold text-amber-800">
                          kartu
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {stats.wrong > 0 && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleRetryWrongCards}
                      className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm font-bold"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Ulangi Kartu Salah ({stats.wrong})
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant={stats.wrong > 0 ? "outline" : "primary"}
                    onClick={handleResetAll}
                    className="rounded-xl font-bold"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Ulangi Semua Kartu
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsRecapOpen(false)}
                    className="rounded-xl font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Tinjau Kembali Kartu
                  </Button>

                  {backHref && (
                    <Link
                      to={backHref}
                      {...getButtonStyleProps({
                        variant: "outline",
                        className: "ml-auto rounded-xl font-semibold",
                      })}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Daftar Materi
                    </Link>
                  )}
                </div>

                {/* Per-Card Breakdown List */}
                <div className="space-y-3 border-t border-border/60 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Detail Status Kartu ({deckCards.length} Kartu)
                  </p>
                  <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                    {deckCards.map((card, idx) => {
                      const cardStatus = statusMap[card.id] ?? "unanswered";
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setActiveIndex(idx);
                            setIsFlipped(false);
                            setIsRecapOpen(false);
                          }}
                          className="flex w-full items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-left transition-all hover:border-cyan-300 hover:bg-cyan-50/40"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-800">
                                #{idx + 1}
                              </span>
                              <p className="truncate text-sm font-bold text-slate-900">
                                {card.frontText}
                              </p>
                            </div>
                            <p className="line-clamp-1 text-xs text-slate-600">
                              Jawaban: {card.backText}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <StatusPill status={cardStatus} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : activeCard ? (
          <motion.div
            key="card-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-7"
          >
            {/* 3D Perspective Stage */}
            <motion.div
              key={activeCard.id}
              initial={{ opacity: 0.85, scale: 0.985 }}
              animate={
                feedbackAction === "correct"
                  ? {
                      opacity: 1,
                      scale: [1, 1.025, 1],
                      y: [0, -8, 0],
                    }
                  : feedbackAction === "wrong"
                    ? {
                        opacity: 1,
                        x: [0, -12, 12, -8, 8, 0],
                      }
                    : { opacity: 1, scale: 1, x: 0, y: 0 }
              }
              transition={{ duration: 0.36, ease: "easeOut" }}
              style={{ perspective: "1600px" }}
              className="relative w-full"
            >
              {/* Tactile Feedback Floating Overlay */}
              <AnimatePresence>
                {feedbackAction && (
                  <motion.div
                    key={feedbackAction}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.08 }}
                    transition={{ duration: 0.22 }}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[2.25rem]"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-full px-6 py-3 text-base font-extrabold text-white shadow-xl backdrop-blur-md",
                        feedbackAction === "correct"
                          ? "bg-emerald-500/95 ring-4 ring-emerald-300/50"
                          : "bg-rose-500/95 ring-4 ring-rose-300/50",
                      )}
                    >
                      {feedbackAction === "correct" ? (
                        <>
                          <Check className="h-5 w-5 stroke-[3]" />
                          <span>Benar!</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 stroke-[3]" />
                          <span>Salah</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 3D Rotating Card Wrapper */}
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 24,
                  mass: 0.9,
                }}
                style={{ transformStyle: "preserve-3d" }}
                onClick={() => setIsFlipped((current) => !current)}
                className={cn(
                  "relative min-h-[360px] sm:min-h-[420px] w-full cursor-pointer select-none rounded-[2.25rem] transition-shadow duration-300",
                  feedbackAction === "correct" &&
                    "ring-4 ring-emerald-400/70 shadow-[0_0_45px_rgba(16,185,129,0.28)]",
                  feedbackAction === "wrong" &&
                    "ring-4 ring-rose-400/70 shadow-[0_0_45px_rgba(244,63,94,0.28)]",
                )}
              >
                {/* FRONT FACE (Question / Prompt) — Light Clinical Sky-Cyan */}
                <div
                  aria-hidden={isFlipped}
                  style={{ backfaceVisibility: "hidden" }}
                  className="absolute inset-0 flex flex-col justify-between rounded-[2.25rem] border border-cyan-200/90 bg-gradient-to-br from-[#dff6fb] via-[#ebf9fc] to-[#cfEFF8] p-6 sm:p-9 shadow-[0_22px_50px_-12px_rgba(8,145,178,0.16)] ring-1 ring-inset ring-white/80"
                >
                  {/* Card Top Header */}
                  <div className="grid grid-cols-3 items-center">
                    <span className="font-mono text-sm sm:text-base font-extrabold tracking-tight text-cyan-950/60">
                      {activeIndex + 1}/{deckCards.length}
                    </span>

                    <div className="flex justify-center">
                      <StatusPill status={currentStatus} />
                    </div>

                    <div className="flex justify-end">
                      {renderOptionsMenu(false)}
                    </div>
                  </div>

                  {/* Card Center Body (Question) */}
                  <div className="my-auto py-6 sm:py-8">
                    <p className="font-display text-xl sm:text-2xl md:text-[26px] font-extrabold leading-[1.42] tracking-tight text-[#0f2e2f]">
                      {activeCard.frontText}
                    </p>
                  </div>

                  {/* Card Footer Trigger */}
                  <div className="flex items-center justify-center pt-2">
                    {!isFlipped && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold text-cyan-800 transition-all hover:bg-cyan-900/10 hover:text-cyan-950"
                      >
                        <Eye className="h-4 w-4 stroke-[2.2]" />
                        <span>Lihat jawaban</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* BACK FACE (Answer / Jawaban) — Deep Clinical Teal-Cyan */}
                <div
                  aria-hidden={!isFlipped}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                  className="absolute inset-0 flex flex-col justify-between rounded-[2.25rem] border border-cyan-400/30 bg-gradient-to-br from-[#0e7490] via-[#155e75] to-[#083344] p-6 sm:p-9 text-white shadow-[0_26px_60px_-12px_rgba(8,51,68,0.38)] ring-1 ring-inset ring-cyan-300/20"
                >
                  {/* Card Top Header */}
                  <div className="grid grid-cols-3 items-center">
                    <span className="font-mono text-sm sm:text-base font-extrabold tracking-tight text-cyan-100/80">
                      {activeIndex + 1}/{deckCards.length}
                    </span>

                    <div className="flex justify-center">
                      <StatusPill status={currentStatus} isDarkSurface />
                    </div>

                    <div className="flex justify-end">
                      {renderOptionsMenu(true)}
                    </div>
                  </div>

                  {/* Card Center Body (Answer) */}
                  <div className="my-auto space-y-3 py-6 sm:py-8">
                    <p className="font-mono text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                      JAWABAN
                    </p>
                    <p className="font-display text-xl sm:text-2xl md:text-[26px] font-extrabold leading-[1.42] tracking-tight text-white">
                      {activeCard.backText}
                    </p>
                  </div>

                  {/* Card Footer Trigger */}
                  <div className="flex items-center justify-center pt-2">
                    {isFlipped && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(false);
                        }}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold text-cyan-100/90 transition-all hover:bg-white/15 hover:text-white"
                      >
                        <Eye className="h-4 w-4 stroke-[2.2]" />
                        <span>Lihat pertanyaan</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Bottom Control Dock: < | ✕ wrongCount | correctCount ✓ | > */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 pt-1">
              {/* Previous Card Button (<) */}
              <Button
                type="button"
                variant="outline"
                disabled={activeIndex === 0}
                aria-label="Sebelumnya"
                onClick={() => moveTo(activeIndex - 1)}
                className="h-12 w-12 rounded-full border-slate-200/90 bg-white p-0 text-cyan-950 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/60 disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
              </Button>

              {/* Wrong / Salah Button (✕ count) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                disabled={isSaving}
                aria-label="Tandai salah"
                onClick={() => handleRate("wrong")}
                className={cn(
                  "inline-flex h-12 min-w-[4.75rem] items-center justify-center gap-2 rounded-full border-2 bg-white px-5 text-sm font-extrabold transition-all shadow-sm",
                  currentStatus === "wrong"
                    ? "border-rose-400 bg-rose-50 text-rose-600 ring-4 ring-rose-500/15"
                    : "border-rose-200/90 text-rose-500 hover:border-rose-300 hover:bg-rose-50/60",
                )}
              >
                <X className="h-4 w-4 stroke-[2.8]" />
                <span data-testid="wrong-count" className="font-mono text-sm">
                  {stats.wrong}
                </span>
              </motion.button>

              {/* Correct / Benar Button (count ✓) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                disabled={isSaving}
                aria-label="Tandai benar"
                onClick={() => handleRate("correct")}
                className={cn(
                  "inline-flex h-12 min-w-[4.75rem] items-center justify-center gap-2 rounded-full border-2 bg-white px-5 text-sm font-extrabold transition-all shadow-sm",
                  currentStatus === "correct"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-500/15"
                    : "border-emerald-200/90 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/60",
                )}
              >
                <span data-testid="correct-count" className="font-mono text-sm">
                  {stats.correct}
                </span>
                <Check className="h-4 w-4 stroke-[2.8]" />
              </motion.button>

              {/* Next Card Button (>) */}
              <Button
                type="button"
                variant="outline"
                aria-label="Berikutnya"
                onClick={() => moveTo(activeIndex + 1)}
                className="h-12 w-12 rounded-full border-slate-200/90 bg-white p-0 text-cyan-950 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/60"
              >
                <ChevronRight className="h-5 w-5 stroke-[2.4]" />
              </Button>
            </div>
          </motion.div>
        ) : null}
    </div>
  );
}

export default FlashCardViewer;
