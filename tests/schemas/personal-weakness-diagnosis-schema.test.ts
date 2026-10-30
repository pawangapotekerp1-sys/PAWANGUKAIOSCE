import { describe, expect, it } from "vitest";
import {
  PersonalWeaknessDiagnosisDataSchema,
  DiagnosisSubtopicRankingSchema,
} from "../../src/lib/schemas/personal-weakness-diagnosis";

describe("PersonalWeaknessDiagnosisDataSchema", () => {
  it("successfully parses valid RPC output with raw accuracy and smoothed accuracy", () => {
    const sampleOutput = {
      summary: {
        rangeStart: "2026-10-01",
        rangeEnd: "2026-10-25",
        timezone: "Asia/Jakarta",
        eligibleAttemptCount: 3,
        minimumAttemptsMet: true,
        diagnosisMode: "full",
        overallAccuracy: 65.5,
        overallAverageTimePerQuestion: 45.2,
        overallQuestionCount: 120,
      },
      globalBehaviorPatterns: [
        {
          code: "frequent_ragu",
          label: "Sering ragu-ragu",
          severity: "high",
          evidence: "35% soal ditandai ragu",
          description: "Perlu penguatan konsep dasar.",
        },
      ],
      subtopicRankings: [
        {
          topicId: "top-1",
          topicName: "Farmakokinetik",
          blockId: "blk-1",
          blockName: "Pharmaceutical Science",
          rank: 1,
          weaknessScore: 68.5,
          confidence: "high",
          questionCount: 25,
          attemptCoverageCount: 3,
          accuracy: 44.0,
          smoothedAccuracy: 47.5,
          averageTimePerQuestion: 50.0,
          behaviorFlags: ["frequent_ragu"],
          summary: "Perlu latihan lebih banyak.",
          isIndicative: false,
        },
        {
          topicId: "top-2",
          topicName: "Endokrin",
          blockId: "blk-2",
          blockName: "Clinical Science",
          rank: 2,
          weaknessScore: 55.0,
          confidence: "medium",
          questionCount: 12,
          attemptCoverageCount: 1,
          accuracy: 33.33,
          smoothedAccuracy: 42.8,
          averageTimePerQuestion: 58.0,
          behaviorFlags: [],
          summary: "Indikatif data terbatas.",
          isIndicative: true,
        },
      ],
      basicSummary: null,
      narrative: {
        headline: "Fokus pada Farmakokinetik",
        body: "Analisis menunjukkan kelemahan di topik ini.",
        nextReadiness: "Tingkatkan latihan.",
      },
    };

    const parsed = PersonalWeaknessDiagnosisDataSchema.safeParse(sampleOutput);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.subtopicRankings[0].accuracy).toBe(44.0);
    expect(parsed.data.subtopicRankings[0].smoothedAccuracy).toBe(47.5);
    expect(parsed.data.subtopicRankings[0].isIndicative).toBe(false);

    expect(parsed.data.subtopicRankings[1].accuracy).toBe(33.33);
    expect(parsed.data.subtopicRankings[1].smoothedAccuracy).toBe(42.8);
    expect(parsed.data.subtopicRankings[1].isIndicative).toBe(true);
  });

  it("fails validation if topicName is missing (e.g. old buggy subtopicName)", () => {
    const malformed = {
      topicId: "top-1",
      subtopicName: "Farmakokinetik", // bug from old code!
      blockName: "Pharmaceutical Science",
      rank: 1,
      weaknessScore: 50,
      confidence: "medium",
      questionCount: 15,
      attemptCoverageCount: 2,
      accuracy: 50,
      averageTimePerQuestion: 40,
      behaviorFlags: [],
      summary: "Test",
      isIndicative: true,
    };

    const parsed = DiagnosisSubtopicRankingSchema.safeParse(malformed);
    expect(parsed.success).toBe(false);
  });
});
