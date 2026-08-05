export type IngestionJobReviewStatus = "needs_review" | "completed";

export function resolveIngestionJobStatusAfterDecision(
  remainingUndecidedCount: number,
): IngestionJobReviewStatus {
  return remainingUndecidedCount > 0 ? "needs_review" : "completed";
}
