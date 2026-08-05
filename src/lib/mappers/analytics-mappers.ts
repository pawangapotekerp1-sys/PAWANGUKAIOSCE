import type {
  AttemptSummary,
  BlockPerformance,
  DashboardMetric,
  StudyQueueItem,
} from "../../mocks/student-dashboard";
import type { BlockAccuracy, RulesInsight, TopicWeakness } from "../../mocks/analytics";

export type PersistedBlockPerformance = {
  blockName: string;
  accuracy: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
};

export type PersistedTopicPerformance = {
  topicName: string;
  blockName: string;
  accuracy: number;
  totalQuestions: number;
  wrongAnswers: number;
};

export type PersistedRecentAttempt = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  weakestBlockName: string | null;
  correctAnswers: number;
  wrongAnswers: number;
};

export type DashboardViewModel = {
  progressCards: DashboardMetric[];
  blockPerformance: BlockPerformance[];
  recentAttempts: AttemptSummary[];
  studyQueue: StudyQueueItem[];
  weeklyTrend: number[];
  latestAttemptId: string | null;
  primaryInsightTitle: string;
  primaryInsightBody: string;
  weakestBlockTarget: string;
  consistencyLabel: string;
};

export type AnalyticsViewModel = {
  weakestBlock: BlockAccuracy | null;
  strongestBlock: BlockAccuracy | null;
  blockAccuracy: BlockAccuracy[];
  topicWeaknessRanking: TopicWeakness[];
  rulesInsights: RulesInsight[];
};

const DIAGNOSIS_BEHAVIOR_CODES = [
  "frequent_ragu",
  "slow_pacing",
  "frequent_answer_changes",
  "correct_to_wrong_switches",
] as const;

type DiagnosisBehaviorCode = (typeof DIAGNOSIS_BEHAVIOR_CODES)[number];
export type DiagnosisMode = "empty" | "basic" | "full";
export type DiagnosisSeverity = "low" | "medium" | "high";
export type DiagnosisConfidence = "low" | "medium" | "high";

export type PersistedDiagnosisSummary = {
  rangeStart: string | null;
  rangeEnd: string | null;
  timezone: string;
  eligibleAttemptCount: number;
  minimumAttemptsMet: boolean;
  diagnosisMode: DiagnosisMode;
  overallAccuracy: number;
  overallAverageTimePerQuestion: number;
  overallQuestionCount: number;
};

export type PersistedDiagnosisBehaviorPattern = {
  code: DiagnosisBehaviorCode;
  label: string;
  severity: DiagnosisSeverity;
  evidence: string;
  description: string;
};

export type PersistedDiagnosisSubtopicRanking = {
  topicId: string;
  topicName: string;
  blockId: string | null;
  blockName: string;
  rank: number;
  weaknessScore: number;
  confidence: DiagnosisConfidence;
  questionCount: number;
  attemptCoverageCount: number;
  accuracy: number;
  averageTimePerQuestion: number;
  behaviorFlags: DiagnosisBehaviorCode[];
  summary: string;
};

export type PersistedDiagnosisBasicSummary = {
  message: string;
  eligibleAttemptCount: number;
  overallAccuracy: number;
  observedTopics: string[];
  globalBehaviorPatterns: PersistedDiagnosisBehaviorPattern[];
};

export type PersistedDiagnosisNarrative = {
  headline: string;
  body: string;
  nextReadiness: string;
};

export type PersonalWeaknessDiagnosisViewModel = {
  summary: PersistedDiagnosisSummary;
  globalBehaviorPatterns: PersistedDiagnosisBehaviorPattern[];
  subtopicRankings: PersistedDiagnosisSubtopicRanking[];
  basicSummary: PersistedDiagnosisBasicSummary | null;
  narrative: PersistedDiagnosisNarrative;
};

export type PersonalWeaknessDiagnosisRow = {
  summary?: Partial<PersistedDiagnosisSummary> | null;
  globalBehaviorPatterns?: Array<Partial<PersistedDiagnosisBehaviorPattern>> | null;
  subtopicRankings?: Array<Partial<PersistedDiagnosisSubtopicRanking>> | null;
  basicSummary?: Partial<PersistedDiagnosisBasicSummary> | null;
  narrative?: Partial<PersistedDiagnosisNarrative> | null;
};

function isDiagnosisMode(value: unknown): value is DiagnosisMode {
  return value === "empty" || value === "basic" || value === "full";
}

function isDiagnosisSeverity(value: unknown): value is DiagnosisSeverity {
  return value === "low" || value === "medium" || value === "high";
}

function isDiagnosisConfidence(value: unknown): value is DiagnosisConfidence {
  return value === "low" || value === "medium" || value === "high";
}

function isDiagnosisBehaviorCode(value: unknown): value is DiagnosisBehaviorCode {
  return typeof value === "string" && DIAGNOSIS_BEHAVIOR_CODES.includes(value as DiagnosisBehaviorCode);
}

function coerceNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapDiagnosisBehaviorPattern(
  input: Partial<PersistedDiagnosisBehaviorPattern> | null | undefined,
): PersistedDiagnosisBehaviorPattern | null {
  if (!input || !isDiagnosisBehaviorCode(input.code)) {
    return null;
  }

  return {
    code: input.code,
    label: coerceString(input.label, input.code),
    severity: isDiagnosisSeverity(input.severity) ? input.severity : "low",
    evidence: coerceString(input.evidence),
    description: coerceString(input.description),
  };
}

function mapDiagnosisBehaviorFlags(input: unknown): DiagnosisBehaviorCode[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter(isDiagnosisBehaviorCode);
}

function mapDiagnosisSummary(input: Partial<PersistedDiagnosisSummary> | null | undefined): PersistedDiagnosisSummary {
  return {
    rangeStart: typeof input?.rangeStart === "string" ? input.rangeStart : null,
    rangeEnd: typeof input?.rangeEnd === "string" ? input.rangeEnd : null,
    timezone: coerceString(input?.timezone, "UTC"),
    eligibleAttemptCount: coerceNumber(input?.eligibleAttemptCount, 0),
    minimumAttemptsMet: typeof input?.minimumAttemptsMet === "boolean" ? input.minimumAttemptsMet : false,
    diagnosisMode: isDiagnosisMode(input?.diagnosisMode) ? input.diagnosisMode : "empty",
    overallAccuracy: coerceNumber(input?.overallAccuracy, 0),
    overallAverageTimePerQuestion: coerceNumber(input?.overallAverageTimePerQuestion, 0),
    overallQuestionCount: coerceNumber(input?.overallQuestionCount, 0),
  };
}

export function mapPersonalWeaknessDiagnosisViewModel(
  input: PersonalWeaknessDiagnosisRow | null | undefined,
): PersonalWeaknessDiagnosisViewModel {
  const summary = mapDiagnosisSummary(input?.summary);
  const globalBehaviorPatterns = (input?.globalBehaviorPatterns ?? [])
    .map(mapDiagnosisBehaviorPattern)
    .filter((item): item is PersistedDiagnosisBehaviorPattern => item !== null);
  const subtopicRankings = (input?.subtopicRankings ?? [])
    .map((item, index) => ({
      topicId: coerceString(item?.topicId),
      topicName: coerceString(item?.topicName),
      blockId: typeof item?.blockId === "string" ? item.blockId : null,
      blockName: coerceString(item?.blockName, "Tanpa blok"),
      rank: coerceNumber(item?.rank, index + 1),
      weaknessScore: coerceNumber(item?.weaknessScore, 0),
      confidence: isDiagnosisConfidence(item?.confidence) ? item.confidence : "low",
      questionCount: coerceNumber(item?.questionCount, 0),
      attemptCoverageCount: coerceNumber(item?.attemptCoverageCount, 0),
      accuracy: coerceNumber(item?.accuracy, 0),
      averageTimePerQuestion: coerceNumber(item?.averageTimePerQuestion, 0),
      behaviorFlags: mapDiagnosisBehaviorFlags(item?.behaviorFlags),
      summary: coerceString(item?.summary),
    }))
    .sort((left, right) => left.rank - right.rank);

  const basicSummary = input?.basicSummary ? {
    message: coerceString(input.basicSummary.message),
    eligibleAttemptCount: coerceNumber(input.basicSummary.eligibleAttemptCount, summary.eligibleAttemptCount),
    overallAccuracy: coerceNumber(input.basicSummary.overallAccuracy, summary.overallAccuracy),
    observedTopics: Array.isArray(input.basicSummary.observedTopics)
      ? input.basicSummary.observedTopics.filter((item): item is string => typeof item === "string")
      : [],
    globalBehaviorPatterns: Array.isArray(input.basicSummary.globalBehaviorPatterns)
      ? input.basicSummary.globalBehaviorPatterns
        .map(mapDiagnosisBehaviorPattern)
        .filter((item): item is PersistedDiagnosisBehaviorPattern => item !== null)
      : globalBehaviorPatterns,
  } : null;

  const narrative: PersistedDiagnosisNarrative = {
    headline: coerceString(input?.narrative?.headline, "Diagnosis belum tersedia."),
    body: coerceString(
      input?.narrative?.body,
      "Rentang ini belum memiliki data diagnosis yang cukup untuk dirangkum.",
    ),
    nextReadiness: coerceString(
      input?.narrative?.nextReadiness,
      "Jalankan try out besar lalu pilih rentang yang memuat hasil submit tersebut untuk melihat diagnosis.",
    ),
  };

  return {
    summary,
    globalBehaviorPatterns,
    subtopicRankings,
    basicSummary,
    narrative,
  };
}

function formatTimestampAsRelativeLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sesi tercatat";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildBlockStatus(rank: number, accuracy: number): string {
  if (rank === 0) {
    return "Blok terlemah";
  }

  if (accuracy >= 80) {
    return "Paling stabil";
  }

  return "Naik perlahan";
}

function buildBlockLabel(rank: number, accuracy: number): string {
  if (rank === 0) {
    return "Perlu prioritas review";
  }

  if (accuracy >= 80) {
    return "Paling stabil";
  }

  return "Naik perlahan";
}

export function mapDashboardViewModel(
  {
    averageScore,
    completedAttempts,
    blockPerformance,
    topicPerformance,
    recentAttempts,
  }: {
    averageScore: number;
    completedAttempts: number;
    blockPerformance: PersistedBlockPerformance[];
    topicPerformance: PersistedTopicPerformance[];
    recentAttempts: PersistedRecentAttempt[];
  },
): DashboardViewModel {
  const sortedBlocks = [...blockPerformance].sort((left, right) => left.accuracy - right.accuracy);
  const weakestBlock = sortedBlocks[0] ?? null;
  const strongestBlock = [...blockPerformance].sort((left, right) => right.accuracy - left.accuracy)[0] ?? null;
  const priorityTopics = [...topicPerformance]
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }

      return right.wrongAnswers - left.wrongAnswers;
    })
    .slice(0, 3);
  const trendScores = recentAttempts
    .slice(0, 7)
    .map((attempt) => Math.round(attempt.score))
    .reverse();
  const latestAttemptId = recentAttempts[0]?.attemptId ?? null;

  return {
    progressCards: [
      {
        label: "Skor rata-rata",
        value: `${Math.round(averageScore)}`,
        detail: weakestBlock
          ? `${weakestBlock.blockName} masih paling menahan skor keseluruhan.`
          : "Belum ada blok yang bisa dibandingkan.",
        tone: "teal",
      },
      {
        label: "Try out selesai",
        value: `${completedAttempts}`,
        detail: completedAttempts === 1
          ? "1 sesi submitted sudah tercatat."
          : `${completedAttempts} sesi submitted sudah masuk ke riwayat.`,
        tone: "gold",
      },
      {
        label: "Akurasi Clinical",
        value: `${Math.round(blockPerformance.find((item) => /clinical/i.test(item.blockName))?.accuracy ?? 0)}%`,
        detail: "Pantau Clinical sebagai blok pembuka review saat akurasinya masih tertahan.",
        tone: "green",
      },
    ],
    blockPerformance: sortedBlocks.map((item, index) => ({
      name: item.blockName,
      score: Math.round(item.accuracy),
      status: buildBlockStatus(index, item.accuracy),
    })),
    recentAttempts: recentAttempts.map((attempt) => ({
      title: attempt.title,
      meta: formatTimestampAsRelativeLabel(attempt.submittedAt),
      score: `${Math.round(attempt.score)}`,
      note: attempt.weakestBlockName
        ? `Blok yang paling menahan sesi ini: ${attempt.weakestBlockName}.`
        : "Belum ada blok dominan yang menahan skor di sesi ini.",
    })),
    studyQueue: priorityTopics.map((item) => ({
      topic: item.topicName,
      focus: `${item.blockName} masih paling layak diulang dulu karena akurasinya baru ${Math.round(item.accuracy)}%.`,
    })),
    weeklyTrend: trendScores,
    latestAttemptId,
    primaryInsightTitle: weakestBlock
      ? `${weakestBlock.blockName} masih jadi rem utama.`
      : "Belum ada blok yang bisa dibaca.",
    primaryInsightBody: priorityTopics[0]
      ? `Mulai dari ${priorityTopics[0].topicName}, lalu tutup sesi dengan review salah saja pada ${priorityTopics[0].blockName}.`
      : "Jalankan satu try out penuh dulu agar prioritas belajar bisa dibaca lebih tajam.",
    weakestBlockTarget: weakestBlock
      ? `Target blok lemah pekan ini: ${Math.min(90, Math.round(weakestBlock.accuracy + 6))}%`
      : "Target blok lemah pekan ini: --",
    consistencyLabel: trendScores.length >= 1
      ? `${trendScores.filter((score) => score >= 70).length} dari ${trendScores.length} sesi berada di atas 70`
      : "Belum ada sesi yang cukup untuk membaca konsistensi",
  };
}

export function mapAnalyticsViewModel(
  {
    blockPerformance,
    topicPerformance,
  }: {
    blockPerformance: PersistedBlockPerformance[];
    topicPerformance: PersistedTopicPerformance[];
  },
): AnalyticsViewModel {
  const blocksAscending = [...blockPerformance].sort((left, right) => left.accuracy - right.accuracy);
  const blocksDescending = [...blockPerformance].sort((left, right) => right.accuracy - left.accuracy);
  const blockAccuracy = blocksAscending.map((item, index) => ({
    name: item.blockName,
    score: Math.round(item.accuracy),
    label: buildBlockLabel(index, item.accuracy),
  }));
  const topicWeaknessRanking = [...topicPerformance]
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }

      return right.wrongAnswers - left.wrongAnswers;
    })
    .slice(0, 5)
    .map((item) => ({
      topic: item.topicName,
      block: item.blockName,
      accuracy: Math.round(item.accuracy),
      note: `Topik ini masih sering menjatuhkan akurasi ${item.blockName} dan layak dijadikan pembuka review berikutnya.`,
    }));

  const weakestBlock = blockAccuracy[0] ?? null;
  const strongestBlock = [...blocksDescending].map((item, index) => ({
    name: item.blockName,
    score: Math.round(item.accuracy),
    label: index === 0 ? "Paling stabil" : buildBlockLabel(index, item.accuracy),
  }))[0] ?? null;

  return {
    weakestBlock,
    strongestBlock,
    blockAccuracy,
    topicWeaknessRanking,
    rulesInsights: [
      {
        title: "Ringkasan ini disusun dari hasil try out terakhir.",
        body: "Urutan prioritas berasal dari blok dengan akurasi terendah dan topik yang paling sering menahan skor saat review jawaban salah.",
      },
      {
        title: weakestBlock
          ? `${weakestBlock.name} perlu dipakai sebagai blok pembuka sesi berikutnya.`
          : "Mulai dari blok dengan akurasi terendah lebih dulu.",
        body: topicWeaknessRanking[0]
          ? `Topik ${topicWeaknessRanking[0].topic} masih paling layak diulang lebih dulu sebelum energi disebar ke blok lain.`
          : "Saat topic ranking masih kosong, jalankan try out baru dulu agar pola belajar terbaca.",
      },
    ],
  };
}
