export type TryoutCatalogCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  questionCountLabel: string;
  emphasis: "default" | "accent";
  mode: "full" | "block" | "topic";
  blockId: string | null;
  blockName: string | null;
  blockSortOrder: number | null;
  topicId: string | null;
  topicName: string | null;
  topicSortOrder: number | null;
  sessionTemplateId: string | null;
  isStartable: boolean;
  disabledReason: string | null;
  availableQuestionCount: number;
  requiredQuestionCount: number;
};

export type TryoutCatalogGroups = {
  fullTemplate: TryoutCatalogCard | null;
  blockTemplates: TryoutCatalogCard[];
  topicGroups: Array<{
    blockId: string;
    blockName: string;
    topics: TryoutCatalogCard[];
  }>;
};

type TryoutCatalogTemplateInput = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mode: "full" | "block" | "topic";
  questionCount: number;
  durationMinutes?: number;
  blockId: string | null;
  blockName: string | null;
  blockSortOrder?: number | null;
  topicId: string | null;
  topicName: string | null;
  topicSortOrder?: number | null;
  sessionTemplateId?: string | null;
  isStartable?: boolean;
  disabledReason?: string | null;
  availableQuestionCount?: number;
  requiredQuestionCount?: number;
};

export type TryoutSessionPageData = {
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
    options: Array<{
      key: string;
      text: string;
    }>;
    selectedOptionKey: string | null;
    isDoubtful: boolean;
  }>;
};

export type TryoutResultPageData = {
  attemptId: string;
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

export type TryoutReviewPageData = {
  summary: {
    title: string;
    submittedAt: string | null;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    source: "tryout";
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

export type QuestionBankOverviewCard = {
  id: string;
  title: string;
  detail: string;
};

export function formatDurationAsClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function mapTemplatesToCatalogCards(
  templates: TryoutCatalogTemplateInput[],
): TryoutCatalogCard[] {
  return templates.map((template) => ({
    id: template.id,
    slug: template.slug,
    title: template.title,
    subtitle: template.mode === "full"
      ? "Simulasi penuh"
      : template.mode === "topic"
        ? "Try out per materi"
        : "Try out per blok",
    description: template.description,
    questionCountLabel: `${template.questionCount} soal`,
    emphasis: template.mode === "full" ? "accent" : "default",
    mode: template.mode,
    blockId: template.blockId,
    blockName: template.blockName,
    blockSortOrder: template.blockSortOrder ?? null,
    topicId: template.topicId,
    topicName: template.topicName,
    topicSortOrder: template.topicSortOrder ?? null,
    sessionTemplateId: template.sessionTemplateId ?? template.id,
    isStartable: template.isStartable ?? true,
    disabledReason: template.disabledReason ?? null,
    availableQuestionCount: template.availableQuestionCount ?? template.questionCount,
    requiredQuestionCount: template.requiredQuestionCount ?? template.questionCount,
  }));
}

function compareBlockCards(left: TryoutCatalogCard, right: TryoutCatalogCard): number {
  const sortOrderDifference =
    (left.blockSortOrder ?? Number.MAX_SAFE_INTEGER)
    - (right.blockSortOrder ?? Number.MAX_SAFE_INTEGER);

  if (sortOrderDifference !== 0) {
    return sortOrderDifference;
  }

  return left.title.localeCompare(right.title);
}

function compareTopicCards(left: TryoutCatalogCard, right: TryoutCatalogCard): number {
  const blockOrderDifference =
    (left.blockSortOrder ?? Number.MAX_SAFE_INTEGER)
    - (right.blockSortOrder ?? Number.MAX_SAFE_INTEGER);

  if (blockOrderDifference !== 0) {
    return blockOrderDifference;
  }

  const topicOrderDifference =
    (left.topicSortOrder ?? Number.MAX_SAFE_INTEGER)
    - (right.topicSortOrder ?? Number.MAX_SAFE_INTEGER);

  if (topicOrderDifference !== 0) {
    return topicOrderDifference;
  }

  return left.title.localeCompare(right.title);
}

export function groupTemplatesForCatalog(
  templates: TryoutCatalogTemplateInput[],
): TryoutCatalogGroups {
  const cards = mapTemplatesToCatalogCards(templates);
  const fullTemplate = cards.find((card) => card.mode === "full") ?? null;
  const blockTemplates = cards
    .filter((card) => card.mode === "block")
    .sort(compareBlockCards);
  const topicGroupsMap = new Map<string, {
    blockId: string;
    blockName: string;
    blockSortOrder: number | null;
    topics: TryoutCatalogCard[];
  }>();

  for (const card of cards) {
    if (card.mode !== "topic" || !card.blockId || !card.blockName) {
      continue;
    }

    const currentGroup = topicGroupsMap.get(card.blockId);

    if (currentGroup) {
      currentGroup.topics.push(card);
      continue;
    }

    topicGroupsMap.set(card.blockId, {
      blockId: card.blockId,
      blockName: card.blockName,
      blockSortOrder: card.blockSortOrder,
      topics: [card],
    });
  }

  const topicGroups = Array.from(topicGroupsMap.values())
    .map((group) => ({
      blockId: group.blockId,
      blockName: group.blockName,
      blockSortOrder: group.blockSortOrder,
      topics: group.topics.sort(compareTopicCards),
    }))
    .sort((left, right) => {
      const sortOrderDifference =
        (left.blockSortOrder ?? Number.MAX_SAFE_INTEGER)
        - (right.blockSortOrder ?? Number.MAX_SAFE_INTEGER);

      if (sortOrderDifference !== 0) {
        return sortOrderDifference;
      }

      return left.blockName.localeCompare(right.blockName);
    })
    .map(({ blockId, blockName, topics }) => ({
      blockId,
      blockName,
      topics,
    }));

  return {
    fullTemplate,
    blockTemplates,
    topicGroups,
  };
}

export function mapAttemptSessionPageData(
  {
    attempt,
    items,
    answers,
    now = new Date(),
  }: {
    attempt: {
      id: string;
      status: "in_progress" | "paused" | "submitted" | "abandoned";
      totalQuestions: number;
      timeLimitSeconds: number;
      startedAt: string;
      submittedAt: string | null;
      elapsedSeconds: number;
      lastResumedAt: string | null;
      pausedAt: string | null;
    } | null;
    items: Array<{
      id: string;
      blockName: string;
      stem: string;
      questionImageUrl: string | null;
      options: Array<{ key: string; text: string }>;
      sortOrder: number;
    }>;
    answers: Array<{
      attemptItemId: string;
      selectedOptionKey: string | null;
      isDoubtful: boolean;
    }>;
    now?: Date;
  },
): TryoutSessionPageData {
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
  const activeSegmentSeconds = attempt.status === "in_progress" && attempt.lastResumedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
    : attempt.status === "submitted" && attempt.submittedAt && attempt.lastResumedAt
      ? Math.max(0, Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000))
      : 0;
  const elapsedSeconds = Math.max(0, attempt.elapsedSeconds + activeSegmentSeconds);
  const timeRemainingSeconds = Math.max(0, attempt.timeLimitSeconds - elapsedSeconds);

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

export function mapAttemptResultToPageData(
  result: {
    attemptId: string;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    unansweredCount: number;
    timeUsedSeconds: number;
    blockSummary: Array<{ name: string; correct: number; wrong: number }>;
  },
): TryoutResultPageData {
  return {
    attemptId: result.attemptId,
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

export function mapAttemptReviewPageData(
  {
    summary,
    items,
    answers,
    explanations,
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
      questionId: string;
      blockName: string;
      stem: string;
      questionImageUrl: string | null;
      options: Array<{ key: string; text: string }>;
      correctOptionKey: string;
    }>;
    answers: Array<{
      attemptItemId: string;
      selectedOptionKey: string | null;
    }>;
    explanations: Array<{
      questionId: string;
      explanationText: string | null;
      explanationImageUrl: string | null;
    }>;
  },
): TryoutReviewPageData {
  const answerLookup = new Map(
    answers.map((answer) => [answer.attemptItemId, answer.selectedOptionKey]),
  );
  const explanationLookup = new Map(
    explanations.map((explanation) => [explanation.questionId, explanation]),
  );

  return {
    summary: {
      ...summary,
      source: "tryout",
    },
    items: items.map((item) => {
      const selectedOptionKey = answerLookup.get(item.id) ?? null;
      const selectedOption = item.options.find((option) => option.key === selectedOptionKey) ?? null;
      const correctOption = item.options.find((option) => option.key === item.correctOptionKey);
      const explanationEntry = explanationLookup.get(item.questionId);
      const explanationText = explanationEntry?.explanationText ?? null;
      const explanationImageUrl = explanationEntry?.explanationImageUrl ?? null;

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
          explanationText ?? (explanationImageUrl ? null : "Pembahasan belum ditulis final oleh tim editorial."),
        explanationImageUrl,
        isWrong: selectedOptionKey !== item.correctOptionKey,
      };
    }),
  };
}

export function buildQuestionBankOverviewCards(
  {
    draftCount,
    missingExplanationCount,
    publishedTemplateCount,
  }: {
    draftCount: number;
    missingExplanationCount: number;
    publishedTemplateCount: number;
  },
): QuestionBankOverviewCard[] {
  return [
    {
      id: "draft-ready",
      title: "Draft siap dicek",
      detail: `${draftCount} soal masih menunggu review akhir sebelum publish.`,
    },
    {
      id: "missing-explanations",
      title: "Perlu edit penjelasan",
      detail: `${missingExplanationCount} soal masih belum punya penjelasan final untuk pembahasan.`,
    },
    {
      id: "published-templates",
      title: "Template live",
      detail: `${publishedTemplateCount} template try out sudah siap dipakai di katalog student.`,
    },
  ];
}
