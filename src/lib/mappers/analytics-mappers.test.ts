import { describe, expect, test } from "vitest";
import { mapPersonalWeaknessDiagnosisViewModel } from "./analytics-mappers";

describe("mapPersonalWeaknessDiagnosisViewModel", () => {
  test("preserves subtopic ranking order and behavior flags", () => {
    const result = mapPersonalWeaknessDiagnosisViewModel({
      summary: {
        rangeStart: "2026-05-01",
        rangeEnd: "2026-05-07",
        timezone: "Asia/Jakarta",
        eligibleAttemptCount: 4,
        minimumAttemptsMet: true,
        diagnosisMode: "full",
        overallAccuracy: 61,
        overallAverageTimePerQuestion: 80,
        overallQuestionCount: 200,
      },
      globalBehaviorPatterns: [
        {
          code: "slow_pacing",
          label: "Terlalu lama",
          severity: "medium",
          evidence: "Rata-rata waktu per soal 80 detik.",
          description: "Tempo pengerjaan melambat.",
        },
      ],
      subtopicRankings: [
        {
          topicId: "topic-1",
          topicName: "Kardiologi",
          blockId: "block-1",
          blockName: "Clinical Science",
          rank: 1,
          weaknessScore: 44.2,
          confidence: "high",
          questionCount: 18,
          attemptCoverageCount: 4,
          accuracy: 53,
          averageTimePerQuestion: 96,
          behaviorFlags: ["slow_pacing", "correct_to_wrong_switches"],
          summary: "Kardiologi paling tertahan.",
        },
        {
          topicId: "topic-2",
          topicName: "Farmakoekonomi",
          blockId: "block-2",
          blockName: "Social, Behavioral & Administrative",
          rank: 2,
          weaknessScore: 37,
          confidence: "medium",
          questionCount: 8,
          attemptCoverageCount: 3,
          accuracy: 60,
          averageTimePerQuestion: 76,
          behaviorFlags: ["frequent_ragu"],
          summary: "Farmakoekonomi masih sering ragu-ragu.",
        },
      ],
      narrative: {
        headline: "Kelemahan paling konsisten muncul di Kardiologi.",
        body: "Akurasi tertahan dan disertai pola lambat.",
        nextReadiness: "Diagnosis penuh disusun dari 4 try out.",
      },
    });

    expect(result.subtopicRankings[0]).toMatchObject({
      topicName: "Kardiologi",
      confidence: "high",
      behaviorFlags: ["slow_pacing", "correct_to_wrong_switches"],
    });
    expect(result.subtopicRankings[1]).toMatchObject({
      topicName: "Farmakoekonomi",
      behaviorFlags: ["frequent_ragu"],
    });
  });

  test("keeps provided narrative fields and summary values", () => {
    const result = mapPersonalWeaknessDiagnosisViewModel({
      summary: {
        rangeStart: "2026-05-08",
        rangeEnd: "2026-05-10",
        timezone: "Asia/Jakarta",
        eligibleAttemptCount: 2,
        minimumAttemptsMet: false,
        diagnosisMode: "basic",
        overallAccuracy: 68,
        overallAverageTimePerQuestion: 72,
        overallQuestionCount: 100,
      },
      globalBehaviorPatterns: [],
      subtopicRankings: [],
      basicSummary: {
        message: "Diagnosis penuh membutuhkan minimal 3 try out.",
        eligibleAttemptCount: 2,
        overallAccuracy: 68,
        observedTopics: ["Kardiologi"],
        globalBehaviorPatterns: [],
      },
      narrative: {
        headline: "Data diagnosis belum cukup.",
        body: "Baru ada dua try out.",
        nextReadiness: "Tambah satu try out lagi.",
      },
    });

    expect(result.summary).toMatchObject({
      diagnosisMode: "basic",
      eligibleAttemptCount: 2,
      minimumAttemptsMet: false,
    });
    expect(result.basicSummary).toMatchObject({
      observedTopics: ["Kardiologi"],
    });
    expect(result.narrative).toMatchObject({
      headline: "Data diagnosis belum cukup.",
      body: "Baru ada dua try out.",
      nextReadiness: "Tambah satu try out lagi.",
    });
  });

  test("fills safe defaults when optional diagnosis fields are missing", () => {
    const result = mapPersonalWeaknessDiagnosisViewModel({
      summary: {
        diagnosisMode: "empty",
      },
    });

    expect(result.summary).toMatchObject({
      diagnosisMode: "empty",
      eligibleAttemptCount: 0,
      timezone: "UTC",
    });
    expect(result.globalBehaviorPatterns).toEqual([]);
    expect(result.subtopicRankings).toEqual([]);
    expect(result.narrative).toMatchObject({
      headline: "Diagnosis belum tersedia.",
    });
  });
});
