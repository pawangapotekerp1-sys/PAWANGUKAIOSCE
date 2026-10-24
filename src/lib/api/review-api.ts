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

export type ReviewFilterCategory =
  | "all_blok"
  | "blok_cs"
  | "blok_ps"
  | "blok_sba"
  | "terjadwal";

export type ReviewHistoryItem = {
  attemptId: string;
  title: string;
  submittedAt: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: ReviewSource;
  category: ReviewFilterCategory;
};

export function determineReviewCategory(item: {
  source: ReviewSource;
  title?: string;
  mode?: "full" | "block" | "topic" | null;
  blockSlug?: string | null;
  blockName?: string | null;
}): ReviewFilterCategory {
  if (item.source === "scheduled") {
    return "terjadwal";
  }

  const slug = (item.blockSlug || "").toLowerCase();
  const blockName = (item.blockName || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  // Clinical Science
  if (slug === "clinical-science" || blockName.includes("clinical") || title.includes("clinical science") || title.includes("blok cs")) {
    return "blok_cs";
  }

  // Pharmaceutical Science
  if (slug === "pharmaceutical-science" || blockName.includes("pharmaceutical") || title.includes("pharmaceutical science") || title.includes("blok ps")) {
    return "blok_ps";
  }

  // Social, Behavioral & Administrative Pharmacy
  if (
    slug === "social-behavior-administrative-pharmacy" ||
    blockName.includes("social") ||
    blockName.includes("sba") ||
    title.includes("social, behavioral") ||
    title.includes("blok sba")
  ) {
    return "blok_sba";
  }

  // All Blok / Full
  if (item.mode === "full" || title.includes("besar") || title.includes("all blok")) {
    return "all_blok";
  }

  return "all_blok";
}

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

  const items: ReviewHistoryItem[] = [
    ...tryoutHistory.map((item) => ({
      attemptId: item.attemptId,
      title: item.title,
      submittedAt: item.submittedAt,
      score: item.score,
      correctAnswers: item.correctAnswers,
      wrongAnswers: item.wrongAnswers,
      source: "tryout" as const,
      category: determineReviewCategory({
        source: "tryout",
        title: item.title,
        mode: item.mode,
        blockSlug: item.blockSlug,
        blockName: item.blockName,
      }),
    })),
    ...scheduledHistory.map((item) => ({
      ...item,
      category: "terjadwal" as const,
    })),
    ...osceHistory.map((item: any) => ({
      attemptId: item.id,
      title: item.station?.title || "Simulasi OSCE",
      submittedAt: item.created_at,
      score: item.total_score,
      correctAnswers: 0,
      wrongAnswers: 0,
      source: "osce" as const,
      category: "terjadwal" as const,
    })),
  ];

  return items.sort(
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
