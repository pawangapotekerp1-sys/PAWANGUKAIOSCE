import { describe, expect, test, vi } from "vitest";
import {
  createScheduledEvent,
  getScheduledEventLeaderboard,
  getScheduledAttemptResultPageData,
  getScheduledAttemptReviewPageData,
  getScheduledAttemptSessionPageData,
  getScheduledEventEditorData,
  listScheduledTryoutCatalogEntries,
  reactivateScheduledEvent,
  updateScheduledEvent,
  uploadScheduledQuestionMedia,
} from "./scheduled-tryout-api";

describe("scheduled-tryout-api", () => {
  test("lists only active scheduled events and computes remaining attempts out of five for the active cycle", async () => {
    const eventsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "event-active",
          title: "TO Klinik Juni",
          description: "Jendela aktif untuk student pro.",
          editorial_status: "published",
          access_start_at: "2026-06-09T00:00:00.000Z",
          access_end_at: "2026-06-10T12:00:00.000Z",
          current_cycle: 2,
        },
        {
          id: "event-upcoming",
          title: "TO Bedah Juli",
          description: "Belum dibuka.",
          editorial_status: "published",
          access_start_at: "2026-06-11T00:00:00.000Z",
          access_end_at: "2026-06-12T12:00:00.000Z",
          current_cycle: 1,
        },
        {
          id: "event-expired",
          title: "TO Lama",
          description: "Sudah selesai.",
          editorial_status: "published",
          access_start_at: "2026-06-01T00:00:00.000Z",
          access_end_at: "2026-06-02T12:00:00.000Z",
          current_cycle: 3,
        },
      ],
      error: null,
    });
    const questionIn = vi.fn().mockResolvedValue({
      data: [
        { id: "question-1", event_id: "event-active" },
        { id: "question-2", event_id: "event-active" },
      ],
      error: null,
    });
    const attemptsIn = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        data: [
          { event_id: "event-active", event_cycle: 2, status: "submitted" },
          { event_id: "event-active", event_cycle: 2, status: "submitted" },
          { event_id: "event-active", event_cycle: 2, status: "paused" },
        ],
        error: null,
      }),
    }));
    const client = {
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: eventsOrder,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_event_questions") {
          return {
            select: vi.fn(() => ({
              in: questionIn,
            })),
          };
        }

        if (table === "scheduled_tryout_attempts") {
          return {
            select: vi.fn(() => ({
              in: attemptsIn,
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      listScheduledTryoutCatalogEntries({
        client: client as never,
        userId: "user-1",
        now: new Date("2026-06-09T10:00:00.000Z"),
      }),
    ).resolves.toEqual([
      {
        id: "event-active",
        title: "TO Klinik Juni",
        description: "Jendela aktif untuk student pro.",
        accessStartAt: "2026-06-09T00:00:00.000Z",
        accessEndAt: "2026-06-10T12:00:00.000Z",
        currentCycle: 2,
        questionCount: 2,
        durationMinutes: 2,
        remainingAttempts: 3,
        submittedAttemptCount: 2,
        hasActiveAttempt: true,
      },
    ]);
  });

  test("fetches a scheduled event leaderboard through the dedicated rpc", async () => {
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
        title: "TO Klinik Juni",
        access_end_at: "2026-06-16T03:00:00.000Z",
        current_cycle: 2,
      },
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          rank: 1,
          event_id: "event-1",
          event_cycle: 2,
          user_id: "user-1",
          alias: "FarmasiNad",
          best_score: 92,
          best_score_attempt_number: 2,
          attempt_id: "attempt-2",
          submitted_at: "2026-06-16T01:00:00.000Z",
          leaderboard_state: "live",
        },
      ],
      error: null,
    });
    const client = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: eventSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      getScheduledEventLeaderboard({
        client: client as never,
        eventId: "event-1",
      }),
    ).resolves.toEqual({
      state: "live",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 2,
      rows: [
        {
          rank: 1,
          eventId: "event-1",
          eventCycle: 2,
          userId: "user-1",
          alias: "FarmasiNad",
          bestScore: 92,
          bestScoreAttemptNumber: 2,
          attemptId: "attempt-2",
          submittedAt: "2026-06-16T01:00:00.000Z",
        },
      ],
    });

    expect(rpc).toHaveBeenCalledWith("get_scheduled_event_leaderboard", {
      target_event_id: "event-1",
      target_event_cycle: 2,
    });
  });

  test("derives a live empty leaderboard state from current event metadata when nobody has submitted yet", async () => {
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
        title: "TO Klinik Juni",
        access_end_at: "2026-06-16T03:00:00.000Z",
        current_cycle: 2,
      },
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const client = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: eventSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      getScheduledEventLeaderboard({
        client: client as never,
        eventId: "event-1",
        now: new Date("2026-06-16T01:00:00.000Z"),
      }),
    ).resolves.toEqual({
      state: "live",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 2,
      rows: [],
    });
  });

  test("forces historical leaderboard cycles to final even if the current cycle is still live", async () => {
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
        title: "TO Klinik Juni",
        access_end_at: "2026-06-16T03:00:00.000Z",
        current_cycle: 3,
      },
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const client = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: eventSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      getScheduledEventLeaderboard({
        client: client as never,
        eventId: "event-1",
        eventCycle: 2,
        now: new Date("2026-06-16T01:00:00.000Z"),
      }),
    ).resolves.toEqual({
      state: "final",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 2,
      rows: [],
    });
  });

  test("builds the scheduled session page contract from attempt snapshots and answers", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "scheduled-attempt-1",
      },
      error: null,
    });
    const attemptSingle = vi.fn().mockResolvedValue({
      data: {
        id: "scheduled-attempt-1",
        event_id: "event-1",
        event_cycle: 2,
        user_id: "user-1",
        status: "paused",
        started_at: "2026-06-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 1200,
        elapsed_seconds: 300,
        last_resumed_at: null,
        paused_at: "2026-06-01T10:05:00.000Z",
        total_questions: 1,
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "attempt-item-1",
          attempt_id: "scheduled-attempt-1",
          event_question_id: "question-1",
          block_id_snapshot: "block-1",
          question_snapshot: "Apa terapi awal yang paling rasional?",
          question_image_path_snapshot: "question/scheduled-events/event-1-question.png",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key_snapshot: "B",
          sort_order: 1,
          block: {
            name: "Clinical Science",
          },
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "scheduled-attempt-1",
          attempt_item_id: "attempt-item-1",
          selected_option_key: "B",
          is_doubtful: true,
          answered_at: "2026-06-01T10:03:00.000Z",
        },
      ],
      error: null,
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: {
        signedUrl: "https://signed.example/question/scheduled-events/event-1-question.png",
      },
      error: null,
    });
    const client = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: attemptSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: answersOrder,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(
      getScheduledAttemptSessionPageData({
        client: client as never,
        attemptId: "scheduled-attempt-1",
        now: new Date("2026-06-01T10:10:00.000Z"),
      }),
    ).resolves.toEqual({
      view: "ready",
      attempt: {
        id: "scheduled-attempt-1",
        status: "paused",
        totalQuestions: 1,
        timeRemainingSeconds: 900,
      },
      questions: [
        {
          id: "attempt-item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal yang paling rasional?",
          questionImageUrl: "https://signed.example/question/scheduled-events/event-1-question.png",
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: true,
        },
      ],
    });

    expect(rpc).toHaveBeenCalledWith("sync_scheduled_tryout_attempt", {
      target_attempt_id: "scheduled-attempt-1",
    });
  });

  test("builds the scheduled result page contract with derived block summaries", async () => {
    const resultSingle = vi.fn().mockResolvedValue({
      data: {
        attempt_id: "scheduled-attempt-1",
        score_percentage: 82.5,
        correct_count: 33,
        wrong_count: 7,
        unanswered_count: 0,
      },
      error: null,
    });
    const attemptSingle = vi.fn().mockResolvedValue({
      data: {
        id: "scheduled-attempt-1",
        event_id: "event-1",
        event_cycle: 2,
        user_id: "user-1",
        status: "submitted",
        started_at: "2026-06-01T10:00:00.000Z",
        submitted_at: "2026-06-01T10:30:00.000Z",
        time_limit_seconds: 2400,
        elapsed_seconds: 1800,
        last_resumed_at: null,
        paused_at: null,
        total_questions: 2,
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "attempt-item-1",
          attempt_id: "scheduled-attempt-1",
          event_question_id: "question-1",
          block_id_snapshot: "block-1",
          question_snapshot: "Soal 1",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key_snapshot: "B",
          sort_order: 1,
          block: {
            name: "Clinical Science",
          },
        },
        {
          id: "attempt-item-2",
          attempt_id: "scheduled-attempt-1",
          event_question_id: "question-2",
          block_id_snapshot: "block-1",
          question_snapshot: "Soal 2",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key_snapshot: "A",
          sort_order: 2,
          block: {
            name: "Clinical Science",
          },
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "scheduled-attempt-1",
          attempt_item_id: "attempt-item-1",
          selected_option_key: "B",
          is_doubtful: false,
          answered_at: "2026-06-01T10:10:00.000Z",
        },
        {
          attempt_id: "scheduled-attempt-1",
          attempt_item_id: "attempt-item-2",
          selected_option_key: "B",
          is_doubtful: false,
          answered_at: "2026-06-01T10:20:00.000Z",
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_attempt_results") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: resultSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: attemptSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: answersOrder,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      getScheduledAttemptResultPageData({
        client: client as never,
        attemptId: "scheduled-attempt-1",
      }),
    ).resolves.toEqual({
      attemptId: "scheduled-attempt-1",
      eventId: "event-1",
      eventCycle: 2,
      score: 82.5,
      correctAnswers: 33,
      wrongAnswers: 7,
      unansweredCount: 0,
      timeUsedSeconds: 1800,
      blocks: [
        {
          blockLabel: "Clinical Science",
          correct: 1,
          wrong: 1,
        },
      ],
    });
  });

  test("rejects scheduled review detail reads until the attempt has been submitted", async () => {
    const attemptSingle = vi.fn().mockResolvedValue({
      data: {
        id: "scheduled-attempt-1",
        event_id: "event-1",
        event_cycle: 2,
        user_id: "user-1",
        status: "paused",
        started_at: "2026-06-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 2400,
        elapsed_seconds: 900,
        last_resumed_at: null,
        paused_at: "2026-06-01T10:15:00.000Z",
        total_questions: 2,
      },
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: attemptSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      getScheduledAttemptReviewPageData({
        client: client as never,
        attemptId: "scheduled-attempt-1",
      }),
    ).rejects.toThrow(/hanya tersedia setelah attempt disubmit/i);
  });

  test("builds the scheduled review page contract with summary and item snapshots", async () => {
    const attemptSingle = vi.fn().mockResolvedValue({
      data: {
        id: "scheduled-attempt-1",
        event_id: "event-1",
        event_cycle: 2,
        user_id: "user-1",
        status: "submitted",
        started_at: "2026-06-01T10:00:00.000Z",
        submitted_at: "2026-06-01T10:30:00.000Z",
        time_limit_seconds: 2400,
        elapsed_seconds: 1800,
        last_resumed_at: null,
        paused_at: null,
        total_questions: 1,
      },
      error: null,
    });
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
        title: "TO Klinik Juni",
      },
      error: null,
    });
    const resultSingle = vi.fn().mockResolvedValue({
      data: {
        attempt_id: "scheduled-attempt-1",
        score_percentage: 82.5,
        correct_count: 33,
        wrong_count: 7,
        unanswered_count: 0,
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "attempt-item-1",
          attempt_id: "scheduled-attempt-1",
          event_question_id: "question-1",
          block_id_snapshot: "block-1",
          question_snapshot: "Apa terapi awal yang paling rasional?",
          question_image_path_snapshot: "question/scheduled-events/event-1-question.png",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key_snapshot: "B",
          sort_order: 1,
          explanation_text_snapshot: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanation_image_path_snapshot: "explanation/scheduled-events/event-1-explanation.png",
          block: {
            name: "Clinical Science",
          },
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "scheduled-attempt-1",
          attempt_item_id: "attempt-item-1",
          selected_option_key: "A",
          is_doubtful: false,
          answered_at: "2026-06-01T10:10:00.000Z",
        },
      ],
      error: null,
    });
    const createSignedUrl = vi.fn((path: string) => Promise.resolve({
      data: {
        signedUrl: `https://signed.example/${path}`,
      },
      error: null,
    }));
    const client = {
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: attemptSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: eventSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_attempt_results") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: resultSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: answersOrder,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(
      getScheduledAttemptReviewPageData({
        client: client as never,
        attemptId: "scheduled-attempt-1",
      }),
    ).resolves.toEqual({
      summary: {
        title: "TO Klinik Juni",
        submittedAt: "2026-06-01T10:30:00.000Z",
        score: 82.5,
        correctAnswers: 33,
        wrongAnswers: 7,
        source: "scheduled",
      },
      items: [
        {
          id: "attempt-item-1",
          blockLabel: "Clinical Science",
          question: "Apa terapi awal yang paling rasional?",
          questionImageUrl: "https://signed.example/question/scheduled-events/event-1-question.png",
          userAnswer: "Pilihan A",
          correctAnswer: "Pilihan B",
          explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanationImageUrl: "https://signed.example/explanation/scheduled-events/event-1-explanation.png",
          isWrong: true,
        },
      ],
    });
  });

  test("loads scheduled event editor data with isolated question rows and signed media", async () => {
    const eventSingle = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
        title: "TO Klinik Juni",
        description: "Try out aktif untuk peserta pro.",
        editorial_status: "published",
        access_start_at: "2026-06-01T01:00:00.000Z",
        access_end_at: "2026-06-03T14:00:00.000Z",
        current_cycle: 2,
        updated_at: "2026-06-05T08:30:00.000Z",
      },
      error: null,
    });
    const questionsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "question-1",
          event_id: "event-1",
          question_order: 1,
          stem: "Apa terapi awal yang paling rasional?",
          question_image_path: "question/scheduled-events/event-1-question.png",
          explanation_text: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanation_image_path: "explanation/scheduled-events/event-1-explanation.png",
          correct_option_key: "B",
          block: {
            id: "block-1",
            name: "Clinical Science",
          },
          topic: {
            id: "topic-1",
            name: "Kardiologi",
          },
          options: [
            { id: "option-1", option_key: "A", option_text: "Pilihan A", sort_order: 1 },
            { id: "option-2", option_key: "B", option_text: "Pilihan B", sort_order: 2 },
          ],
        },
      ],
      error: null,
    });
    const createSignedUrl = vi.fn((path: string) => Promise.resolve({
      data: {
        signedUrl: `https://signed.example/${path}`,
      },
      error: null,
    }));
    const client = {
      from: vi.fn((table: string) => {
        if (table === "scheduled_tryout_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: eventSingle,
              })),
            })),
          };
        }

        if (table === "scheduled_tryout_event_questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: questionsOrder,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(
      getScheduledEventEditorData({
        client: client as never,
        eventId: "event-1",
      }),
    ).resolves.toEqual({
      event: {
        id: "event-1",
        title: "TO Klinik Juni",
        description: "Try out aktif untuk peserta pro.",
        editorialStatus: "published",
        accessStartAt: "2026-06-01T08:00",
        accessEndAt: "2026-06-03T21:00",
        currentCycle: 2,
        updatedAt: "2026-06-05T08:30:00.000Z",
      },
      questions: [
        expect.objectContaining({
          id: "question-1",
          order: 1,
          stem: "Apa terapi awal yang paling rasional?",
          questionImagePath: "question/scheduled-events/event-1-question.png",
          questionImageUrl: "https://signed.example/question/scheduled-events/event-1-question.png",
          explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanationImagePath: "explanation/scheduled-events/event-1-explanation.png",
          explanationImageUrl: "https://signed.example/explanation/scheduled-events/event-1-explanation.png",
          correctOptionKey: "B",
          blockId: "block-1",
          blockName: "Clinical Science",
          topicId: "topic-1",
          topicName: "Kardiologi",
          options: [
            { id: "option-1", key: "A", text: "Pilihan A", sortOrder: 1 },
            { id: "option-2", key: "B", text: "Pilihan B", sortOrder: 2 },
          ],
        }),
      ],
    });
  });

  test("persists new scheduled events through one transactional rpc with normalized access times", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
      },
      error: null,
    });
    const client = {
      rpc,
    };

    await createScheduledEvent({
      client: client as never,
      input: {
        title: "TO Klinik Juni",
        description: "Try out aktif untuk peserta pro.",
        editorialStatus: "published",
        accessStartAt: "2026-06-10T08:00",
        accessEndAt: "2026-06-12T21:00",
        questions: [
          {
            stem: "Apa terapi awal yang paling rasional?",
            blockId: "block-1",
            topicId: "topic-1",
            correctOptionKey: "B",
            explanationText: null,
            explanationImagePath: null,
            questionImagePath: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
          },
        ],
      },
    });

    expect(rpc).toHaveBeenCalledWith("upsert_scheduled_tryout_event", expect.objectContaining({
      target_event_id: null,
      payload: expect.objectContaining({
        accessStartAt: "2026-06-10T01:00:00.000Z",
        accessEndAt: "2026-06-12T14:00:00.000Z",
      }),
    }));
  });

  test("persists scheduled event edits through the same transactional rpc", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "event-9",
      },
      error: null,
    });
    const client = {
      rpc,
    };

    await updateScheduledEvent({
      client: client as never,
      eventId: "event-9",
      input: {
        title: "TO Klinik Juni",
        description: "Try out aktif untuk peserta pro.",
        editorialStatus: "draft",
        accessStartAt: "2026-06-10T08:00",
        accessEndAt: "2026-06-12T21:00",
        questions: [],
      },
    });

    expect(rpc).toHaveBeenCalledWith("upsert_scheduled_tryout_event", expect.objectContaining({
      target_event_id: "event-9",
      payload: expect.objectContaining({
        title: "TO Klinik Juni",
        editorialStatus: "draft",
      }),
    }));
  });

  test("normalizes scheduled reactivation access inputs into UTC ISO timestamps before RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
      },
      error: null,
    });
    const client = {
      rpc,
    };

    await reactivateScheduledEvent({
      client: client as never,
      eventId: "event-1",
      accessStartAt: "2026-06-15T08:00",
      accessEndAt: "2026-06-17T21:00",
    });

    expect(rpc).toHaveBeenCalledWith("reactivate_scheduled_tryout_event", {
      target_event_id: "event-1",
      next_access_start_at: "2026-06-15T01:00:00.000Z",
      next_access_end_at: "2026-06-17T14:00:00.000Z",
    });
  });

  test("uploads scheduled question media into unique isolated paths to avoid draft collisions", async () => {
    const upload = vi.fn().mockResolvedValue({
      error: null,
    });
    const createSignedUrl = vi.fn((path: string) => Promise.resolve({
      data: {
        signedUrl: `https://signed.example/${path}`,
      },
      error: null,
    }));
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
          createSignedUrl,
        })),
      },
    };
    const file = new File(["binary"], "Image File.PNG", { type: "image/png" });

    const firstUpload = await uploadScheduledQuestionMedia({
      client: client as never,
      eventId: "draft",
      kind: "question",
      file,
    });
    const secondUpload = await uploadScheduledQuestionMedia({
      client: client as never,
      eventId: "draft",
      kind: "question",
      file,
    });

    expect(firstUpload.path).toMatch(/^question\/scheduled-events\/draft\//);
    expect(secondUpload.path).toMatch(/^question\/scheduled-events\/draft\//);
    expect(firstUpload.path).not.toBe(secondUpload.path);
    expect(firstUpload.signedUrl).toBe(`https://signed.example/${firstUpload.path}`);
    expect(secondUpload.signedUrl).toBe(`https://signed.example/${secondUpload.path}`);
    expect(upload).toHaveBeenNthCalledWith(
      1,
      firstUpload.path,
      file,
      expect.objectContaining({
        upsert: false,
        contentType: "image/png",
      }),
    );
    expect(upload).toHaveBeenNthCalledWith(
      2,
      secondUpload.path,
      file,
      expect.objectContaining({
        upsert: false,
        contentType: "image/png",
      }),
    );
  });
});
