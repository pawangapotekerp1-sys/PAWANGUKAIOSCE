import { describe, expect, it } from "vitest";
import {
  PersonalWeaknessDiagnosisDataSchema,
  DiagnosisSubtopicRankingSchema,
} from "./schemas.ts";

describe("personal-weakness-diagnosis schema", () => {
  it("validates a full diagnosis payload with topicName and isIndicative", () => {
    const rawData = {
      summary: {
        rangeStart: "2026-10-01",
        rangeEnd: "2026-10-25",
        timezone: "Asia/Jakarta",
        eligibleAttemptCount: 3,
        minimumAttemptsMet: true,
        diagnosisMode: "full",
        overallAccuracy: 68.5,
        overallAverageTimePerQuestion: 72.4,
        overallQuestionCount: 150,
      },
      globalBehaviorPatterns: [
        {
          code: "frequent_ragu",
          label: "Sering ragu-ragu",
          severity: "medium",
          evidence: "22% soal sempat ditandai ragu-ragu.",
          description: "Tanda ragu-ragu yang berulang...",
        },
      ],
      subtopicRankings: [
        {
          topicId: "top-1",
          topicName: "Farmakokinetika Klinis",
          blockId: "blk-1",
          blockName: "Clinical Science",
          rank: 1,
          weaknessScore: 82.5,
          confidence: "high",
          questionCount: 25,
          attemptCoverageCount: 3,
          accuracy: 44.0,
          averageTimePerQuestion: 95.0,
          behaviorFlags: ["slow_pacing", "frequent_ragu"],
          summary: "Farmakokinetika Klinis menjadi subtopik lemah...",
          isIndicative: false,
        },
        {
          topicId: "top-2",
          topicName: "Stabilitas Sediaan",
          blockId: "blk-2",
          blockName: "Pharmaceutics",
          rank: 2,
          weaknessScore: 75.0,
          confidence: "medium",
          questionCount: 12,
          attemptCoverageCount: 2,
          accuracy: 50.0,
          averageTimePerQuestion: 60.0,
          behaviorFlags: [],
          summary: "Stabilitas Sediaan indikatif...",
          isIndicative: true,
        },
      ],
      basicSummary: null,
      narrative: {
        headline: "Kelemahan paling konsisten...",
        body: "Akurasi Farmakokinetika Klinis paling tertahan...",
        nextReadiness: "Diagnosis penuh ini disusun dari 3 try out...",
      },
    };

    const parsed = PersonalWeaknessDiagnosisDataSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subtopicRankings[0].topicName).toBe("Farmakokinetika Klinis");
      expect(parsed.data.subtopicRankings[0].isIndicative).toBe(false);
      expect(parsed.data.subtopicRankings[1].isIndicative).toBe(true);
    }
  });

  it("defaults isIndicative to false if omitted", () => {
    const rawRanking = {
      topicId: "top-3",
      topicName: "KIE Apotek",
      blockName: "Social & Administrative",
      rank: 3,
      weaknessScore: 50.0,
      confidence: "low",
      questionCount: 22,
      attemptCoverageCount: 3,
      accuracy: 65.0,
      averageTimePerQuestion: 40.0,
      behaviorFlags: [],
      summary: "KIE Apotek ringkasan",
    };

    const parsed = DiagnosisSubtopicRankingSchema.safeParse(rawRanking);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isIndicative).toBe(false);
    }
  });
});
