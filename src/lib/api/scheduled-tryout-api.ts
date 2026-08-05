import { getSupabaseBrowserClient } from "../supabase/browser-client";
import {
  mapScheduledAttemptResultToPageData,
  mapScheduledAttemptReviewPageData,
  mapScheduledAttemptSessionPageData,
  mapScheduledEventEditorData,
  mapScheduledOpsEventsToRows,
  SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE,
  type ScheduledCatalogEntry,
  type ScheduledEventLeaderboardRow,
  type ScheduledEventLeaderboardState,
  type ScheduledEventEditorDataViewModel,
  type ScheduledOpsEvent,
  type ScheduledOpsEventRow,
  type ScheduledTryoutResultPageData,
  type ScheduledTryoutReviewPageData,
  type ScheduledTryoutSessionPageData,
} from "../mappers/scheduled-tryout-mappers";

type ScheduledTryoutClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from" | "rpc" | "storage">;

type RelatedNameRow = {
  id?: string;
  name: string;
};

type ScheduledEventRow = {
  id: string;
  title: string;
  description: string;
  editorial_status: "draft" | "published";
  access_start_at: string;
  access_end_at: string;
  current_cycle: number;
  updated_at?: string | null;
};

type ScheduledAttemptRow = {
  id: string;
  event_id: string;
  event_cycle: number;
  user_id: string;
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  started_at: string;
  submitted_at: string | null;
  time_limit_seconds: number;
  elapsed_seconds: number;
  last_resumed_at: string | null;
  paused_at: string | null;
  total_questions: number;
};

type ScheduledAttemptItemRow = {
  id: string;
  attempt_id: string;
  event_question_id: string | null;
  block_id_snapshot: string | null;
  question_snapshot: string;
  question_image_path_snapshot: string | null;
  options_snapshot: Array<{ key: string; text: string }>;
  correct_option_key_snapshot: string;
  sort_order: number;
  explanation_text_snapshot?: string | null;
  explanation_image_path_snapshot?: string | null;
  block?: RelatedNameRow | RelatedNameRow[] | null;
};

type ScheduledAnswerRow = {
  attempt_id: string;
  attempt_item_id: string;
  selected_option_key: string | null;
  is_doubtful: boolean;
  answered_at: string | null;
};

type ScheduledAttemptResultRow = {
  attempt_id: string;
  score_percentage: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
};

type ScheduledEventLeaderboardRowRpc = {
  rank: number;
  event_id: string;
  event_cycle: number;
  user_id: string;
  alias: string;
  best_score: number;
  best_score_attempt_number: number;
  attempt_id: string;
  submitted_at: string;
  leaderboard_state: ScheduledEventLeaderboardState;
};

type ScheduledEventQuestionOptionRow = {
  id: string;
  option_key: string;
  option_text: string;
  sort_order: number;
};

type ScheduledEventQuestionRow = {
  id: string;
  event_id: string;
  question_order: number;
  stem: string;
  question_image_path: string | null;
  explanation_text: string | null;
  explanation_image_path: string | null;
  correct_option_key: string;
  block?: RelatedNameRow | RelatedNameRow[] | null;
  topic?: RelatedNameRow | RelatedNameRow[] | null;
  options?: ScheduledEventQuestionOptionRow[] | null;
};

type ScheduledSubmittedAttemptHistoryRow = {
  id: string;
  submitted_at: string;
  event?: {
    title: string;
  } | Array<{
    title: string;
  }> | null;
  result?: {
    score_percentage: number;
    correct_count: number;
    wrong_count: number;
  } | Array<{
    score_percentage: number;
    correct_count: number;
    wrong_count: number;
  }> | null;
};

const SCHEDULED_ACCESS_TIMEZONE_OFFSET_MINUTES = 7 * 60;

export type ScheduledPersistedAttempt = {
  id: string;
  eventId: string;
  eventCycle: number;
  userId: string;
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  startedAt: string;
  submittedAt: string | null;
  timeLimitSeconds: number;
  elapsedSeconds: number;
  lastResumedAt: string | null;
  pausedAt: string | null;
  totalQuestions: number;
};

export type ScheduledPersistedAnswer = {
  attemptId: string;
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
  answeredAt: string | null;
};

export type ScheduledActiveAttemptSummary = {
  attemptId: string;
  eventId: string;
  status: "in_progress" | "paused";
  title: string;
  answeredCount: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
  accessEndAt: string | null;
};

export type ScheduledOpsEventSummary = ScheduledOpsEventRow;

export type ScheduledEventQuestionDraftInput = {
  id?: string | null;
  stem: string;
  questionImagePath?: string | null;
  blockId?: string | null;
  topicId?: string | null;
  correctOptionKey: string;
  explanationText?: string | null;
  explanationImagePath?: string | null;
  options: Array<{
    key: string;
    text: string;
  }>;
};

export type ScheduledEventMutationInput = {
  title: string;
  description: string;
  editorialStatus: "draft" | "published";
  accessStartAt: string;
  accessEndAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  questions: ScheduledEventQuestionDraftInput[];
};

export type ScheduledSubmittedAttemptHistoryItem = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: "scheduled";
};

export type ScheduledEventLeaderboardData = {
  state: ScheduledEventLeaderboardState;
  eventId: string;
  eventTitle: string;
  eventCycle: number;
  rows: ScheduledEventLeaderboardRow[];
};

function resolveRelatedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "image";
}

function createScheduledMediaPath(
  eventId: string,
  kind: "question" | "explanation",
  fileName: string,
) {
  const uniqueSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${kind}/scheduled-events/${eventId}/${uniqueSuffix}-${sanitizeFileName(fileName)}`;
}

function padDateTimeInputPart(value: number) {
  return String(value).padStart(2, "0");
}

function formatScheduledAccessForInput(value: string): string {
  const utcDate = new Date(value);

  if (Number.isNaN(utcDate.getTime())) {
    return value;
  }

  const localDate = new Date(
    utcDate.getTime() + (SCHEDULED_ACCESS_TIMEZONE_OFFSET_MINUTES * 60 * 1000),
  );

  return [
    localDate.getUTCFullYear(),
    padDateTimeInputPart(localDate.getUTCMonth() + 1),
    padDateTimeInputPart(localDate.getUTCDate()),
  ].join("-") + `T${padDateTimeInputPart(localDate.getUTCHours())}:${padDateTimeInputPart(localDate.getUTCMinutes())}`;
}

function normalizeScheduledAccessInput(value: string): string {
  const normalizedValue = value.trim();
  const localInputMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (localInputMatch) {
    const [, year, month, day, hour, minute] = localInputMatch;
    const utcTimestamp = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) - SCHEDULED_ACCESS_TIMEZONE_OFFSET_MINUTES,
      0,
      0,
    );

    return new Date(utcTimestamp).toISOString();
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue;
  }

  return parsedDate.toISOString();
}

async function createSignedMediaUrl(
  client: ScheduledTryoutClient,
  path: string | null,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage
    .from("question-media")
    .createSignedUrl(path, 3600);

  if (error) {
    if (/object not found/i.test(error.message)) {
      return null;
    }

    throw new Error(error.message);
  }

  return data?.signedUrl ?? null;
}

function mapAttempt(row: ScheduledAttemptRow): ScheduledPersistedAttempt {
  return {
    id: row.id,
    eventId: row.event_id,
    eventCycle: row.event_cycle,
    userId: row.user_id,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    timeLimitSeconds: row.time_limit_seconds,
    elapsedSeconds: row.elapsed_seconds,
    lastResumedAt: row.last_resumed_at,
    pausedAt: row.paused_at,
    totalQuestions: row.total_questions,
  };
}

function mapAnswer(row: ScheduledAnswerRow): ScheduledPersistedAnswer {
  return {
    attemptId: row.attempt_id,
    attemptItemId: row.attempt_item_id,
    selectedOptionKey: row.selected_option_key,
    isDoubtful: row.is_doubtful,
    answeredAt: row.answered_at,
  };
}

function calculateAttemptTimeUsedSeconds(
  attempt: ScheduledPersistedAttempt,
  now: Date,
): number {
  const activeSegmentSeconds = attempt.status === "in_progress" && attempt.lastResumedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
    : attempt.status === "submitted" && attempt.submittedAt && attempt.lastResumedAt
      ? Math.max(0, Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
      : 0;

  return Math.max(0, attempt.elapsedSeconds + activeSegmentSeconds);
}

function calculateTimeRemainingSeconds(
  attempt: ScheduledPersistedAttempt,
  now: Date,
): number {
  return Math.max(0, attempt.timeLimitSeconds - calculateAttemptTimeUsedSeconds(attempt, now));
}

function isActiveEvent(row: ScheduledEventRow, now: Date): boolean {
  const nowTime = now.getTime();
  const startTime = new Date(row.access_start_at).getTime();
  const endTime = new Date(row.access_end_at).getTime();

  return nowTime >= startTime && nowTime < endTime;
}

async function getScheduledAttemptById(
  client: ScheduledTryoutClient,
  attemptId: string,
): Promise<ScheduledPersistedAttempt | null> {
  const { data, error } = await client
    .from("scheduled_tryout_attempts")
    .select("id, event_id, event_cycle, user_id, status, started_at, submitted_at, time_limit_seconds, elapsed_seconds, last_resumed_at, paused_at, total_questions")
    .eq("id", attemptId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAttempt(data as ScheduledAttemptRow) : null;
}

async function getScheduledAttemptItemsByAttemptId(
  client: ScheduledTryoutClient,
  attemptId: string,
): Promise<Array<{
  id: string;
  blockName: string;
  stem: string;
  questionImagePath: string | null;
  options: Array<{ key: string; text: string }>;
  correctOptionKey: string;
  sortOrder: number;
  explanationText: string | null;
  explanationImagePath: string | null;
}>> {
  const { data, error } = await client
    .from("scheduled_tryout_attempt_items")
    .select("id, attempt_id, event_question_id, block_id_snapshot, question_snapshot, question_image_path_snapshot, options_snapshot, correct_option_key_snapshot, sort_order, explanation_text_snapshot, explanation_image_path_snapshot, block:blocks(name)")
    .eq("attempt_id", attemptId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as ScheduledAttemptItemRow[] | null) ?? [];

  return rows.map((row) => ({
    id: row.id,
    blockName: resolveRelatedRow(row.block)?.name ?? "Tanpa blok",
    stem: row.question_snapshot,
    questionImagePath: row.question_image_path_snapshot,
    options: row.options_snapshot ?? [],
    correctOptionKey: row.correct_option_key_snapshot,
    sortOrder: row.sort_order,
    explanationText: row.explanation_text_snapshot ?? null,
    explanationImagePath: row.explanation_image_path_snapshot ?? null,
  }));
}

async function getScheduledAnswersByAttemptId(
  client: ScheduledTryoutClient,
  attemptId: string,
): Promise<ScheduledPersistedAnswer[]> {
  const { data, error } = await client
    .from("scheduled_tryout_answers")
    .select("attempt_id, attempt_item_id, selected_option_key, is_doubtful, answered_at")
    .eq("attempt_id", attemptId)
    .order("answered_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as ScheduledAnswerRow[] | null) ?? []).map(mapAnswer);
}

function buildBlockSummary(
  items: Array<{
    id: string;
    blockName: string;
    correctOptionKey: string;
  }>,
  answers: ScheduledPersistedAnswer[],
): Array<{ name: string; correct: number; wrong: number }> {
  const answerLookup = new Map(
    answers.map((answer) => [answer.attemptItemId, answer.selectedOptionKey]),
  );
  const summary = new Map<string, { name: string; correct: number; wrong: number }>();

  for (const item of items) {
    const entry = summary.get(item.blockName) ?? {
      name: item.blockName,
      correct: 0,
      wrong: 0,
    };
    const selectedOptionKey = answerLookup.get(item.id) ?? null;

    if (selectedOptionKey === item.correctOptionKey) {
      entry.correct += 1;
    } else if (selectedOptionKey !== null) {
      entry.wrong += 1;
    }

    summary.set(item.blockName, entry);
  }

  return Array.from(summary.values());
}

async function persistScheduledEventQuestions(
  client: ScheduledTryoutClient,
  {
    eventId,
    questions,
  }: {
    eventId: string;
    questions: ScheduledEventQuestionDraftInput[];
  },
): Promise<void> {
  const { data: existingRows, error: existingError } = await client
    .from("scheduled_tryout_event_questions")
    .select("id")
    .eq("event_id", eventId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = ((existingRows as Array<{ id: string }> | null) ?? []).map((row) => row.id);
  const incomingIds = new Set(
    questions.map((question) => question.id).filter((value): value is string => Boolean(value)),
  );

  for (const existingId of existingIds) {
    if (incomingIds.has(existingId)) {
      continue;
    }

    const { error } = await client
      .from("scheduled_tryout_event_questions")
      .delete()
      .eq("id", existingId);

    if (error) {
      throw new Error(error.message);
    }
  }

  for (const [index, question] of questions.entries()) {
    const payload = {
      event_id: eventId,
      question_order: index + 1,
      stem: question.stem,
      question_image_path: question.questionImagePath ?? null,
      block_id: question.blockId ?? null,
      topic_id: question.topicId ?? null,
      correct_option_key: question.correctOptionKey,
      explanation_text: question.explanationText ?? null,
      explanation_image_path: question.explanationImagePath ?? null,
    };
    let eventQuestionId = question.id ?? null;

    if (eventQuestionId) {
      const { data, error } = await client
        .from("scheduled_tryout_event_questions")
        .update(payload)
        .eq("id", eventQuestionId)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Soal event terjadwal belum berhasil diperbarui.");
      }
    } else {
      const { data, error } = await client
        .from("scheduled_tryout_event_questions")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Soal event terjadwal belum berhasil dibuat.");
      }

      eventQuestionId = (data as { id: string }).id;
    }

    const { error: deleteOptionsError } = await client
      .from("scheduled_tryout_event_question_options")
      .delete()
      .eq("event_question_id", eventQuestionId);

    if (deleteOptionsError) {
      throw new Error(deleteOptionsError.message);
    }

    const { error: optionsError } = await client
      .from("scheduled_tryout_event_question_options")
      .insert(
        question.options.map((option, optionIndex) => ({
          event_question_id: eventQuestionId,
          option_key: option.key,
          option_text: option.text,
          sort_order: optionIndex + 1,
        })),
      )
      .select("id");

    if (optionsError) {
      throw new Error(optionsError.message);
    }
  }
}

export async function listScheduledTryoutCatalogEntries(
  {
    client = getSupabaseBrowserClient(),
    userId,
    now = new Date(),
  }: {
    client?: ScheduledTryoutClient;
    userId: string;
    now?: Date;
  },
): Promise<ScheduledCatalogEntry[]> {
  const { data: eventData, error: eventError } = await client
    .from("scheduled_tryout_events")
    .select("id, title, description, editorial_status, access_start_at, access_end_at, current_cycle")
    .eq("editorial_status", "published")
    .order("access_start_at", { ascending: true });

  if (eventError) {
    throw new Error(eventError.message);
  }

  const activeEvents = ((eventData as ScheduledEventRow[] | null) ?? [])
    .filter((row) => isActiveEvent(row, now));

  if (activeEvents.length === 0) {
    return [];
  }

  const eventIds = activeEvents.map((event) => event.id);
  const { data: questionData, error: questionError } = await client
    .from("scheduled_tryout_event_questions")
    .select("id, event_id")
    .in("event_id", eventIds);

  if (questionError) {
    throw new Error(questionError.message);
  }

  const attemptsResponse = await client
    .from("scheduled_tryout_attempts")
    .select("event_id, event_cycle, status")
    .in("event_id", eventIds)
    .eq("user_id", userId);

  if (attemptsResponse.error) {
    throw new Error(attemptsResponse.error.message);
  }

  const questionRows = ((questionData as Array<{ id: string; event_id: string }> | null) ?? []);
  const attemptRows = ((attemptsResponse.data as Array<{
    event_id: string;
    event_cycle: number;
    status: "in_progress" | "paused" | "submitted" | "abandoned";
  }> | null) ?? []);

  return activeEvents.map((event) => {
    const questionCount = questionRows.filter((row) => row.event_id === event.id).length;
    const cycleAttempts = attemptRows.filter((row) =>
      row.event_id === event.id && row.event_cycle === event.current_cycle);
    const submittedAttemptCount = cycleAttempts.filter((row) => row.status === "submitted").length;
    const hasActiveAttempt = cycleAttempts.some((row) => row.status === "in_progress" || row.status === "paused");

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      accessStartAt: event.access_start_at,
      accessEndAt: event.access_end_at,
      currentCycle: event.current_cycle,
      questionCount,
      durationMinutes: questionCount,
      remainingAttempts: Math.max(0, SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE - submittedAttemptCount),
      submittedAttemptCount,
      hasActiveAttempt,
    };
  });
}

export async function getScheduledEventLeaderboard(
  {
    client = getSupabaseBrowserClient(),
    eventId,
    eventCycle = null,
    now = new Date(),
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
    eventCycle?: number | null;
    now?: Date;
  },
): Promise<ScheduledEventLeaderboardData> {
  const { data: eventData, error: eventError } = await client
    .from("scheduled_tryout_events")
    .select("id, title, access_end_at, current_cycle")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (!(eventData as {
    id?: string;
    title?: string;
    access_end_at?: string;
    current_cycle?: number;
  } | null)?.id) {
    throw new Error("Event try out terjadwal tidak ditemukan.");
  }

  const event = eventData as {
    id: string;
    title: string;
    access_end_at: string;
    current_cycle: number;
  };
  const resolvedEventCycle = eventCycle ?? event.current_cycle;
  const { data, error } = await client.rpc("get_scheduled_event_leaderboard", {
    target_event_id: eventId,
    target_event_cycle: resolvedEventCycle,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as ScheduledEventLeaderboardRowRpc[] | null) ?? []);
  const derivedState: ScheduledEventLeaderboardState = resolvedEventCycle !== event.current_cycle
    ? "final"
    : new Date(event.access_end_at).getTime() > now.getTime()
      ? "live"
      : "final";

  return {
    state: rows[0]?.leaderboard_state ?? derivedState,
    eventId: event.id,
    eventTitle: event.title,
    eventCycle: resolvedEventCycle,
    rows: rows.map((row) => ({
      rank: row.rank,
      eventId: row.event_id,
      eventCycle: row.event_cycle,
      userId: row.user_id,
      alias: row.alias,
      bestScore: row.best_score,
      bestScoreAttemptNumber: row.best_score_attempt_number,
      attemptId: row.attempt_id,
      submittedAt: row.submitted_at,
    })),
  };
}

export async function findActiveScheduledAttemptForUser(
  {
    client = getSupabaseBrowserClient(),
    userId,
    now = new Date(),
  }: {
    client?: ScheduledTryoutClient;
    userId: string;
    now?: Date;
  },
): Promise<ScheduledActiveAttemptSummary | null> {
  const { data, error } = await client
    .from("scheduled_tryout_attempts")
    .select("id, event_id, event_cycle, user_id, status, started_at, submitted_at, time_limit_seconds, elapsed_seconds, last_resumed_at, paused_at, total_questions")
    .eq("user_id", userId)
    .in("status", ["in_progress", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const attempt = mapAttempt(data as ScheduledAttemptRow);
  const answersResponse = await client
    .from("scheduled_tryout_answers")
    .select("attempt_item_id", {
      count: "exact",
      head: true,
    })
    .eq("attempt_id", attempt.id)
    .not("selected_option_key", "is", null);

  if (answersResponse.error) {
    throw new Error(answersResponse.error.message);
  }

  const { data: eventData, error: eventError } = await client
    .from("scheduled_tryout_events")
    .select("id, title, access_end_at")
    .eq("id", attempt.eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  return {
    attemptId: attempt.id,
    eventId: attempt.eventId,
    status: attempt.status === "paused" ? "paused" : "in_progress",
    title: ((eventData as { title?: string } | null)?.title) ?? "Try Out Terjadwal",
    answeredCount: answersResponse.count ?? 0,
    totalQuestions: attempt.totalQuestions,
    timeRemainingSeconds: calculateTimeRemainingSeconds(attempt, now),
    accessEndAt: ((eventData as { access_end_at?: string } | null)?.access_end_at) ?? null,
  };
}

export async function createScheduledTryoutAttempt(
  {
    client = getSupabaseBrowserClient(),
    eventId,
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
  },
): Promise<ScheduledPersistedAttempt> {
  const { data, error } = await client.rpc("start_scheduled_tryout_attempt", {
    target_event_id: eventId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAttempt(data as ScheduledAttemptRow);
}

export async function getScheduledAttemptSessionPageData(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
    now = new Date(),
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
    now?: Date;
  },
): Promise<ScheduledTryoutSessionPageData> {
  const syncResponse = await client.rpc("sync_scheduled_tryout_attempt", {
    target_attempt_id: attemptId,
  });

  if (syncResponse.error) {
    throw new Error(syncResponse.error.message);
  }

  const [attempt, items, answers] = await Promise.all([
    getScheduledAttemptById(client, attemptId),
    getScheduledAttemptItemsByAttemptId(client, attemptId),
    getScheduledAnswersByAttemptId(client, attemptId),
  ]);

  return mapScheduledAttemptSessionPageData({
    attempt,
    items: await Promise.all(
      items.map(async (item) => ({
        ...item,
        questionImageUrl: await createSignedMediaUrl(client, item.questionImagePath),
      })),
    ),
    answers,
    now,
  });
}

export async function saveScheduledTryoutAnswer(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
    attemptItemId,
    selectedOptionKey,
    isDoubtful,
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
    attemptItemId: string;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
  },
): Promise<ScheduledPersistedAnswer> {
  const { data, error } = await client.rpc("save_scheduled_tryout_answer", {
    target_attempt_id: attemptId,
    target_attempt_item_id: attemptItemId,
    selected_option_key: selectedOptionKey,
    is_doubtful: selectedOptionKey ? isDoubtful : false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAnswer(data as ScheduledAnswerRow);
}

export async function pauseScheduledTryoutAttempt(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
  },
): Promise<ScheduledPersistedAttempt> {
  const { data, error } = await client.rpc("pause_scheduled_tryout_attempt", {
    target_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAttempt(data as ScheduledAttemptRow);
}

export async function resumeScheduledTryoutAttempt(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
  },
): Promise<ScheduledPersistedAttempt> {
  const { data, error } = await client.rpc("resume_scheduled_tryout_attempt", {
    target_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAttempt(data as ScheduledAttemptRow);
}

export async function submitScheduledTryoutAttempt(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
  },
): Promise<ScheduledAttemptResultRow> {
  const { data, error } = await client.rpc("submit_scheduled_tryout_attempt", {
    target_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ScheduledAttemptResultRow;
}

export async function getScheduledAttemptResultPageData(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
  },
): Promise<ScheduledTryoutResultPageData | null> {
  const { data, error } = await client
    .from("scheduled_tryout_attempt_results")
    .select("attempt_id, score_percentage, correct_count, wrong_count, unanswered_count")
    .eq("attempt_id", attemptId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [attempt, items, answers] = await Promise.all([
    getScheduledAttemptById(client, attemptId),
    getScheduledAttemptItemsByAttemptId(client, attemptId),
    getScheduledAnswersByAttemptId(client, attemptId),
  ]);

  return mapScheduledAttemptResultToPageData({
    attemptId: (data as ScheduledAttemptResultRow).attempt_id,
    eventId: attempt?.eventId ?? null,
    eventCycle: attempt?.eventCycle ?? null,
    score: (data as ScheduledAttemptResultRow).score_percentage,
    correctAnswers: (data as ScheduledAttemptResultRow).correct_count,
    wrongAnswers: (data as ScheduledAttemptResultRow).wrong_count,
    unansweredCount: (data as ScheduledAttemptResultRow).unanswered_count,
    timeUsedSeconds: attempt ? calculateAttemptTimeUsedSeconds(attempt, new Date(attempt.submittedAt ?? attempt.startedAt)) : 0,
    blockSummary: buildBlockSummary(items, answers),
  });
}

export async function listScheduledOpsEvents(
  {
    client = getSupabaseBrowserClient(),
    now = new Date(),
  }: {
    client?: ScheduledTryoutClient;
    now?: Date;
  } = {},
): Promise<ScheduledOpsEventSummary[]> {
  const { data: eventData, error: eventError } = await client
    .from("scheduled_tryout_events")
    .select("id, title, description, editorial_status, access_start_at, access_end_at, current_cycle")
    .order("access_start_at", { ascending: false });

  if (eventError) {
    throw new Error(eventError.message);
  }

  const eventRows = (eventData as ScheduledEventRow[] | null) ?? [];
  const eventIds = eventRows.map((event) => event.id);
  const { data: questionData, error: questionError } = await client
    .from("scheduled_tryout_event_questions")
    .select("id, event_id")
    .in("event_id", eventIds);

  if (questionError) {
    throw new Error(questionError.message);
  }

  const questionRows = ((questionData as Array<{ id: string; event_id: string }> | null) ?? []);
  const rows: ScheduledOpsEvent[] = eventRows.map((event) => {
    const questionCount = questionRows.filter((row) => row.event_id === event.id).length;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      editorialStatus: event.editorial_status,
      accessStartAt: event.access_start_at,
      accessEndAt: event.access_end_at,
      currentCycle: event.current_cycle,
      questionCount,
      durationMinutes: questionCount,
    };
  });

  return mapScheduledOpsEventsToRows(rows, now);
}

export async function getScheduledEventEditorData(
  {
    client = getSupabaseBrowserClient(),
    eventId,
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
  },
): Promise<ScheduledEventEditorDataViewModel | null> {
  const { data: eventData, error: eventError } = await client
    .from("scheduled_tryout_events")
    .select("id, title, description, editorial_status, access_start_at, access_end_at, current_cycle, updated_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (!eventData) {
    return null;
  }

  const { data: questionData, error: questionError } = await client
    .from("scheduled_tryout_event_questions")
    .select("id, event_id, question_order, stem, question_image_path, explanation_text, explanation_image_path, correct_option_key, block:blocks(id, name), topic:topics(id, name), options:scheduled_tryout_event_question_options(id, option_key, option_text, sort_order)")
    .eq("event_id", eventId)
    .order("question_order", { ascending: true });

  if (questionError) {
    throw new Error(questionError.message);
  }

  const questions = await Promise.all(
    ((questionData as ScheduledEventQuestionRow[] | null) ?? []).map(async (row) => {
      const block = resolveRelatedRow(row.block);
      const topic = resolveRelatedRow(row.topic);

      return {
        id: row.id,
        order: row.question_order,
        stem: row.stem,
        questionImagePath: row.question_image_path,
        questionImageUrl: await createSignedMediaUrl(client, row.question_image_path),
        explanationText: row.explanation_text,
        explanationImagePath: row.explanation_image_path,
        explanationImageUrl: await createSignedMediaUrl(client, row.explanation_image_path),
        blockId: block?.id ?? null,
        blockName: block?.name ?? null,
        topicId: topic?.id ?? null,
        topicName: topic?.name ?? null,
        correctOptionKey: row.correct_option_key,
        options: (row.options ?? []).map((option) => ({
          id: option.id,
          key: option.option_key,
          text: option.option_text,
          sortOrder: option.sort_order,
        })),
      };
    }),
  );

  return mapScheduledEventEditorData({
    event: {
      id: (eventData as ScheduledEventRow).id,
      title: (eventData as ScheduledEventRow).title,
      description: (eventData as ScheduledEventRow).description,
      editorialStatus: (eventData as ScheduledEventRow).editorial_status,
      accessStartAt: formatScheduledAccessForInput((eventData as ScheduledEventRow).access_start_at),
      accessEndAt: formatScheduledAccessForInput((eventData as ScheduledEventRow).access_end_at),
      currentCycle: (eventData as ScheduledEventRow).current_cycle,
      updatedAt: (eventData as ScheduledEventRow).updated_at ?? null,
    },
    questions,
  });
}

export async function createScheduledEvent(
  {
    client = getSupabaseBrowserClient(),
    input,
  }: {
    client?: ScheduledTryoutClient;
    input: ScheduledEventMutationInput;
  },
): Promise<{ id: string }> {
  const payload = {
    ...input,
    accessStartAt: normalizeScheduledAccessInput(input.accessStartAt),
    accessEndAt: normalizeScheduledAccessInput(input.accessEndAt),
    createdBy: input.createdBy ?? null,
    updatedBy: input.updatedBy ?? input.createdBy ?? null,
  };
  const { data, error } = await client.rpc("upsert_scheduled_tryout_event", {
    target_event_id: null,
    payload,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Event try out terjadwal belum berhasil dibuat.");
  }

  return { id: (data as { id: string }).id };
}

export async function updateScheduledEvent(
  {
    client = getSupabaseBrowserClient(),
    eventId,
    input,
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
    input: ScheduledEventMutationInput;
  },
): Promise<{ id: string }> {
  const payload = {
    ...input,
    accessStartAt: normalizeScheduledAccessInput(input.accessStartAt),
    accessEndAt: normalizeScheduledAccessInput(input.accessEndAt),
    updatedBy: input.updatedBy ?? null,
  };
  const { data, error } = await client.rpc("upsert_scheduled_tryout_event", {
    target_event_id: eventId,
    payload,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Event try out terjadwal belum berhasil diperbarui.");
  }

  return { id: (data as { id: string }).id };
}

export async function reactivateScheduledEvent(
  {
    client = getSupabaseBrowserClient(),
    eventId,
    accessStartAt,
    accessEndAt,
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
    accessStartAt: string;
    accessEndAt: string;
  },
): Promise<ScheduledEventRow> {
  const { data, error } = await client.rpc("reactivate_scheduled_tryout_event", {
    target_event_id: eventId,
    next_access_start_at: normalizeScheduledAccessInput(accessStartAt),
    next_access_end_at: normalizeScheduledAccessInput(accessEndAt),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ScheduledEventRow;
}

export async function deleteScheduledEvent(
  {
    client = getSupabaseBrowserClient(),
    eventId,
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
  },
): Promise<{ deletedId: string }> {
  const { data, error } = await client
    .from("scheduled_tryout_events")
    .delete()
    .eq("id", eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!(data as { id?: string } | null)?.id) {
    throw new Error("Event try out terjadwal belum berhasil dihapus.");
  }

  return {
    deletedId: (data as { id: string }).id,
  };
}

export async function uploadScheduledQuestionMedia(
  {
    client = getSupabaseBrowserClient(),
    eventId,
    kind,
    file,
  }: {
    client?: ScheduledTryoutClient;
    eventId: string;
    kind: "question" | "explanation";
    file: File;
  },
): Promise<{ path: string; signedUrl: string | null }> {
  const path = createScheduledMediaPath(eventId, kind, file.name);
  const { error } = await client.storage
    .from("question-media")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    signedUrl: await createSignedMediaUrl(client, path),
  };
}

export async function listScheduledSubmittedAttemptHistory(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: ScheduledTryoutClient;
    userId: string;
  },
): Promise<ScheduledSubmittedAttemptHistoryItem[]> {
  const { data, error } = await client
    .from("scheduled_tryout_attempts")
    .select("id, submitted_at, event:scheduled_tryout_events(title), result:scheduled_tryout_attempt_results(score_percentage, correct_count, wrong_count)")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as ScheduledSubmittedAttemptHistoryRow[] | null) ?? []).map((row) => {
    const event = resolveRelatedRow(row.event);
    const result = resolveRelatedRow(row.result);

    return {
      attemptId: row.id,
      title: event?.title ?? "Try Out Terjadwal",
      submittedAt: row.submitted_at,
      score: result?.score_percentage ?? 0,
      correctAnswers: result?.correct_count ?? 0,
      wrongAnswers: result?.wrong_count ?? 0,
      source: "scheduled",
    };
  });
}

export async function getScheduledAttemptReviewPageData(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: ScheduledTryoutClient;
    attemptId: string;
  },
): Promise<ScheduledTryoutReviewPageData> {
  const attempt = await getScheduledAttemptById(client, attemptId);

  if (!attempt) {
    throw new Error("Attempt try out terjadwal tidak ditemukan.");
  }

  if (attempt.status !== "submitted") {
    throw new Error("Review try out terjadwal hanya tersedia setelah attempt disubmit.");
  }

  const [eventResponse, resultResponse, items, answers] = await Promise.all([
    client
      .from("scheduled_tryout_events")
      .select("title")
      .eq("id", attempt.eventId)
      .maybeSingle(),
    client
      .from("scheduled_tryout_attempt_results")
      .select("attempt_id, score_percentage, correct_count, wrong_count, unanswered_count")
      .eq("attempt_id", attemptId)
      .maybeSingle(),
    getScheduledAttemptItemsByAttemptId(client, attemptId),
    getScheduledAnswersByAttemptId(client, attemptId),
  ]);

  if (eventResponse.error) {
    throw new Error(eventResponse.error.message);
  }

  if (resultResponse.error) {
    throw new Error(resultResponse.error.message);
  }

  const eventTitle = (eventResponse.data as { title?: string } | null)?.title ?? "Try Out Terjadwal";
  const result = resultResponse.data as ScheduledAttemptResultRow | null;

  return mapScheduledAttemptReviewPageData({
    summary: {
      title: eventTitle,
      submittedAt: attempt.submittedAt,
      score: result?.score_percentage ?? 0,
      correctAnswers: result?.correct_count ?? 0,
      wrongAnswers: result?.wrong_count ?? 0,
    },
    items: await Promise.all(
      items.map(async (item) => ({
        ...item,
        questionImageUrl: await createSignedMediaUrl(client, item.questionImagePath),
        explanationImageUrl: await createSignedMediaUrl(client, item.explanationImagePath),
      })),
    ),
    answers,
  });
}
