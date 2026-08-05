import { describe, expect, test, vi } from "vitest";
import { getReviewDetailData, listReviewHistory } from "./review-api";

const mockListSubmittedAttemptHistory = vi.fn();
const mockGetAttemptReviewPageData = vi.fn();
const mockListScheduledSubmittedAttemptHistory = vi.fn();
const mockGetScheduledAttemptReviewPageData = vi.fn();

vi.mock("./tryout-api", () => ({
  listSubmittedAttemptHistory: (...args: unknown[]) => mockListSubmittedAttemptHistory(...args),
  getAttemptReviewPageData: (...args: unknown[]) => mockGetAttemptReviewPageData(...args),
}));

vi.mock("./scheduled-tryout-api", () => ({
  listScheduledSubmittedAttemptHistory: (...args: unknown[]) => mockListScheduledSubmittedAttemptHistory(...args),
  getScheduledAttemptReviewPageData: (...args: unknown[]) => mockGetScheduledAttemptReviewPageData(...args),
}));

describe("review-api", () => {
  test("merges normal and scheduled submitted history, then sorts newest first", async () => {
    mockListSubmittedAttemptHistory.mockResolvedValue([
      {
        attemptId: "attempt-1",
        title: "Try Out Besar",
        submittedAt: "2026-05-03T08:00:00.000Z",
        score: 78,
        correctAnswers: 156,
        wrongAnswers: 44,
      },
      {
        attemptId: "attempt-2",
        title: "Clinical Science",
        submittedAt: "2026-05-01T08:00:00.000Z",
        score: 70,
        correctAnswers: 70,
        wrongAnswers: 30,
      },
    ]);
    mockListScheduledSubmittedAttemptHistory.mockResolvedValue([
      {
        attemptId: "scheduled-attempt-1",
        title: "TO Klinik Juni",
        submittedAt: "2026-05-04T08:00:00.000Z",
        score: 82,
        correctAnswers: 33,
        wrongAnswers: 7,
        source: "scheduled",
      },
    ]);

    await expect(listReviewHistory({ userId: "user-1" })).resolves.toEqual([
      {
        attemptId: "scheduled-attempt-1",
        title: "TO Klinik Juni",
        submittedAt: "2026-05-04T08:00:00.000Z",
        score: 82,
        correctAnswers: 33,
        wrongAnswers: 7,
        source: "scheduled",
      },
      {
        attemptId: "attempt-1",
        title: "Try Out Besar",
        submittedAt: "2026-05-03T08:00:00.000Z",
        score: 78,
        correctAnswers: 156,
        wrongAnswers: 44,
        source: "tryout",
      },
      {
        attemptId: "attempt-2",
        title: "Clinical Science",
        submittedAt: "2026-05-01T08:00:00.000Z",
        score: 70,
        correctAnswers: 70,
        wrongAnswers: 30,
        source: "tryout",
      },
    ]);
  });

  test("dispatches detail reads to the scheduled review contract when source=scheduled", async () => {
    mockGetScheduledAttemptReviewPageData.mockResolvedValue({
      summary: {
        title: "TO Klinik Juni",
        submittedAt: "2026-05-04T08:00:00.000Z",
        score: 82,
        correctAnswers: 33,
        wrongAnswers: 7,
        source: "scheduled",
      },
      items: [
        {
          id: "scheduled-item-1",
          blockLabel: "Clinical Science",
          question: "Apa target tekanan darah pada CKD?",
          questionImageUrl: null,
          userAnswer: "<140/90",
          correctAnswer: "<130/80",
          explanationText: "Target dipilih lebih ketat untuk proteksi ginjal.",
          explanationImageUrl: null,
          isWrong: true,
        },
      ],
    });

    await expect(
      getReviewDetailData({
        attemptId: "scheduled-attempt-1",
        source: "scheduled",
      }),
    ).resolves.toEqual({
      summary: {
        title: "TO Klinik Juni",
        submittedAt: "2026-05-04T08:00:00.000Z",
        score: 82,
        correctAnswers: 33,
        wrongAnswers: 7,
        source: "scheduled",
      },
      items: [
        expect.objectContaining({
          id: "scheduled-item-1",
          question: "Apa target tekanan darah pada CKD?",
        }),
      ],
    });

    expect(mockGetScheduledAttemptReviewPageData).toHaveBeenCalledWith({
      attemptId: "scheduled-attempt-1",
    });
    expect(mockGetAttemptReviewPageData).not.toHaveBeenCalled();
  });
});
