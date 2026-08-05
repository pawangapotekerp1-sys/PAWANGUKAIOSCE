import { getSupabaseBrowserClient } from "../supabase/browser-client";
import {
  mapAnalyticsViewModel,
  mapDashboardViewModel,
  mapPersonalWeaknessDiagnosisViewModel,
  type AnalyticsViewModel,
  type DashboardViewModel,
  type PersonalWeaknessDiagnosisRow,
  type PersonalWeaknessDiagnosisViewModel,
  type PersistedBlockPerformance,
  type PersistedRecentAttempt,
  type PersistedTopicPerformance,
} from "../mappers/analytics-mappers";

type AnalyticsClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from" | "rpc">;

type UserBlockPerformanceRow = {
  block_name: string;
  accuracy: number;
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
};

type UserTopicPerformanceRow = {
  topic_name: string;
  block_name: string;
  accuracy: number;
  total_questions: number;
  wrong_answers: number;
};

type UserRecentAttemptRow = {
  attempt_id: string;
  attempt_title: string;
  submitted_at: string;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  weakest_block_name: string | null;
};

function mapBlockPerformance(row: UserBlockPerformanceRow): PersistedBlockPerformance {
  return {
    blockName: row.block_name,
    accuracy: row.accuracy,
    correctAnswers: row.correct_answers,
    wrongAnswers: row.wrong_answers,
    totalQuestions: row.total_questions,
  };
}

function mapTopicPerformance(row: UserTopicPerformanceRow): PersistedTopicPerformance {
  return {
    topicName: row.topic_name,
    blockName: row.block_name,
    accuracy: row.accuracy,
    totalQuestions: row.total_questions,
    wrongAnswers: row.wrong_answers,
  };
}

function mapRecentAttempt(row: UserRecentAttemptRow): PersistedRecentAttempt {
  return {
    attemptId: row.attempt_id,
    title: row.attempt_title,
    submittedAt: row.submitted_at,
    score: row.score,
    weakestBlockName: row.weakest_block_name,
    correctAnswers: row.correct_answers,
    wrongAnswers: row.wrong_answers,
  };
}

async function getUserBlockPerformance(
  client: AnalyticsClient,
  userId: string,
): Promise<PersistedBlockPerformance[]> {
  const { data, error } = await client
    .from("user_block_performance")
    .select("block_name, accuracy, correct_answers, wrong_answers, total_questions")
    .eq("user_id", userId)
    .order("accuracy", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as UserBlockPerformanceRow[] | null)?.map(mapBlockPerformance) ?? [];
}

async function getUserTopicPerformance(
  client: AnalyticsClient,
  userId: string,
): Promise<PersistedTopicPerformance[]> {
  const { data, error } = await client
    .from("user_topic_performance")
    .select("topic_name, block_name, accuracy, total_questions, wrong_answers")
    .eq("user_id", userId)
    .order("accuracy", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return (data as UserTopicPerformanceRow[] | null)?.map(mapTopicPerformance) ?? [];
}

async function getUserRecentAttempts(
  client: AnalyticsClient,
  userId: string,
): Promise<PersistedRecentAttempt[]> {
  const { data, error } = await client
    .from("user_recent_attempt_summaries")
    .select("attempt_id, attempt_title, submitted_at, score, correct_answers, wrong_answers, weakest_block_name")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as UserRecentAttemptRow[] | null)?.map(mapRecentAttempt) ?? [];
}

export async function getDashboardSummary(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: AnalyticsClient;
    userId: string;
  },
): Promise<DashboardViewModel | null> {
  const [blockPerformance, topicPerformance, recentAttempts] = await Promise.all([
    getUserBlockPerformance(client, userId),
    getUserTopicPerformance(client, userId),
    getUserRecentAttempts(client, userId),
  ]);

  if (recentAttempts.length === 0 || blockPerformance.length === 0) {
    return null;
  }

  const averageScore = recentAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / recentAttempts.length;

  return mapDashboardViewModel({
    averageScore,
    completedAttempts: recentAttempts.length,
    blockPerformance,
    topicPerformance,
    recentAttempts: recentAttempts.slice(0, 7),
  });
}

export async function getStudentAnalytics(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: AnalyticsClient;
    userId: string;
  },
): Promise<AnalyticsViewModel | null> {
  const [blockPerformance, topicPerformance] = await Promise.all([
    getUserBlockPerformance(client, userId),
    getUserTopicPerformance(client, userId),
  ]);

  if (blockPerformance.length === 0) {
    return null;
  }

  return mapAnalyticsViewModel({
    blockPerformance,
    topicPerformance,
  });
}

export async function getPersonalWeaknessDiagnosis(
  {
    client = getSupabaseBrowserClient(),
    dateFrom,
    dateTo,
    timezone,
  }: {
    client?: AnalyticsClient;
    dateFrom: string;
    dateTo: string;
    timezone: string;
  },
): Promise<PersonalWeaknessDiagnosisViewModel> {
  const { data, error } = await client.rpc("get_personal_weakness_diagnosis", {
    date_from: dateFrom,
    date_to: dateTo,
    user_timezone: timezone,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapPersonalWeaknessDiagnosisViewModel((data ?? {}) as PersonalWeaknessDiagnosisRow);
}
