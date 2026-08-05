import { describe, expect, test, vi } from "vitest";
import { getDashboardSummary, getPersonalWeaknessDiagnosis, getStudentAnalytics } from "./analytics-api";

describe("analytics-api", () => {
  test("dashboard returns average score, strongest block, weakest block, and recent attempts", async () => {
    const recentOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "attempt-2",
          attempt_title: "Try Out Besar",
          submitted_at: "2026-05-01T10:00:00.000Z",
          score: 74,
          correct_answers: 148,
          wrong_answers: 52,
          weakest_block_name: "Clinical Science",
        },
        {
          attempt_id: "attempt-1",
          attempt_title: "Clinical Science",
          submitted_at: "2026-04-29T10:00:00.000Z",
          score: 68,
          correct_answers: 34,
          wrong_answers: 16,
          weakest_block_name: "Clinical Science",
        },
      ],
      error: null,
    });
    const blocksOrder = vi.fn().mockResolvedValue({
      data: [
        {
          block_name: "Clinical Science",
          accuracy: 64,
          correct_answers: 16,
          wrong_answers: 9,
          total_questions: 25,
        },
        {
          block_name: "Pharmaceutical Science",
          accuracy: 81,
          correct_answers: 13,
          wrong_answers: 3,
          total_questions: 16,
        },
      ],
      error: null,
    });
    const topicsLimit = vi.fn().mockResolvedValue({
      data: [
        {
          topic_name: "Farmakoterapi kardiovaskular",
          block_name: "Clinical Science",
          accuracy: 52,
          total_questions: 10,
          wrong_answers: 4,
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "user_recent_attempt_summaries") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: recentOrder,
              })),
            })),
          };
        }

        if (table === "user_block_performance") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: blocksOrder,
              })),
            })),
          };
        }

        if (table === "user_topic_performance") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: topicsLimit,
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const summary = await getDashboardSummary({
      client: client as never,
      userId: "user-1",
    });

    expect(summary).not.toBeNull();
    expect(summary?.progressCards[0]).toMatchObject({
      label: "Skor rata-rata",
      value: "71",
    });
    expect(summary?.blockPerformance[0]).toMatchObject({
      name: "Clinical Science",
      score: 64,
    });
    expect(summary?.recentAttempts[0]).toMatchObject({
      title: "Try Out Besar",
    });
    expect(summary?.latestAttemptId).toBe("attempt-2");
  });

  test("analytics page returns block accuracy and topic weakness ranking", async () => {
    const blocksOrder = vi.fn().mockResolvedValue({
      data: [
        {
          block_name: "Clinical Science",
          accuracy: 64,
          correct_answers: 16,
          wrong_answers: 9,
          total_questions: 25,
        },
        {
          block_name: "Pharmaceutical Science",
          accuracy: 81,
          correct_answers: 13,
          wrong_answers: 3,
          total_questions: 16,
        },
      ],
      error: null,
    });
    const topicsLimit = vi.fn().mockResolvedValue({
      data: [
        {
          topic_name: "Farmakoterapi kardiovaskular",
          block_name: "Clinical Science",
          accuracy: 52,
          total_questions: 10,
          wrong_answers: 4,
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "user_block_performance") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: blocksOrder,
              })),
            })),
          };
        }

        if (table === "user_topic_performance") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: topicsLimit,
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const analytics = await getStudentAnalytics({
      client: client as never,
      userId: "user-1",
    });

    expect(analytics).not.toBeNull();
    expect(analytics?.weakestBlock).toMatchObject({
      name: "Clinical Science",
      score: 64,
    });
    expect(analytics?.topicWeaknessRanking[0]).toMatchObject({
      topic: "Farmakoterapi kardiovaskular",
    });
    expect(analytics?.rulesInsights[0]).toMatchObject({
      title: expect.stringMatching(/hasil try out terakhir/i),
    });
  });

  test("returns empty analytics when the user has no completed attempts", async () => {
    const blocksOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const topicsLimit = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const recentOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "user_recent_attempt_summaries") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: recentOrder,
              })),
            })),
          };
        }

        if (table === "user_block_performance") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: blocksOrder,
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: topicsLimit,
              })),
            })),
          })),
        };
      }),
    };

    await expect(
      getDashboardSummary({
        client: client as never,
        userId: "user-1",
      }),
    ).resolves.toBeNull();

    await expect(
      getStudentAnalytics({
        client: client as never,
        userId: "user-1",
      }),
    ).resolves.toBeNull();
  });

  test("calls the diagnosis rpc and maps a full diagnosis payload", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        summary: {
          rangeStart: "2026-05-01",
          rangeEnd: "2026-05-07",
          timezone: "Asia/Jakarta",
          eligibleAttemptCount: 5,
          minimumAttemptsMet: true,
          diagnosisMode: "full",
          overallAccuracy: 62.5,
          overallAverageTimePerQuestion: 78,
          overallQuestionCount: 250,
        },
        globalBehaviorPatterns: [
          {
            code: "slow_pacing",
            label: "Terlalu lama",
            severity: "medium",
            evidence: "Rata-rata waktu per soal berada di 78 detik.",
            description: "Tempo pengerjaan melambat pada rentang ini.",
          },
        ],
        subtopicRankings: [
          {
            topicId: "topic-1",
            topicName: "Kardiologi",
            blockId: "block-1",
            blockName: "Clinical Science",
            rank: 1,
            weaknessScore: 48.25,
            confidence: "high",
            questionCount: 20,
            attemptCoverageCount: 5,
            accuracy: 55,
            averageTimePerQuestion: 90,
            behaviorFlags: ["slow_pacing", "correct_to_wrong_switches"],
            summary: "Kardiologi lemah karena akurasi rendah dan tempo lambat.",
          },
        ],
        basicSummary: null,
        narrative: {
          headline: "Kelemahan paling konsisten muncul di Kardiologi.",
          body: "Akurasi paling tertahan dan disertai perubahan jawaban yang merugikan.",
          nextReadiness: "Diagnosis penuh disusun dari 5 try out.",
        },
      },
      error: null,
    });

    const diagnosis = await getPersonalWeaknessDiagnosis({
      client: { rpc } as never,
      dateFrom: "2026-05-01",
      dateTo: "2026-05-07",
      timezone: "Asia/Jakarta",
    });

    expect(rpc).toHaveBeenCalledWith("get_personal_weakness_diagnosis", {
      date_from: "2026-05-01",
      date_to: "2026-05-07",
      user_timezone: "Asia/Jakarta",
    });
    expect(diagnosis.summary).toMatchObject({
      diagnosisMode: "full",
      eligibleAttemptCount: 5,
    });
    expect(diagnosis.subtopicRankings[0]).toMatchObject({
      topicName: "Kardiologi",
      confidence: "high",
      behaviorFlags: ["slow_pacing", "correct_to_wrong_switches"],
    });
  });

  test("maps a basic diagnosis payload without throwing", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        summary: {
          rangeStart: "2026-05-01",
          rangeEnd: "2026-05-02",
          timezone: "Asia/Jakarta",
          eligibleAttemptCount: 2,
          minimumAttemptsMet: false,
          diagnosisMode: "basic",
          overallAccuracy: 66,
          overallAverageTimePerQuestion: 72,
          overallQuestionCount: 100,
        },
        globalBehaviorPatterns: [],
        subtopicRankings: [],
        basicSummary: {
          message: "Diagnosis penuh membutuhkan minimal 3 try out.",
          eligibleAttemptCount: 2,
          overallAccuracy: 66,
          observedTopics: ["Kardiologi", "Farmakoekonomi"],
          globalBehaviorPatterns: [],
        },
        narrative: {
          headline: "Data diagnosis belum cukup.",
          body: "Baru ada 2 try out eligible.",
          nextReadiness: "Tambah satu try out lagi.",
        },
      },
      error: null,
    });

    await expect(
      getPersonalWeaknessDiagnosis({
        client: { rpc } as never,
        dateFrom: "2026-05-01",
        dateTo: "2026-05-02",
        timezone: "Asia/Jakarta",
      }),
    ).resolves.toMatchObject({
      summary: {
        diagnosisMode: "basic",
      },
      basicSummary: {
        observedTopics: ["Kardiologi", "Farmakoekonomi"],
      },
    });
  });

  test("maps an empty diagnosis payload without throwing", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        summary: {
          rangeStart: "2026-05-01",
          rangeEnd: "2026-05-07",
          timezone: "Asia/Jakarta",
          eligibleAttemptCount: 0,
          minimumAttemptsMet: false,
          diagnosisMode: "empty",
          overallAccuracy: 0,
          overallAverageTimePerQuestion: 0,
          overallQuestionCount: 0,
        },
        globalBehaviorPatterns: [],
        subtopicRankings: [],
        basicSummary: null,
        narrative: {
          headline: "Belum ada data diagnosis.",
          body: "Tidak ada try out eligible.",
          nextReadiness: "Jalankan try out besar dulu.",
        },
      },
      error: null,
    });

    await expect(
      getPersonalWeaknessDiagnosis({
        client: { rpc } as never,
        dateFrom: "2026-05-01",
        dateTo: "2026-05-07",
        timezone: "Asia/Jakarta",
      }),
    ).resolves.toMatchObject({
      summary: {
        diagnosisMode: "empty",
        eligibleAttemptCount: 0,
      },
      subtopicRankings: [],
    });
  });
});
