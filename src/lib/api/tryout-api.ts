import { getSupabaseBrowserClient } from "../supabase/browser-client";
import {
  mapAttemptResultToPageData,
  mapAttemptReviewPageData,
  mapAttemptSessionPageData,
  type TryoutResultPageData,
  type TryoutReviewPageData,
  type TryoutSessionPageData,
} from "../mappers/tryout-mappers";

type TryoutClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from" | "rpc" | "storage">;

type ExamTemplateRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mode: "full" | "block" | "topic";
  question_count: number;
  duration_minutes: number;
  block_id: string | null;
  topic_id: string | null;
  block_name?: string | null;
  icon_name?: string | null;
  color_theme?: string | null;
  block?: {
    name: string;
    sort_order?: number | null;
    icon_name?: string | null;
    color_theme?: string | null;
  } | Array<{
    name: string;
    sort_order?: number | null;
    icon_name?: string | null;
    color_theme?: string | null;
  }> | null;
  topic?: {
    name: string;
    sort_order?: number | null;
  } | Array<{
    name: string;
    sort_order?: number | null;
  }> | null;
};

type TryoutCatalogEntryRow = {
  mode: "full" | "block" | "topic";
  slug: string;
  title: string;
  description: string;
  block_id: string | null;
  block_name: string | null;
  block_sort_order: number | null;
  icon_name?: string | null;
  color_theme?: string | null;
  topic_id: string | null;
  topic_name: string | null;
  topic_sort_order: number | null;
  session_template_id: string | null;
  duration_minutes: number;
  available_question_count: number;
  required_question_count: number;
  is_startable: boolean;
  disabled_reason: string | null;
};

type TaxonomyBlockRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  icon_name?: string | null;
  color_theme?: string | null;
  topics?: Array<{
    id: string;
    name: string;
    slug: string;
    sort_order: number | null;
    is_active?: boolean | null;
  }> | null;
};

type PublishedQuestionCatalogRow = {
  id: string;
  block_id: string | null;
  topic_id: string | null;
  options?: Array<{
    is_correct: boolean;
  }> | null;
};

type AttemptRow = {
  id: string;
  user_id: string;
  exam_template_id: string;
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  started_at: string;
  submitted_at: string | null;
  time_limit_seconds: number;
  total_questions: number;
  elapsed_seconds: number;
  last_resumed_at: string | null;
  paused_at: string | null;
};

type ActiveAttemptRow = AttemptRow & {
  exam_template?:
    | {
      title: string;
      mode: "full" | "block" | "topic";
    }
    | Array<{
      title: string;
      mode: "full" | "block" | "topic";
    }>
    | null;
};

type AttemptHistoryRow = {
  id: string;
  submitted_at: string;
  exam_template?:
    | {
      title: string;
    }
    | Array<{
      title: string;
    }>
    | null;
  attempt_result?:
    | {
      score: number;
      correct_answers: number;
      wrong_answers: number;
    }
    | Array<{
      score: number;
      correct_answers: number;
      wrong_answers: number;
    }>
    | null;
};

type AttemptReviewSummaryRow = {
  submitted_at: string | null;
  exam_template?:
    | {
      title: string;
    }
    | Array<{
      title: string;
    }>
    | null;
  attempt_result?:
    | {
      score: number;
      correct_answers: number;
      wrong_answers: number;
    }
    | Array<{
      score: number;
      correct_answers: number;
      wrong_answers: number;
    }>
    | null;
};

type AttemptItemRow = {
  id: string;
  question_id: string;
  block_id: string | null;
  block_name: string;
  topic_id: string | null;
  question_stem: string;
  question_image_path: string | null;
  options_snapshot: Array<{ key: string; text: string }>;
  correct_option_key: string;
  sort_order: number;
};

type AnswerRow = {
  attempt_id: string;
  attempt_item_id: string;
  selected_option_key: string | null;
  is_doubtful: boolean;
  answered_at: string;
};

type AttemptResultRow = {
  attempt_id: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered_count: number;
  time_used_seconds: number;
  block_summary: Array<{ name: string; correct: number; wrong: number }>;
  generated_at: string;
};

type QuestionExplanationRow = {
  question_id: string;
  explanation: string | null;
  explanation_image_path: string | null;
};

export type TryoutTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mode: "full" | "block" | "topic";
  questionCount: number;
  durationMinutes: number;
  blockId: string | null;
  blockName: string | null;
  blockSortOrder: number | null;
  iconName?: string | null;
  colorTheme?: string | null;
  topicId: string | null;
  topicName: string | null;
  topicSortOrder: number | null;
};

export type TryoutCatalogEntry = TryoutTemplate & {
  sessionTemplateId: string | null;
  isStartable: boolean;
  disabledReason: string | null;
  availableQuestionCount: number;
  requiredQuestionCount: number;
};

export type PersistedAttempt = {
  id: string;
  userId: string;
  examTemplateId: string;
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  startedAt: string;
  submittedAt: string | null;
  timeLimitSeconds: number;
  totalQuestions: number;
  elapsedSeconds: number;
  lastResumedAt: string | null;
  pausedAt: string | null;
};

export type PersistedAttemptItem = {
  id: string;
  questionId: string;
  blockId: string | null;
  blockName: string;
  topicId: string | null;
  stem: string;
  questionImagePath: string | null;
  options: Array<{ key: string; text: string }>;
  correctOptionKey: string;
  sortOrder: number;
};

export type PersistedAnswer = {
  attemptId: string;
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
  answeredAt: string;
};

export type PersistedAttemptResult = {
  attemptId: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredCount: number;
  timeUsedSeconds: number;
  blockSummary: Array<{ name: string; correct: number; wrong: number }>;
  generatedAt: string;
};

export type SubmittedAttemptHistoryItem = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
};

export type ActiveAttemptSummary = {
  attemptId: string;
  status: "in_progress" | "paused";
  title: string;
  mode: "full" | "block" | "topic";
  answeredCount: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
};

function mapTemplate(row: ExamTemplateRow): TryoutTemplate {
  const relatedBlock = Array.isArray(row.block) ? row.block[0] ?? null : row.block;
  const relatedTopic = Array.isArray(row.topic) ? row.topic[0] ?? null : row.topic;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    mode: row.mode,
    questionCount: row.question_count,
    durationMinutes: row.duration_minutes,
    blockId: row.block_id,
    blockName: relatedBlock?.name ?? row.block_name ?? null,
    blockSortOrder: relatedBlock?.sort_order ?? null,
    iconName: relatedBlock?.icon_name ?? row.icon_name ?? null,
    colorTheme: relatedBlock?.color_theme ?? row.color_theme ?? null,
    topicId: row.topic_id,
    topicName: relatedTopic?.name ?? null,
    topicSortOrder: relatedTopic?.sort_order ?? null,
  };
}

function mapCatalogEntry(row: TryoutCatalogEntryRow): TryoutCatalogEntry {
  return {
    id: row.mode === "full"
      ? "catalog-full"
      : row.mode === "block"
        ? `catalog-block-${row.block_id}`
        : `catalog-topic-${row.topic_id}`,
    slug: row.slug,
    title: row.title,
    description: row.description,
    mode: row.mode,
    questionCount: row.required_question_count,
    durationMinutes: row.duration_minutes,
    blockId: row.block_id,
    blockName: row.block_name,
    blockSortOrder: row.block_sort_order,
    iconName: row.icon_name ?? null,
    colorTheme: row.color_theme ?? null,
    topicId: row.topic_id,
    topicName: row.topic_name,
    topicSortOrder: row.topic_sort_order,
    sessionTemplateId: row.session_template_id,
    isStartable: row.is_startable,
    disabledReason: row.disabled_reason,
    availableQuestionCount: row.available_question_count,
    requiredQuestionCount: row.required_question_count,
  };
}

function shouldFallbackToClientCatalog(message: string): boolean {
  return /list_tryout_catalog_entries/i.test(message)
    && /(does not exist|schema cache|could not find the function|pgrst202)/i.test(message);
}

function buildCatalogDisabledReason(
  availableQuestionCount: number,
  requiredQuestionCount: number,
  hasTemplate: boolean,
): string | null {
  if (availableQuestionCount >= requiredQuestionCount && hasTemplate) {
    return null;
  }

  return `${availableQuestionCount}/${requiredQuestionCount} soal valid siap. ${
    hasTemplate ? "Jumlah soal valid belum mencukupi." : "Template try out belum dipublikasikan."
  }`;
}

function isEligibleCatalogQuestion(question: PublishedQuestionCatalogRow): boolean {
  const options = question.options ?? [];

  return options.length >= 2 && options.some((option) => option.is_correct);
}

async function listTryoutCatalogEntriesFallback(
  client: TryoutClient,
): Promise<TryoutCatalogEntry[]> {
  const [templates, blocksResponse, questionsResponse] = await Promise.all([
    listPublishedExamTemplates(client),
    client
      .from("blocks")
      .select("id, name, slug, sort_order, icon_name, color_theme, topics:topics(id, name, slug, sort_order, is_active)")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    client
      .from("questions")
      .select("id, block_id, topic_id, options:question_options(is_correct)")
      .eq("status", "published")
      .limit(2000),
  ]);

  if (blocksResponse.error) {
    throw new Error(blocksResponse.error.message);
  }

  if (questionsResponse.error) {
    throw new Error(questionsResponse.error.message);
  }

  const activeBlocks = (blocksResponse.data as TaxonomyBlockRow[] | null) ?? [];
  const eligibleQuestions = ((questionsResponse.data as PublishedQuestionCatalogRow[] | null) ?? [])
    .filter(isEligibleCatalogQuestion);
  const fullTemplate = templates.find((template) => template.mode === "full") ?? null;
  const blockTemplatesByBlockId = new Map(
    templates
      .filter((template) => template.mode === "block" && template.blockId)
      .map((template) => [template.blockId!, template]),
  );
  const topicTemplatesByTopicId = new Map(
    templates
      .filter((template) => template.mode === "topic" && template.topicId)
      .map((template) => [template.topicId!, template]),
  );
  const blockQuestionCounts = new Map<string, number>();
  const topicQuestionCounts = new Map<string, number>();

  for (const question of eligibleQuestions) {
    if (question.block_id) {
      blockQuestionCounts.set(
        question.block_id,
        (blockQuestionCounts.get(question.block_id) ?? 0) + 1,
      );
    }

    if (question.topic_id) {
      topicQuestionCounts.set(
        question.topic_id,
        (topicQuestionCounts.get(question.topic_id) ?? 0) + 1,
      );
    }
  }

  const fallbackEntries: TryoutCatalogEntry[] = [];
  const fullAvailableQuestionCount = eligibleQuestions.length;

  if (fullTemplate || fullAvailableQuestionCount > 0) {
    fallbackEntries.push({
      id: "catalog-full",
      slug: fullTemplate?.slug ?? "tryout-besar",
      title: fullTemplate?.title ?? "Try Out Besar",
      description: fullTemplate?.description
        ?? "Simulasi penuh untuk membaca stamina, fokus, dan pola salah sebelum review dipersempit.",
      mode: "full",
      questionCount: 50,
      durationMinutes: fullTemplate?.durationMinutes ?? 60,
      blockId: null,
      blockName: null,
      blockSortOrder: null,
      iconName: fullTemplate?.iconName ?? null,
      colorTheme: fullTemplate?.colorTheme ?? null,
      topicId: null,
      topicName: null,
      topicSortOrder: null,
      sessionTemplateId: fullTemplate?.id ?? null,
      isStartable: fullAvailableQuestionCount >= 50 && Boolean(fullTemplate),
      disabledReason: buildCatalogDisabledReason(
        fullAvailableQuestionCount,
        50,
        Boolean(fullTemplate),
      ),
      availableQuestionCount: fullAvailableQuestionCount,
      requiredQuestionCount: 50,
    });
  }

  for (const block of activeBlocks) {
    const template = blockTemplatesByBlockId.get(block.id) ?? null;
    const blockAvailableQuestionCount = blockQuestionCounts.get(block.id) ?? 0;

    fallbackEntries.push({
      id: `catalog-block-${block.id}`,
      slug: template?.slug ?? block.slug,
      title: template?.title ?? block.name,
      description: template?.description ?? `Try out per blok ${block.name}.`,
      mode: "block",
      questionCount: 30,
      durationMinutes: template?.durationMinutes ?? 40,
      blockId: block.id,
      blockName: block.name,
      blockSortOrder: template?.blockSortOrder ?? block.sort_order,
      iconName: template?.iconName ?? block.icon_name ?? null,
      colorTheme: template?.colorTheme ?? block.color_theme ?? null,
      topicId: null,
      topicName: null,
      topicSortOrder: null,
      sessionTemplateId: template?.id ?? null,
      isStartable: blockAvailableQuestionCount >= 30 && Boolean(template),
      disabledReason: buildCatalogDisabledReason(
        blockAvailableQuestionCount,
        30,
        Boolean(template),
      ),
      availableQuestionCount: blockAvailableQuestionCount,
      requiredQuestionCount: 30,
    });

    for (const topic of (block.topics ?? []).filter((item) => item.is_active ?? true)) {
      const topicTemplate = topicTemplatesByTopicId.get(topic.id) ?? null;
      const topicAvailableQuestionCount = topicQuestionCounts.get(topic.id) ?? 0;

      fallbackEntries.push({
        id: `catalog-topic-${topic.id}`,
        slug: topicTemplate?.slug ?? `materi-${topic.slug}`,
        title: topicTemplate?.title ?? topic.name,
        description: topicTemplate?.description ?? `Try out per materi ${topic.name}.`,
        mode: "topic",
        questionCount: 20,
        durationMinutes: topicTemplate?.durationMinutes ?? 30,
        blockId: block.id,
        blockName: block.name,
        blockSortOrder: topicTemplate?.blockSortOrder ?? block.sort_order,
        iconName: topicTemplate?.iconName ?? block.icon_name ?? null,
        colorTheme: topicTemplate?.colorTheme ?? block.color_theme ?? null,
        topicId: topic.id,
        topicName: topicTemplate?.topicName ?? topic.name,
        topicSortOrder: topicTemplate?.topicSortOrder ?? topic.sort_order,
        sessionTemplateId: topicTemplate?.id ?? null,
        isStartable: topicAvailableQuestionCount >= 20 && Boolean(topicTemplate),
        disabledReason: buildCatalogDisabledReason(
          topicAvailableQuestionCount,
          20,
          Boolean(topicTemplate),
        ),
        availableQuestionCount: topicAvailableQuestionCount,
        requiredQuestionCount: 20,
      });
    }
  }

  return fallbackEntries.sort(compareTryoutTemplates);
}

const templateModeSortOrder: Record<TryoutTemplate["mode"], number> = {
  full: 0,
  block: 1,
  topic: 2,
};

function compareTryoutTemplates(left: TryoutTemplate, right: TryoutTemplate): number {
  const modeDifference =
    templateModeSortOrder[left.mode] - templateModeSortOrder[right.mode];

  if (modeDifference !== 0) {
    return modeDifference;
  }

  if (left.mode === "full") {
    return left.title.localeCompare(right.title);
  }

  const blockOrderDifference =
    (left.blockSortOrder ?? Number.MAX_SAFE_INTEGER)
    - (right.blockSortOrder ?? Number.MAX_SAFE_INTEGER);

  if (blockOrderDifference !== 0) {
    return blockOrderDifference;
  }

  if (left.mode === "block") {
    return left.title.localeCompare(right.title);
  }

  const topicOrderDifference =
    (left.topicSortOrder ?? Number.MAX_SAFE_INTEGER)
    - (right.topicSortOrder ?? Number.MAX_SAFE_INTEGER);

  if (topicOrderDifference !== 0) {
    return topicOrderDifference;
  }

  return left.title.localeCompare(right.title);
}

function mapAttempt(row: AttemptRow): PersistedAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    examTemplateId: row.exam_template_id,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    timeLimitSeconds: row.time_limit_seconds,
    totalQuestions: row.total_questions,
    elapsedSeconds: row.elapsed_seconds,
    lastResumedAt: row.last_resumed_at,
    pausedAt: row.paused_at,
  };
}

function calculateAttemptTimeUsedSeconds(attempt: PersistedAttempt, now: Date): number {
  const activeSegmentSeconds = attempt.status === "in_progress" && attempt.lastResumedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
    : attempt.status === "submitted" && attempt.submittedAt && attempt.lastResumedAt
      ? Math.max(0, Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
      : 0;

  return Math.max(0, attempt.elapsedSeconds + activeSegmentSeconds);
}

function calculateTimeRemainingSeconds(attempt: PersistedAttempt, now: Date): number {
  return Math.max(0, attempt.timeLimitSeconds - calculateAttemptTimeUsedSeconds(attempt, now));
}

function mapSubmittedAttemptHistoryItem(row: AttemptHistoryRow): SubmittedAttemptHistoryItem {
  const relatedTemplate = Array.isArray(row.exam_template) ? row.exam_template[0] ?? null : row.exam_template;
  const relatedResult = Array.isArray(row.attempt_result) ? row.attempt_result[0] ?? null : row.attempt_result;

  return {
    attemptId: row.id,
    title: relatedTemplate?.title ?? "Try out",
    submittedAt: row.submitted_at,
    score: relatedResult?.score ?? 0,
    correctAnswers: relatedResult?.correct_answers ?? 0,
    wrongAnswers: relatedResult?.wrong_answers ?? 0,
  };
}

function mapAttemptItem(row: AttemptItemRow): PersistedAttemptItem {
  return {
    id: row.id,
    questionId: row.question_id,
    blockId: row.block_id,
    blockName: row.block_name,
    topicId: row.topic_id,
    stem: row.question_stem,
    questionImagePath: row.question_image_path,
    options: row.options_snapshot,
    correctOptionKey: row.correct_option_key,
    sortOrder: row.sort_order,
  };
}

async function createSignedMediaUrl(client: TryoutClient, path: string | null): Promise<string | null> {
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

function mapAnswer(row: AnswerRow): PersistedAnswer {
  return {
    attemptId: row.attempt_id,
    attemptItemId: row.attempt_item_id,
    selectedOptionKey: row.selected_option_key,
    isDoubtful: row.is_doubtful,
    answeredAt: row.answered_at,
  };
}

function mapAttemptResult(row: AttemptResultRow): PersistedAttemptResult {
  return {
    attemptId: row.attempt_id,
    score: row.score,
    correctAnswers: row.correct_answers,
    wrongAnswers: row.wrong_answers,
    unansweredCount: row.unanswered_count,
    timeUsedSeconds: row.time_used_seconds,
    blockSummary: row.block_summary,
    generatedAt: row.generated_at,
  };
}

async function getAttemptById(
  client: TryoutClient,
  attemptId: string,
): Promise<PersistedAttempt | null> {
  const { data, error } = await client
    .from("attempts")
    .select("id, user_id, exam_template_id, status, started_at, submitted_at, time_limit_seconds, total_questions, elapsed_seconds, last_resumed_at, paused_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAttempt(data as AttemptRow) : null;
}

async function getAttemptItemsByAttemptId(
  client: TryoutClient,
  attemptId: string,
): Promise<PersistedAttemptItem[]> {
  const { data, error } = await client
    .from("attempt_items")
    .select("id, question_id, block_id, block_name, topic_id, question_stem, question_image_path, options_snapshot, correct_option_key, sort_order")
    .eq("attempt_id", attemptId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AttemptItemRow[] | null)?.map(mapAttemptItem) ?? [];
}

async function getAnswersByAttemptId(
  client: TryoutClient,
  attemptId: string,
): Promise<PersistedAnswer[]> {
  const { data, error } = await client
    .from("answers")
    .select("attempt_id, attempt_item_id, selected_option_key, is_doubtful, answered_at")
    .eq("attempt_id", attemptId)
    .order("answered_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AnswerRow[] | null)?.map(mapAnswer) ?? [];
}

export async function listPublishedExamTemplates(
  client: TryoutClient = getSupabaseBrowserClient(),
): Promise<TryoutTemplate[]> {
  const { data, error } = await client
    .from("exam_templates")
    .select("id, slug, title, description, mode, question_count, duration_minutes, block_id, topic_id, block:blocks(name, sort_order, icon_name, color_theme), topic:topics(name, sort_order)")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as ExamTemplateRow[] | null)?.map(mapTemplate) ?? []).sort(compareTryoutTemplates);
}

export async function listTryoutCatalogEntries(
  client: TryoutClient = getSupabaseBrowserClient(),
): Promise<TryoutCatalogEntry[]> {
  const { data, error } = await client.rpc("list_tryout_catalog_entries");

  if (error) {
    if (shouldFallbackToClientCatalog(error.message)) {
      return listTryoutCatalogEntriesFallback(client);
    }

    throw new Error(error.message);
  }

  return ((data as TryoutCatalogEntryRow[] | null) ?? [])
    .map(mapCatalogEntry)
    .sort(compareTryoutTemplates);
}

async function getActiveAttemptForCurrentUser(client: TryoutClient): Promise<PersistedAttempt | null> {
  const { data, error } = await client
    .from("attempts")
    .select("id, user_id, exam_template_id, status, started_at, submitted_at, time_limit_seconds, total_questions, elapsed_seconds, last_resumed_at, paused_at")
    .in("status", ["in_progress", "paused"])
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAttempt(data as AttemptRow) : null;
}

export async function createAttempt(
  {
    client = getSupabaseBrowserClient(),
    examTemplateId,
  }: {
    client?: TryoutClient;
    examTemplateId: string;
  },
): Promise<PersistedAttempt> {
  const { data, error } = await client.rpc("start_attempt_from_template", {
    target_exam_template_id: examTemplateId,
  });

  if (error) {
    if (/lanjutkan try out yang masih aktif/i.test(error.message)) {
      const activeAttempt = await getActiveAttemptForCurrentUser(client);

      if (activeAttempt) {
        return activeAttempt;
      }
    }

    throw new Error(error.message);
  }

  return mapAttempt(data as AttemptRow);
}

export async function findActiveAttemptForUser(
  {
    client = getSupabaseBrowserClient(),
    userId,
    now = new Date(),
  }: {
    client?: TryoutClient;
    userId: string;
    now?: Date;
  },
): Promise<ActiveAttemptSummary | null> {
  const { data, error } = await client
    .from("attempts")
    .select(`
      id,
      user_id,
      exam_template_id,
      status,
      started_at,
      submitted_at,
      time_limit_seconds,
      total_questions,
      elapsed_seconds,
      last_resumed_at,
      paused_at,
      exam_template:exam_templates(title, mode)
    `)
    .eq("user_id", userId)
    .in("status", ["in_progress", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const activeAttemptRow = data as ActiveAttemptRow;
  const attempt = mapAttempt(activeAttemptRow);
  const relatedTemplateValue = activeAttemptRow.exam_template ?? null;
  const relatedTemplate = Array.isArray(relatedTemplateValue)
    ? relatedTemplateValue[0] ?? null
    : relatedTemplateValue;
  const { count: attemptResultCount, error: attemptResultError } = await client
    .from("attempt_results")
    .select("attempt_id", {
      count: "exact",
      head: true,
    })
    .eq("attempt_id", attempt.id);

  if (attemptResultError) {
    throw new Error(attemptResultError.message);
  }

  if (attempt.submittedAt || (attemptResultCount ?? 0) > 0) {
    return null;
  }

  const { count, error: countError } = await client
    .from("answers")
    .select("attempt_item_id", {
      count: "exact",
      head: true,
    })
    .eq("attempt_id", attempt.id)
    .not("selected_option_key", "is", null);

  if (countError) {
    throw new Error(countError.message);
  }

  return {
    attemptId: attempt.id,
    status: attempt.status === "paused" ? "paused" : "in_progress",
    title: relatedTemplate?.title ?? "Try out",
    mode: relatedTemplate?.mode ?? "full",
    answeredCount: count ?? 0,
    totalQuestions: attempt.totalQuestions,
    timeRemainingSeconds: calculateTimeRemainingSeconds(attempt, now),
  };
}

export async function getAttemptSessionPageData(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
    now = new Date(),
  }: {
    client?: TryoutClient;
    attemptId: string;
    now?: Date;
  },
): Promise<TryoutSessionPageData> {
  const [attempt, items, answers] = await Promise.all([
    getAttemptById(client, attemptId),
    getAttemptItemsByAttemptId(client, attemptId),
    getAnswersByAttemptId(client, attemptId),
  ]);

  return mapAttemptSessionPageData({
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

export async function saveAnswer(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
    attemptItemId,
    selectedOptionKey,
    isDoubtful,
    timeSpentDeltaSeconds = 0,
  }: {
    client?: TryoutClient;
    attemptId: string;
    attemptItemId: string;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
    timeSpentDeltaSeconds?: number;
  },
): Promise<PersistedAnswer> {
  const safeIsDoubtful = selectedOptionKey ? isDoubtful : false;

  const { data, error } = await client.rpc("save_attempt_answer", {
    target_attempt_id: attemptId,
    target_attempt_item_id: attemptItemId,
    selected_option_key: selectedOptionKey,
    is_doubtful: safeIsDoubtful,
    time_spent_delta_seconds: Math.max(0, Math.floor(timeSpentDeltaSeconds)),
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAnswer(data as AnswerRow);
}

export async function submitAttempt(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: TryoutClient;
    attemptId: string;
  },
): Promise<PersistedAttemptResult> {
  const { data, error } = await client.rpc("submit_attempt", {
    target_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAttemptResult(data as AttemptResultRow);
}

export async function pauseAttempt(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: TryoutClient;
    attemptId: string;
  },
): Promise<PersistedAttempt> {
  const { data, error } = await client.rpc("pause_attempt", {
    target_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAttempt(data as AttemptRow);
}

export async function resumeAttempt(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: TryoutClient;
    attemptId: string;
  },
): Promise<PersistedAttempt> {
  const { data, error } = await client.rpc("resume_attempt", {
    target_attempt_id: attemptId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapAttempt(data as AttemptRow);
}

export async function getAttemptResult(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: TryoutClient;
    attemptId: string;
  },
): Promise<PersistedAttemptResult | null> {
  const { data, error } = await client
    .from("attempt_results")
    .select("attempt_id, score, correct_answers, wrong_answers, unanswered_count, time_used_seconds, block_summary, generated_at")
    .eq("attempt_id", attemptId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAttemptResult(data as AttemptResultRow) : null;
}

export async function getAttemptResultPageData(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: TryoutClient;
    attemptId: string;
  },
): Promise<TryoutResultPageData | null> {
  const result = await getAttemptResult({
    client,
    attemptId,
  });

  return result ? mapAttemptResultToPageData(result) : null;
}

export async function getAttemptReviewPageData(
  {
    client = getSupabaseBrowserClient(),
    attemptId,
  }: {
    client?: TryoutClient;
    attemptId: string;
  },
): Promise<TryoutReviewPageData> {
  const [attemptSummaryResponse, items, answers] = await Promise.all([
    client
      .from("attempts")
      .select(`
        submitted_at,
        exam_template:exam_templates(title),
        attempt_result:attempt_results(score, correct_answers, wrong_answers)
      `)
      .eq("id", attemptId)
      .maybeSingle(),
    getAttemptItemsByAttemptId(client, attemptId),
    getAnswersByAttemptId(client, attemptId),
  ]);

  if (attemptSummaryResponse.error) {
    throw new Error(attemptSummaryResponse.error.message);
  }

  const questionIds = Array.from(new Set(items.map((item) => item.questionId)));

  let explanations: QuestionExplanationRow[] = [];

  if (questionIds.length > 0) {
    const { data, error } = await client
      .from("question_explanations")
      .select("question_id, explanation, explanation_image_path")
      .in("question_id", questionIds);

    if (error) {
      throw new Error(error.message);
    }

    explanations = (data as QuestionExplanationRow[] | null) ?? [];
  }

  const summaryRow = attemptSummaryResponse.data as AttemptReviewSummaryRow | null;
  const relatedTemplate = Array.isArray(summaryRow?.exam_template)
    ? summaryRow.exam_template[0] ?? null
    : summaryRow?.exam_template ?? null;
  const relatedResult = Array.isArray(summaryRow?.attempt_result)
    ? summaryRow.attempt_result[0] ?? null
    : summaryRow?.attempt_result ?? null;

  return mapAttemptReviewPageData({
    summary: {
      title: relatedTemplate?.title ?? "Try out",
      submittedAt: summaryRow?.submitted_at ?? null,
      score: relatedResult?.score ?? 0,
      correctAnswers: relatedResult?.correct_answers ?? 0,
      wrongAnswers: relatedResult?.wrong_answers ?? 0,
    },
    items: await Promise.all(
      items.map(async (item) => ({
        ...item,
        questionImageUrl: await createSignedMediaUrl(client, item.questionImagePath),
      })),
    ),
    answers,
    explanations: await Promise.all(
      explanations.map(async (item) => ({
        questionId: item.question_id,
        explanationText: item.explanation,
        explanationImageUrl: await createSignedMediaUrl(client, item.explanation_image_path),
      })),
    ),
  });
}

export async function findLatestSubmittedAttemptId(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: TryoutClient;
    userId: string;
  },
): Promise<string | null> {
  const { data, error } = await client
    .from("attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { id: string } | null)?.id ?? null;
}

export async function listSubmittedAttemptHistory(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: TryoutClient;
    userId: string;
  },
): Promise<SubmittedAttemptHistoryItem[]> {
  const { data, error } = await client
    .from("attempts")
    .select(`
      id,
      submitted_at,
      exam_template:exam_templates(title),
      attempt_result:attempt_results(score, correct_answers, wrong_answers)
    `)
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AttemptHistoryRow[] | null)?.map(mapSubmittedAttemptHistoryItem) ?? [];
}
