import {
  getAttemptReviewPageData,
  listSubmittedAttemptHistory,
} from "./tryout-api";
import {
  getScheduledAttemptReviewPageData,
  listScheduledSubmittedAttemptHistory,
} from "./scheduled-tryout-api";
import {
  getOsceAttemptDetail,
  listOsceAttemptHistory,
} from "./osce-api";

export type ReviewSource = "tryout" | "scheduled" | "osce";

export type ReviewHistoryItem = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: ReviewSource;
};

export async function listReviewHistory({
  userId,
}: {
  userId: string;
}): Promise<ReviewHistoryItem[]> {
  const [tryoutHistory, scheduledHistory, osceHistory] = await Promise.all([
    listSubmittedAttemptHistory({ userId }),
    listScheduledSubmittedAttemptHistory({ userId }),
    listOsceAttemptHistory(),
  ]);

  return [
    ...tryoutHistory.map((item) => ({
      ...item,
      source: "tryout" as const,
    })),
    ...scheduledHistory,
    ...osceHistory.map((item: any) => ({
      attemptId: item.id,
      title: item.station?.title || "Simulasi OSCE",
      submittedAt: item.created_at,
      score: item.total_score,
      correctAnswers: 0,
      wrongAnswers: 0,
      source: "osce" as const,
    })),
  ].sort(
    (left, right) =>
      new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
}

export async function getReviewDetailData({
  attemptId,
  source = "tryout",
}: {
  attemptId: string;
  source?: ReviewSource;
}) {
  if (source === "scheduled") {
    return getScheduledAttemptReviewPageData({ attemptId });
  }

  if (source === "osce") {
    const data = await getOsceAttemptDetail(attemptId);
    return {
      summary: {
        score: data.total_score,
        maxScore: data.max_score,
        correctAnswers: 0,
        wrongAnswers: 0,
        submittedAt: data.created_at,
        source: "osce" as const,
      },
      items: [], // Tryout items will be empty, we will pass osce_data directly
      osce_data: data
    };
  }

  return getAttemptReviewPageData({ attemptId });
}
