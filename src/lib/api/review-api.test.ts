import { describe, expect, test, vi } from "vitest";
import { determineReviewCategory, getReviewDetailData, listReviewHistory } from "./review-api";

const mockListSubmittedAttemptHistory = vi.fn();
const mockGetAttemptReviewPageData = vi.fn();
const mockListScheduledSubmittedAttemptHistory = vi.fn();
const mockGetScheduledAttemptReviewPageData = vi.fn();
const mockListOsceAttemptHistory = vi.fn();

vi.mock("./tryout-api", () => ({
  listSubmittedAttemptHistory: (...args: unknown[]) => mockListSubmittedAttemptHistory(...args),
  getAttemptReviewPageData: (...args: unknown[]) => mockGetAttemptReviewPageData(...args),
}));

vi.mock("./scheduled-tryout-api", () => ({
  listScheduledSubmittedAttemptHistory: (...args: unknown[]) => mockListScheduledSubmittedAttemptHistory(...args),
  getScheduledAttemptReviewPageData: (...args: unknown[]) => mockGetScheduledAttemptReviewPageData(...args),
}));

vi.mock("./osce-api", () => ({
  listOsceAttemptHistory: (...args: unknown[]) => mockListOsceAttemptHistory(...args),
  getOsceAttemptDetail: vi.fn(),
}));

describe("review-api", () => {
  describe("determineReviewCategory", () => {
    test("classifies scheduled source as terjadwal", () => {
      expect(determineReviewCategory({ source: "scheduled", title: "TO Akbar" })).toBe("terjadwal");
    });

    test("classifies clinical science as blok_cs", () => {
      expect(determineReviewCategory({ source: "tryout", blockSlug: "clinical-science" })).toBe("blok_cs");
      expect(determineReviewCategory({ source: "tryout", title: "Clinical Science" })).toBe("blok_cs");
    });

    test("classifies pharmaceutical science as blok_ps", () => {
      expect(determineReviewCategory({ source: "tryout", blockSlug: "pharmaceutical-science" })).toBe("blok_ps");
      expect(determineReviewCategory({ source: "tryout", title: "Pharmaceutical Science" })).toBe("blok_ps");
    });

    test("classifies sba as blok_sba", () => {
      expect(determineReviewCategory({ source: "tryout", blockSlug: "social-behavior-administrative-pharmacy" })).toBe("blok_sba");
      expect(determineReviewCategory({ source: "tryout", title: "Social, Behavioral & Administrative Pharmacy" })).toBe("blok_sba");
    });

    test("classifies full mode or tryout besar as all_blok", () => {
      expect(determineReviewCategory({ source: "tryout", mode: "full", title: "Try Out Besar" })).toBe("all_blok");
      expect(determineReviewCategory({ source: "tryout", title: "Try Out All Blok" })).toBe("all_blok");
    });
  });

  describe("listReviewHistory", () => {
    test("merges, assigns categories, and sorts newest first", async () => {
      mockListSubmittedAttemptHistory.mockResolvedValue([
        {
          attemptId: "attempt-1",
          title: "Try Out Besar",
          submittedAt: "2026-05-03T08:00:00.000Z",
          score: 78,
          correctAnswers: 156,
          wrongAnswers: 44,
          mode: "full",
        },
        {
          attemptId: "attempt-2",
          title: "Clinical Science",
          submittedAt: "2026-05-01T08:00:00.000Z",
          score: 70,
          correctAnswers: 70,
          wrongAnswers: 30,
          mode: "block",
          blockSlug: "clinical-science",
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
      mockListOsceAttemptHistory.mockResolvedValue([]);

      const result = await listReviewHistory({ userId: "user-1" });

      expect(result).toHaveLength(3);
      // Newest first:
      expect(result[0].attemptId).toBe("scheduled-attempt-1");
      expect(result[0].category).toBe("terjadwal");

      expect(result[1].attemptId).toBe("attempt-1");
      expect(result[1].category).toBe("all_blok");

      expect(result[2].attemptId).toBe("attempt-2");
      expect(result[2].category).toBe("blok_cs");
    });
  });

  describe("getReviewDetailData", () => {
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
});
