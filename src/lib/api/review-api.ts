import {
  getAttemptReviewPageData,
  listSubmittedAttemptHistory,
} from "./tryout-api";
import {
  getScheduledAttemptReviewPageData,
  listScheduledSubmittedAttemptHistory,
} from "./scheduled-tryout-api";

export type ReviewSource = "tryout" | "scheduled";

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
  const [tryoutHistory, scheduledHistory] = await Promise.all([
    listSubmittedAttemptHistory({ userId }),
    listScheduledSubmittedAttemptHistory({ userId }),
  ]);

  return [
    ...tryoutHistory.map((item) => ({
      ...item,
      source: "tryout" as const,
    })),
    ...scheduledHistory,
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

  return getAttemptReviewPageData({ attemptId });
}
