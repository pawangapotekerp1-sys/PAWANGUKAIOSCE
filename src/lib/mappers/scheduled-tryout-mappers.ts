export type ScheduledCatalogEntry = {
  id: string;
  title: string;
  description: string;
  accessStartAt: string;
  accessEndAt: string;
  currentCycle: number;
  questionCount: number;
  durationMinutes: number;
  remainingAttempts: number;
  submittedAttemptCount: number;
  hasActiveAttempt: boolean;
};

export const SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE = 5;

export type ScheduledTryoutCatalogCard = ScheduledCatalogEntry & {
  subtitle: string;
  questionCountLabel: string;
  durationLabel: string;
  attemptsRemainingLabel: string;
  windowLabel: string;
  isLocked: boolean;
  emphasis: "default" | "accent";
};

export type ScheduledOpsEvent = {
  id: string;
  title: string;
  description: string;
  editorialStatus: "draft" | "published";
  accessStartAt: string;
  accessEndAt: string;
  currentCycle: number;
  questionCount: number;
  durationMinutes: number;
};

export type ScheduledOpsEventStatus = "draft" | "upcoming" | "active" | "expired";

export type ScheduledOpsEventRow = ScheduledOpsEvent & {
  status: ScheduledOpsEventStatus;
  statusLabel: "Draft" | "Upcoming" | "Active" | "Expired";
  questionCountLabel: string;
  durationLabel: string;
  windowLabel: string;
};

type ScheduledSessionAttemptInput = {
  id: string;
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  totalQuestions: number;
  timeLimitSeconds: number;
  startedAt: string;
  submittedAt: string | null;
  elapsedSeconds: number;
  lastResumedAt: string | null;
  pausedAt: string | null;
};

type ScheduledSessionItemInput = {
  id: string;
  blockName: string;
  stem: string;
  questionImageUrl: string | null;
  options: Array<{ key: string; text: string }>;
  sortOrder: number;
};

type ScheduledAnswerInput = {
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
};

export type ScheduledTryoutSessionPageData = {
  view: "ready" | "loading" | "empty" | "error";
  attempt: {
    id: string;
    status: "in_progress" | "paused" | "submitted" | "abandoned";
    totalQuestions: number;
    timeRemainingSeconds: number;
  } | null;
  questions: Array<{
    id: string;
    order: number;
    blockLabel: string;
    stem: string;
    questionImageUrl: string | null;
    options: Array<{ key: string; text: string }>;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
  }>;
};

export type ScheduledTryoutResultPageData = {
  attemptId: string;
  eventId: string | null;
  eventCycle: number | null;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredCount: number;
  timeUsedSeconds: number;
  blocks: Array<{
    blockLabel: string;
    correct: number;
    wrong: number;
  }>;
};

export type ScheduledEventLeaderboardState = "live" | "final";

export type ScheduledEventLeaderboardRow = {
  rank: number;
  eventId: string;
  eventCycle: number;
  userId: string;
  alias: string;
  bestScore: number;
  bestScoreAttemptNumber: number;
  attemptId: string;
  submittedAt: string;
};

export type ScheduledEventLeaderboardPageData = {
  state: ScheduledEventLeaderboardState;
  eventId: string;
  eventTitle: string;
  eventCycle: number;
  stateLabel: string;
  helperText: string;
  rows: ScheduledEventLeaderboardRow[];
};

export type ScheduledTryoutReviewPageData = {
  summary: {
    title: string;
    submittedAt: string | null;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    source: "scheduled";
  };
  items: Array<{
    id: string;
    blockLabel: string;
    question: string;
    questionImageUrl: string | null;
    options?: Array<{ key: string; text: string }>;
    selectedOptionKey?: string | null;
    correctOptionKey?: string;
    userAnswer: string | null;
    correctAnswer: string;
    explanationText: string | null;
    explanationImageUrl: string | null;
    isWrong: boolean;
  }>;
};

export type ScheduledEventEditorQuestion = {
  id: string;
  order: number;
  stem: string;
  questionImagePath: string | null;
  questionImageUrl: string | null;
  explanationText: string | null;
  explanationImagePath: string | null;
  explanationImageUrl: string | null;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  correctOptionKey: string;
  options: Array<{
    id: string | null;
    key: string;
    text: string;
    sortOrder: number;
  }>;
};

export type ScheduledEventEditorDataViewModel = {
  event: {
    id: string;
    title: string;
    description: string;
    editorialStatus: "draft" | "published";
    accessStartAt: string;
    accessEndAt: string;
    currentCycle: number;
    updatedAt: string | null;
  };
  questions: ScheduledEventEditorQuestion[];
};

export function formatScheduledDurationAsClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatWindowLabel(accessStartAt: string, accessEndAt: string): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  return `${formatter.format(new Date(accessStartAt))} - ${formatter.format(new Date(accessEndAt))} WIB`;
}

export function mapScheduledCatalogEntriesToCards(
  entries: ScheduledCatalogEntry[],
): ScheduledTryoutCatalogCard[] {
  return entries.map((entry) => ({
    ...entry,
    subtitle: entry.hasActiveAttempt ? "Lanjutkan event aktif" : "Event terjadwal aktif",
    questionCountLabel: `${entry.questionCount} soal`,
    durationLabel: `${entry.durationMinutes} menit`,
    attemptsRemainingLabel: `${entry.remainingAttempts} dari ${SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE} attempt tersisa`,
    windowLabel: formatWindowLabel(entry.accessStartAt, entry.accessEndAt),
    isLocked: entry.remainingAttempts <= 0 && !entry.hasActiveAttempt,
    emphasis: entry.hasActiveAttempt ? "accent" : "default",
  }));
}

export function mapScheduledEventLeaderboardToPageData(
  input: {
    state: ScheduledEventLeaderboardState;
    eventId: string;
    eventTitle: string;
    eventCycle: number;
    rows: ScheduledEventLeaderboardRow[];
  },
): ScheduledEventLeaderboardPageData {
  return {
    state: input.state,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    eventCycle: input.eventCycle,
    stateLabel: input.state === "live" ? "Leaderboard sementara" : "Leaderboard final",
    helperText: input.state === "live"
      ? "Peringkat ini masih bisa berubah sampai event berakhir."
      : "Peringkat ini sudah final untuk event yang telah berakhir.",
    rows: [...input.rows],
  };
}

export function deriveScheduledOpsEventStatus(
  event: ScheduledOpsEvent,
  now = new Date(),
): ScheduledOpsEventStatus {
  if (event.editorialStatus === "draft") {
    return "draft";
  }

  const accessStartAt = new Date(event.accessStartAt).getTime();
  const accessEndAt = new Date(event.accessEndAt).getTime();
  const nowTime = now.getTime();

  if (nowTime < accessStartAt) {
    return "upcoming";
  }

  if (nowTime >= accessEndAt) {
    return "expired";
  }

  return "active";
}

function formatStatusLabel(status: ScheduledOpsEventStatus): ScheduledOpsEventRow["statusLabel"] {
  switch (status) {
    case "draft":
      return "Draft";
    case "upcoming":
      return "Upcoming";
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    default:
      return "Draft";
  }
}

export function mapScheduledOpsEventsToRows(
  events: ScheduledOpsEvent[],
  now = new Date(),
): ScheduledOpsEventRow[] {
  return events.map((event) => {
    const status = deriveScheduledOpsEventStatus(event, now);

    return {
      ...event,
      status,
      statusLabel: formatStatusLabel(status),
      questionCountLabel: `${event.questionCount} soal`,
      durationLabel: `${event.durationMinutes} menit`,
      windowLabel: formatWindowLabel(event.accessStartAt, event.accessEndAt),
    };
  });
}

function calculateScheduledElapsedSeconds(
  attempt: ScheduledSessionAttemptInput,
  now: Date,
): number {
  const activeSegmentSeconds = attempt.status === "in_progress" && attempt.lastResumedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
    : attempt.status === "submitted" && attempt.submittedAt && attempt.lastResumedAt
      ? Math.max(0, Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
      : 0;

  return Math.max(0, attempt.elapsedSeconds + activeSegmentSeconds);
}

export function mapScheduledAttemptSessionPageData(
  {
    attempt,
    items,
    answers,
    now = new Date(),
  }: {
    attempt: ScheduledSessionAttemptInput | null;
    items: ScheduledSessionItemInput[];
    answers: ScheduledAnswerInput[];
    now?: Date;
  },
): ScheduledTryoutSessionPageData {
  if (!attempt) {
    return {
      view: "empty",
      attempt: null,
      questions: [],
    };
  }

  if (items.length === 0) {
    return {
      view: "empty",
      attempt: {
        id: attempt.id,
        status: attempt.status,
        totalQuestions: attempt.totalQuestions,
        timeRemainingSeconds: 0,
      },
      questions: [],
    };
  }

  const answerLookup = new Map(
    answers.map((answer) => [
      answer.attemptItemId,
      {
        selectedOptionKey: answer.selectedOptionKey,
        isDoubtful: answer.isDoubtful,
      },
    ]),
  );
  const timeRemainingSeconds = Math.max(
    0,
    attempt.timeLimitSeconds - calculateScheduledElapsedSeconds(attempt, now),
  );

  return {
    view: "ready",
    attempt: {
      id: attempt.id,
      status: attempt.status,
      totalQuestions: attempt.totalQuestions,
      timeRemainingSeconds,
    },
    questions: items.map((item) => {
      const answerState = answerLookup.get(item.id) ?? {
        selectedOptionKey: null,
        isDoubtful: false,
      };

      return {
        id: item.id,
        order: item.sortOrder,
        blockLabel: item.blockName,
        stem: item.stem,
        questionImageUrl: item.questionImageUrl,
        options: item.options,
        selectedOptionKey: answerState.selectedOptionKey,
        isDoubtful: answerState.isDoubtful,
      };
    }),
  };
}

export function mapScheduledAttemptResultToPageData(
  result: {
    attemptId: string;
    eventId: string | null;
    eventCycle: number | null;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    unansweredCount: number;
    timeUsedSeconds: number;
    blockSummary: Array<{ name: string; correct: number; wrong: number }>;
  },
): ScheduledTryoutResultPageData {
  return {
    attemptId: result.attemptId,
    eventId: result.eventId,
    eventCycle: result.eventCycle,
    score: result.score,
    correctAnswers: result.correctAnswers,
    wrongAnswers: result.wrongAnswers,
    unansweredCount: result.unansweredCount,
    timeUsedSeconds: result.timeUsedSeconds,
    blocks: result.blockSummary.map((block) => ({
      blockLabel: block.name,
      correct: block.correct,
      wrong: block.wrong,
    })),
  };
}

export function mapScheduledAttemptReviewPageData(
  {
    summary,
    items,
    answers,
  }: {
    summary: {
      title: string;
      submittedAt: string | null;
      score: number;
      correctAnswers: number;
      wrongAnswers: number;
    };
    items: Array<{
      id: string;
      blockName: string;
      stem: string;
      questionImageUrl: string | null;
      options: Array<{ key: string; text: string }>;
      correctOptionKey: string;
      explanationText: string | null;
      explanationImageUrl: string | null;
    }>;
    answers: Array<{
      attemptItemId: string;
      selectedOptionKey: string | null;
    }>;
  },
): ScheduledTryoutReviewPageData {
  const answerLookup = new Map(
    answers.map((answer) => [answer.attemptItemId, answer.selectedOptionKey]),
  );

  return {
    summary: {
      ...summary,
      source: "scheduled",
    },
    items: items.map((item) => {
      const selectedOptionKey = answerLookup.get(item.id) ?? null;
      const selectedOption = item.options.find((option) => option.key === selectedOptionKey) ?? null;
      const correctOption = item.options.find((option) => option.key === item.correctOptionKey);

      return {
        id: item.id,
        blockLabel: item.blockName,
        question: item.stem,
        questionImageUrl: item.questionImageUrl,
        options: item.options,
        selectedOptionKey,
        correctOptionKey: item.correctOptionKey,
        userAnswer: selectedOption?.text ?? null,
        correctAnswer: correctOption?.text ?? "Jawaban benar belum tersedia.",
        explanationText:
          item.explanationText ?? (item.explanationImageUrl ? null : "Pembahasan belum ditulis final oleh tim editorial."),
        explanationImageUrl: item.explanationImageUrl,
        isWrong: selectedOptionKey !== item.correctOptionKey,
      };
    }),
  };
}

export function mapScheduledEventEditorData(
  input: ScheduledEventEditorDataViewModel,
): ScheduledEventEditorDataViewModel {
  return {
    event: input.event,
    questions: [...input.questions]
      .sort((left, right) => left.order - right.order)
      .map((question) => ({
        ...question,
        options: [...question.options].sort((left, right) => left.sortOrder - right.sortOrder),
      })),
  };
}
