import { describe, expect, test, vi } from "vitest";
import {
  createAttempt,
  findActiveAttemptForUser,
  findLatestSubmittedAttemptId,
  getAttemptResult,
  getAttemptReviewPageData,
  getAttemptSessionPageData,
  listTryoutCatalogEntries,
  listSubmittedAttemptHistory,
  listPublishedExamTemplates,
  pauseAttempt,
  resumeAttempt,
  saveAnswer,
  submitAttempt,
} from "./tryout-api";

describe("tryout-api", () => {
  test("falls back to published templates and taxonomy when the catalog readiness RPC is unavailable", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Could not find the function public.list_tryout_catalog_entries() in the schema cache",
      },
    });
    const templateOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "template-full",
          slug: "tryout-besar",
          title: "Try Out Besar",
          description: "Simulasi penuh",
          mode: "full",
          question_count: 50,
          duration_minutes: 60,
          block_id: null,
          topic_id: null,
          block: null,
          topic: null,
        },
        {
          id: "template-block-1",
          slug: "clinical-science",
          title: "Clinical Science",
          description: "Try out per blok Clinical Science.",
          mode: "block",
          question_count: 30,
          duration_minutes: 40,
          block_id: "block-1",
          topic_id: null,
          block: {
            name: "Clinical Science",
            sort_order: 1,
          },
          topic: null,
        },
        {
          id: "template-topic-1",
          slug: "materi-kardiologi",
          title: "Kardiologi",
          description: "Try out per materi Kardiologi.",
          mode: "topic",
          question_count: 20,
          duration_minutes: 30,
          block_id: "block-1",
          topic_id: "topic-1",
          block: {
            name: "Clinical Science",
            sort_order: 1,
          },
          topic: {
            name: "Kardiologi",
            sort_order: 2,
          },
        },
      ],
      error: null,
    });
    const blocksOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "block-1",
          name: "Clinical Science",
          slug: "clinical-science",
          topics: [
            {
              id: "topic-1",
              name: "Kardiologi",
              slug: "kardiologi",
              is_active: true,
            },
          ],
        },
      ],
      error: null,
    });
    const publishedQuestionRows = [
      ...Array.from({ length: 30 }, (_, index) => ({
        id: `question-block-${index + 1}`,
        block_id: "block-1",
        topic_id: null,
        options: [
          { is_correct: true },
          { is_correct: false },
        ],
      })),
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `question-topic-${index + 1}`,
        block_id: "block-1",
        topic_id: "topic-1",
        options: [
          { is_correct: true },
          { is_correct: false },
        ],
      })),
    ];
    const questionsSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({
          data: publishedQuestionRows,
          error: null,
        }),
      })),
    }));
    const client = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "exam_templates") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: templateOrder,
              })),
            })),
          };
        }

        if (table === "blocks") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: blocksOrder,
              })),
            })),
          };
        }

        if (table === "questions") {
          return {
            select: questionsSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(listTryoutCatalogEntries(client as never)).resolves.toEqual([
      {
        id: "catalog-full",
        slug: "tryout-besar",
        title: "Try Out Besar",
        description: "Simulasi penuh",
        mode: "full",
        questionCount: 50,
        durationMinutes: 60,
        blockId: null,
        blockName: null,
        blockSortOrder: null,
        iconName: null,
        colorTheme: null,
        topicId: null,
        topicName: null,
        topicSortOrder: null,
        sessionTemplateId: "template-full",
        isStartable: true,
        disabledReason: null,
        availableQuestionCount: 50,
        requiredQuestionCount: 50,
      },
      {
        id: "catalog-block-block-1",
        slug: "clinical-science",
        title: "Clinical Science",
        description: "Try out per blok Clinical Science.",
        mode: "block",
        questionCount: 30,
        durationMinutes: 40,
        blockId: "block-1",
        blockName: "Clinical Science",
        blockSortOrder: 1,
        iconName: null,
        colorTheme: null,
        topicId: null,
        topicName: null,
        topicSortOrder: null,
        sessionTemplateId: "template-block-1",
        isStartable: true,
        disabledReason: null,
        availableQuestionCount: 50,
        requiredQuestionCount: 30,
      },
      {
        id: "catalog-topic-topic-1",
        slug: "materi-kardiologi",
        title: "Kardiologi",
        description: "Try out per materi Kardiologi.",
        mode: "topic",
        questionCount: 20,
        durationMinutes: 30,
        blockId: "block-1",
        blockName: "Clinical Science",
        blockSortOrder: 1,
        iconName: null,
        colorTheme: null,
        topicId: "topic-1",
        topicName: "Kardiologi",
        topicSortOrder: 2,
        sessionTemplateId: "template-topic-1",
        isStartable: true,
        disabledReason: null,
        availableQuestionCount: 20,
        requiredQuestionCount: 20,
      },
    ]);

    expect(rpc).toHaveBeenCalledWith("list_tryout_catalog_entries");
  });

  test("builds catalog entries from server-side readiness so student catalog matches attempt eligibility", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          mode: "full",
          slug: "tryout-besar",
          title: "Try Out Besar",
          block_id: null,
          block_name: null,
          block_sort_order: null,
          topic_id: null,
          topic_name: null,
          topic_sort_order: null,
          session_template_id: null,
          duration_minutes: 60,
          available_question_count: 49,
          required_question_count: 50,
          is_startable: false,
          disabled_reason: "49/50 soal valid siap. Template try out belum dipublikasikan.",
        },
        {
          mode: "block",
          slug: "clinical-science",
          title: "Clinical Science",
          block_id: "block-1",
          block_name: "Clinical Science",
          block_sort_order: 1,
          topic_id: null,
          topic_name: null,
          topic_sort_order: null,
          session_template_id: null,
          duration_minutes: 40,
          available_question_count: 29,
          required_question_count: 30,
          is_startable: false,
          disabled_reason: "29/30 soal valid siap. Template try out belum dipublikasikan.",
        },
        {
          mode: "topic",
          slug: "farmakoekonomi",
          title: "Farmakoekonomi",
          block_id: "block-2",
          block_name: "Social, Behavioral, and Administrative",
          block_sort_order: 2,
          topic_id: "topic-2",
          topic_name: "Farmakoekonomi",
          topic_sort_order: 1,
          session_template_id: "template-topic-2",
          duration_minutes: 30,
          available_question_count: 20,
          required_question_count: 20,
          is_startable: true,
          disabled_reason: null,
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn(() => {
        throw new Error("Catalog readiness should come from the server RPC.");
      }),
      rpc,
    };

    const result = await listTryoutCatalogEntries(client as never);
    const fullEntry = result.find((entry) => entry.mode === "full");
    const clinicalBlockEntry = result.find((entry) => entry.mode === "block" && entry.blockId === "block-1");
    const farmakoekonomiEntry = result.find((entry) => entry.mode === "topic" && entry.topicId === "topic-2");

    expect(rpc).toHaveBeenCalledWith("list_tryout_catalog_entries");
    expect(result).toHaveLength(3);
    expect(fullEntry).toMatchObject({
      id: "catalog-full",
      title: "Try Out Besar",
      isStartable: false,
      availableQuestionCount: 49,
      requiredQuestionCount: 50,
      sessionTemplateId: null,
      disabledReason: "49/50 soal valid siap. Template try out belum dipublikasikan.",
    });
    expect(clinicalBlockEntry).toMatchObject({
      id: "catalog-block-block-1",
      title: "Clinical Science",
      isStartable: false,
      availableQuestionCount: 29,
      requiredQuestionCount: 30,
      sessionTemplateId: null,
      disabledReason: "29/30 soal valid siap. Template try out belum dipublikasikan.",
    });
    expect(farmakoekonomiEntry).toMatchObject({
      id: "catalog-topic-topic-2",
      title: "Farmakoekonomi",
      isStartable: true,
      availableQuestionCount: 20,
      requiredQuestionCount: 20,
      sessionTemplateId: "template-topic-2",
    });
  });

  test("lists published exam templates across full, block, and topic scopes", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "template-1",
          slug: "tryout-besar",
          title: "Try Out Besar",
          description: "Simulasi penuh",
          mode: "full",
          question_count: 50,
          duration_minutes: 60,
          block_id: null,
          topic_id: null,
          block: null,
          topic: null,
        },
        {
          id: "template-2",
          slug: "clinical-science",
          title: "Clinical Science",
          description: "Try out per blok Clinical Science.",
          mode: "block",
          question_count: 30,
          duration_minutes: 40,
          block_id: "block-1",
          topic_id: null,
          block: {
            name: "Clinical Science",
            sort_order: 2,
          },
          topic: null,
        },
        {
          id: "template-3",
          slug: "kardiologi",
          title: "Kardiologi",
          description: "Try out per materi Kardiologi.",
          mode: "topic",
          question_count: 20,
          duration_minutes: 30,
          block_id: "block-1",
          topic_id: "topic-1",
          block: {
            name: "Clinical Science",
            sort_order: 2,
          },
          topic: {
            name: "Kardiologi",
            sort_order: 4,
          },
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order,
          })),
        })),
      })),
    };

    await expect(listPublishedExamTemplates(client as never)).resolves.toEqual([
      {
        id: "template-1",
        slug: "tryout-besar",
        title: "Try Out Besar",
        description: "Simulasi penuh",
        mode: "full",
        questionCount: 50,
        durationMinutes: 60,
        blockId: null,
        blockName: null,
        blockSortOrder: null,
        iconName: null,
        colorTheme: null,
        topicId: null,
        topicName: null,
        topicSortOrder: null,
      },
      {
        id: "template-2",
        slug: "clinical-science",
        title: "Clinical Science",
        description: "Try out per blok Clinical Science.",
        mode: "block",
        questionCount: 30,
        durationMinutes: 40,
        blockId: "block-1",
        blockName: "Clinical Science",
        blockSortOrder: 2,
        iconName: null,
        colorTheme: null,
        topicId: null,
        topicName: null,
        topicSortOrder: null,
      },
      {
        id: "template-3",
        slug: "kardiologi",
        title: "Kardiologi",
        description: "Try out per materi Kardiologi.",
        mode: "topic",
        questionCount: 20,
        durationMinutes: 30,
        blockId: "block-1",
        blockName: "Clinical Science",
        blockSortOrder: 2,
        iconName: null,
        colorTheme: null,
        topicId: "topic-1",
        topicName: "Kardiologi",
        topicSortOrder: 4,
      },
    ]);
  });

  test("sorts published exam templates by scope and taxonomy order", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "template-topic-2",
          slug: "respirasi",
          title: "Respirasi",
          description: "Try out per materi Respirasi.",
          mode: "topic",
          question_count: 20,
          duration_minutes: 30,
          block_id: "block-2",
          topic_id: "topic-2",
          block: {
            name: "Clinical Science",
            sort_order: 2,
          },
          topic: {
            name: "Respirasi",
            sort_order: 2,
          },
        },
        {
          id: "template-block-1",
          slug: "pharma",
          title: "Pharmaceutical Science",
          description: "Try out per blok Pharmaceutical Science.",
          mode: "block",
          question_count: 30,
          duration_minutes: 40,
          block_id: "block-1",
          topic_id: null,
          block: {
            name: "Pharmaceutical Science",
            sort_order: 1,
          },
          topic: null,
        },
        {
          id: "template-topic-1",
          slug: "kardiologi",
          title: "Kardiologi",
          description: "Try out per materi Kardiologi.",
          mode: "topic",
          question_count: 20,
          duration_minutes: 30,
          block_id: "block-2",
          topic_id: "topic-1",
          block: {
            name: "Clinical Science",
            sort_order: 2,
          },
          topic: {
            name: "Kardiologi",
            sort_order: 1,
          },
        },
        {
          id: "template-full",
          slug: "tryout-besar",
          title: "Try Out Besar",
          description: "Simulasi penuh",
          mode: "full",
          question_count: 50,
          duration_minutes: 60,
          block_id: null,
          topic_id: null,
          block: null,
          topic: null,
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order,
          })),
        })),
      })),
    };

    const result = await listPublishedExamTemplates(client as never);

    expect(result.map((template) => template.id)).toEqual([
      "template-full",
      "template-block-1",
      "template-topic-1",
      "template-topic-2",
    ]);
  });

  test("creates an attempt through the hardened snapshot RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-1",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "in_progress",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 10800,
        total_questions: 200,
        elapsed_seconds: 0,
        last_resumed_at: "2026-05-01T10:00:00.000Z",
        paused_at: null,
      },
      error: null,
    });

    await expect(
      createAttempt({
        client: {
          rpc,
        } as never,
        examTemplateId: "template-1",
      }),
    ).resolves.toMatchObject({
      id: "attempt-1",
      examTemplateId: "template-1",
      status: "in_progress",
    });

    expect(rpc).toHaveBeenCalledWith("start_attempt_from_template", {
      target_exam_template_id: "template-1",
    });
  });

  test("continues the active attempt when duplicate session creation is blocked", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Silakan lanjutkan try out yang masih aktif sebelum memulai sesi baru.",
      },
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-active",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "in_progress",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 10800,
        total_questions: 200,
        elapsed_seconds: 0,
        last_resumed_at: "2026-05-01T10:00:00.000Z",
        paused_at: null,
      },
      error: null,
    });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const is = vi.fn(() => ({ order }));
    const inFilter = vi.fn(() => ({ is }));
    const select = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ select }));

    await expect(
      createAttempt({
        client: {
          from,
          rpc,
        } as never,
        examTemplateId: "template-1",
      }),
    ).resolves.toMatchObject({
      id: "attempt-active",
      examTemplateId: "template-1",
      status: "in_progress",
    });

    expect(from).toHaveBeenCalledWith("attempts");
    expect(inFilter).toHaveBeenCalledWith("status", ["in_progress", "paused"]);
    expect(is).toHaveBeenCalledWith("submitted_at", null);
  });

  test("builds the session page contract from attempt, snapshot items, and answers", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-1",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "in_progress",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 7200,
        total_questions: 2,
        elapsed_seconds: 1200,
        last_resumed_at: "2026-05-01T10:20:00.000Z",
        paused_at: null,
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "item-1",
          question_id: "question-1",
          block_id: "block-1",
          block_name: "Clinical Science",
          topic_id: "topic-1",
          question_stem: "Apa terapi awal?",
          question_image_path: "question/questions/item-1.png",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key: "B",
          sort_order: 1,
        },
        {
          id: "item-2",
          question_id: "question-2",
          block_id: "block-2",
          block_name: "Pharmaceutical Science",
          topic_id: "topic-2",
          question_stem: "Apa indikator proses aseptik?",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key: "A",
          sort_order: 2,
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "attempt-1",
          attempt_item_id: "item-1",
          selected_option_key: "B",
          is_doubtful: true,
          answered_at: "2026-05-01T10:05:00.000Z",
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
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle,
              })),
            })),
          };
        }

        if (table === "attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "answers") {
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

    const data = await getAttemptSessionPageData({
      client: client as never,
      attemptId: "attempt-1",
      now: new Date("2026-05-01T10:30:00.000Z"),
    });

    expect(data).toEqual({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        totalQuestions: 2,
        timeRemainingSeconds: 5400,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: "https://signed.example/question/questions/item-1.png",
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: true,
        },
        {
          id: "item-2",
          order: 2,
          blockLabel: "Pharmaceutical Science",
          stem: "Apa indikator proses aseptik?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: null,
          isDoubtful: false,
        },
      ],
    });

    expect(createSignedUrl).toHaveBeenCalledWith("question/questions/item-1.png", 3600);
  });

  test("keeps the session payload readable when a referenced question image is missing in storage", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-3",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "in_progress",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 7200,
        total_questions: 1,
        elapsed_seconds: 0,
        last_resumed_at: "2026-05-01T10:00:00.000Z",
        paused_at: null,
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "item-missing-image",
          question_id: "question-3",
          block_id: "block-1",
          block_name: "Clinical Science",
          topic_id: "topic-1",
          question_stem: "Apa terapi awal?",
          question_image_path: "question/questions/missing-image.png",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key: "B",
          sort_order: 1,
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Object not found",
      },
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle,
              })),
            })),
          };
        }

        if (table === "attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "answers") {
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
      getAttemptSessionPageData({
        client: client as never,
        attemptId: "attempt-3",
        now: new Date("2026-05-01T10:10:00.000Z"),
      }),
    ).resolves.toEqual({
      view: "ready",
      attempt: {
        id: "attempt-3",
        status: "in_progress",
        totalQuestions: 1,
        timeRemainingSeconds: 6600,
      },
      questions: [
        {
          id: "item-missing-image",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: null,
          isDoubtful: false,
        },
      ],
    });
  });

  test("saves an answer through the runtime rpc with behavior timing", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        attempt_id: "attempt-1",
        attempt_item_id: "item-1",
        selected_option_key: "B",
        is_doubtful: true,
        answered_at: "2026-05-01T10:05:00.000Z",
      },
      error: null,
    });

    await expect(
      saveAnswer({
        client: {
          rpc,
        } as never,
        attemptId: "attempt-1",
        attemptItemId: "item-1",
        selectedOptionKey: "B",
        isDoubtful: true,
        timeSpentDeltaSeconds: 12,
      }),
    ).resolves.toMatchObject({
      attemptId: "attempt-1",
      attemptItemId: "item-1",
      selectedOptionKey: "B",
      isDoubtful: true,
    });

    expect(rpc).toHaveBeenCalledWith("save_attempt_answer", {
      target_attempt_id: "attempt-1",
      target_attempt_item_id: "item-1",
      selected_option_key: "B",
      is_doubtful: true,
      time_spent_delta_seconds: 12,
    });
  });

  test("builds a paused session page contract from accumulated elapsed time", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-2",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "paused",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 7200,
        total_questions: 1,
        elapsed_seconds: 1800,
        last_resumed_at: null,
        paused_at: "2026-05-01T10:30:00.000Z",
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "item-1",
          question_id: "question-1",
          block_id: "block-1",
          block_name: "Clinical Science",
          topic_id: "topic-1",
          question_stem: "Apa terapi awal?",
          question_image_path: null,
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key: "B",
          sort_order: 1,
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle,
              })),
            })),
          };
        }

        if (table === "attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "answers") {
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
          createSignedUrl: vi.fn(),
        })),
      },
    };

    await expect(
      getAttemptSessionPageData({
        client: client as never,
        attemptId: "attempt-2",
        now: new Date("2026-05-01T11:00:00.000Z"),
      }),
    ).resolves.toEqual({
      view: "ready",
      attempt: {
        id: "attempt-2",
        status: "paused",
        totalQuestions: 1,
        timeRemainingSeconds: 5400,
      },
      questions: [
        {
          id: "item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: null,
          isDoubtful: false,
        },
      ],
    });
  });

  test("finds the current active or paused attempt for the resume panel", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-2",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "paused",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 7200,
        total_questions: 30,
        elapsed_seconds: 1800,
        last_resumed_at: null,
        paused_at: "2026-05-01T10:30:00.000Z",
        exam_template: {
          title: "Clinical Science",
          mode: "block",
        },
      },
      error: null,
    });
    const notNull = vi.fn().mockResolvedValue({
      count: 12,
      error: null,
    });
    const attemptResultEq = vi.fn().mockResolvedValue({
      count: 0,
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle,
                    })),
                  })),
                })),
              })),
            })),
          };
        }

        if (table === "attempt_results") {
          return {
            select: vi.fn(() => ({
              eq: attemptResultEq,
            })),
          };
        }

        if (table === "answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                not: notNull,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      findActiveAttemptForUser({
        client: client as never,
        userId: "user-1",
        now: new Date("2026-05-01T11:00:00.000Z"),
      }),
    ).resolves.toEqual({
      attemptId: "attempt-2",
      status: "paused",
      title: "Clinical Science",
      mode: "block",
      answeredCount: 12,
      totalQuestions: 30,
      timeRemainingSeconds: 5400,
    });
  });

  test("does not surface a resume panel for an attempt that already has a final result", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-2",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "paused",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 7200,
        total_questions: 30,
        elapsed_seconds: 1800,
        last_resumed_at: null,
        paused_at: "2026-05-01T10:30:00.000Z",
        exam_template: {
          title: "Clinical Science",
          mode: "block",
        },
      },
      error: null,
    });
    const attemptResultEq = vi.fn().mockResolvedValue({
      count: 1,
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle,
                    })),
                  })),
                })),
              })),
            })),
          };
        }

        if (table === "attempt_results") {
          return {
            select: vi.fn(() => ({
              eq: attemptResultEq,
            })),
          };
        }

        if (table === "answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                not: vi.fn(),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      findActiveAttemptForUser({
        client: client as never,
        userId: "user-1",
        now: new Date("2026-05-01T11:00:00.000Z"),
      }),
    ).resolves.toBeNull();

    expect(attemptResultEq).toHaveBeenCalledWith("attempt_id", "attempt-2");
  });

  test("pauses an attempt through the runtime rpc", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-1",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "paused",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 3600,
        total_questions: 30,
        elapsed_seconds: 1800,
        last_resumed_at: null,
        paused_at: "2026-05-01T10:30:00.000Z",
      },
      error: null,
    });

    await expect(
      pauseAttempt({
        client: {
          rpc,
        } as never,
        attemptId: "attempt-1",
      }),
    ).resolves.toMatchObject({
      id: "attempt-1",
      status: "paused",
      elapsedSeconds: 1800,
    });

    expect(rpc).toHaveBeenCalledWith("pause_attempt", {
      target_attempt_id: "attempt-1",
    });
  });

  test("resumes an attempt through the runtime rpc", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-1",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "in_progress",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: null,
        time_limit_seconds: 3600,
        total_questions: 30,
        elapsed_seconds: 1800,
        last_resumed_at: "2026-05-01T11:00:00.000Z",
        paused_at: null,
      },
      error: null,
    });

    await expect(
      resumeAttempt({
        client: {
          rpc,
        } as never,
        attemptId: "attempt-1",
      }),
    ).resolves.toMatchObject({
      id: "attempt-1",
      status: "in_progress",
      elapsedSeconds: 1800,
      lastResumedAt: "2026-05-01T11:00:00.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("resume_attempt", {
      target_attempt_id: "attempt-1",
    });
  });

  test("submits an attempt through the result-generation RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        attempt_id: "attempt-1",
        score: 74,
        correct_answers: 148,
        wrong_answers: 52,
        unanswered_count: 0,
        time_used_seconds: 9672,
        block_summary: [{ name: "Clinical Science", correct: 42, wrong: 18 }],
        generated_at: "2026-05-01T13:00:00.000Z",
      },
      error: null,
    });

    await expect(
      submitAttempt({
        client: {
          rpc,
        } as never,
        attemptId: "attempt-1",
      }),
    ).resolves.toEqual({
      attemptId: "attempt-1",
      score: 74,
      correctAnswers: 148,
      wrongAnswers: 52,
      unansweredCount: 0,
      timeUsedSeconds: 9672,
      blockSummary: [{ name: "Clinical Science", correct: 42, wrong: 18 }],
      generatedAt: "2026-05-01T13:00:00.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("submit_attempt", {
      target_attempt_id: "attempt-1",
    });
  });

  test("loads an attempt result snapshot", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        attempt_id: "attempt-1",
        score: 74,
        correct_answers: 148,
        wrong_answers: 52,
        unanswered_count: 0,
        time_used_seconds: 9672,
        block_summary: [{ name: "Clinical Science", correct: 42, wrong: 18 }],
        generated_at: "2026-05-01T13:00:00.000Z",
      },
      error: null,
    });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle,
          })),
        })),
      })),
    };

    await expect(
      getAttemptResult({
        client: client as never,
        attemptId: "attempt-1",
      }),
    ).resolves.toEqual({
      attemptId: "attempt-1",
      score: 74,
      correctAnswers: 148,
      wrongAnswers: 52,
      unansweredCount: 0,
      timeUsedSeconds: 9672,
      blockSummary: [{ name: "Clinical Science", correct: 42, wrong: 18 }],
      generatedAt: "2026-05-01T13:00:00.000Z",
    });
  });

  test("builds the review page contract from snapshot items, answers, and explanations", async () => {
    const attemptSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-1",
        user_id: "user-1",
        exam_template_id: "template-1",
        status: "submitted",
        started_at: "2026-05-01T10:00:00.000Z",
        submitted_at: "2026-05-01T13:00:00.000Z",
        time_limit_seconds: 10800,
        total_questions: 1,
        elapsed_seconds: 9672,
        last_resumed_at: null,
        paused_at: null,
        exam_template: {
          title: "Try Out Besar",
        },
        attempt_result: {
          score: 74,
          correct_answers: 148,
          wrong_answers: 52,
        },
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "item-1",
          question_id: "question-1",
          block_id: "block-1",
          block_name: "Clinical Science",
          topic_id: "topic-1",
          question_stem: "Apa terapi awal?",
          question_image_path: "question/questions/question-1.png",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key: "B",
          sort_order: 1,
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "attempt-1",
          attempt_item_id: "item-1",
          selected_option_key: "A",
          is_doubtful: false,
          answered_at: "2026-05-01T10:05:00.000Z",
        },
      ],
      error: null,
    });
    const inFilter = vi.fn().mockResolvedValue({
      data: [
        {
          question_id: "question-1",
          explanation: "ACE inhibitor menjadi titik awal titrasi paling rasional.",
          explanation_image_path: "explanation/questions/question-1.png",
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
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: attemptSingle,
              })),
            })),
          };
        }

        if (table === "attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: answersOrder,
              })),
            })),
          };
        }

        if (table === "question_explanations") {
          return {
            select: vi.fn(() => ({
              in: inFilter,
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
      getAttemptReviewPageData({
        client: client as never,
        attemptId: "attempt-1",
      }),
    ).resolves.toEqual({
      summary: {
        title: "Try Out Besar",
        submittedAt: "2026-05-01T13:00:00.000Z",
        score: 74,
        correctAnswers: 148,
        wrongAnswers: 52,
        source: "tryout",
      },
      items: [
        {
          id: "item-1",
          blockLabel: "Clinical Science",
          question: "Apa terapi awal?",
          questionImageUrl: "https://signed.example/question/questions/question-1.png",
          userAnswer: "Pilihan A",
          correctAnswer: "Pilihan B",
          explanationText: "ACE inhibitor menjadi titik awal titrasi paling rasional.",
          explanationImageUrl: "https://signed.example/explanation/questions/question-1.png",
          isWrong: true,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correctOptionKey: "B",
          selectedOptionKey: "A",
        },
      ],
    });

    expect(createSignedUrl).toHaveBeenCalledWith("question/questions/question-1.png", 3600);
    expect(createSignedUrl).toHaveBeenCalledWith("explanation/questions/question-1.png", 3600);
  });

  test("keeps review payload readable when question and explanation images are missing in storage", async () => {
    const attemptSingle = vi.fn().mockResolvedValue({
      data: {
        submitted_at: "2026-05-01T13:00:00.000Z",
        exam_template: {
          title: "Try Out Besar",
        },
        attempt_result: {
          score: 74,
          correct_answers: 148,
          wrong_answers: 52,
        },
      },
      error: null,
    });
    const itemsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "item-1",
          question_id: "question-1",
          block_id: "block-1",
          block_name: "Clinical Science",
          topic_id: "topic-1",
          question_stem: "Apa terapi awal?",
          question_image_path: "question/questions/missing-question.png",
          options_snapshot: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correct_option_key: "B",
          sort_order: 1,
        },
      ],
      error: null,
    });
    const answersOrder = vi.fn().mockResolvedValue({
      data: [
        {
          attempt_id: "attempt-1",
          attempt_item_id: "item-1",
          selected_option_key: "A",
          is_doubtful: false,
          answered_at: "2026-05-01T10:05:00.000Z",
        },
      ],
      error: null,
    });
    const inFilter = vi.fn().mockResolvedValue({
      data: [
        {
          question_id: "question-1",
          explanation: null,
          explanation_image_path: "explanation/questions/missing-explanation.png",
        },
      ],
      error: null,
    });
    const createSignedUrl = vi.fn((path: string) => Promise.resolve(
      /missing-(question|explanation)\.png/i.test(path)
        ? {
            data: null,
            error: {
              message: "Object not found",
            },
          }
        : {
            data: {
              signedUrl: `https://signed.example/${path}`,
            },
            error: null,
          },
    ));
    const client = {
      from: vi.fn((table: string) => {
        if (table === "attempts") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: attemptSingle,
              })),
            })),
          };
        }

        if (table === "attempt_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: itemsOrder,
              })),
            })),
          };
        }

        if (table === "answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: answersOrder,
              })),
            })),
          };
        }

        if (table === "question_explanations") {
          return {
            select: vi.fn(() => ({
              in: inFilter,
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
      getAttemptReviewPageData({
        client: client as never,
        attemptId: "attempt-1",
      }),
    ).resolves.toEqual({
      summary: {
        title: "Try Out Besar",
        submittedAt: "2026-05-01T13:00:00.000Z",
        score: 74,
        correctAnswers: 148,
        wrongAnswers: 52,
        source: "tryout",
      },
      items: [
        {
          id: "item-1",
          blockLabel: "Clinical Science",
          question: "Apa terapi awal?",
          questionImageUrl: null,
          userAnswer: "Pilihan A",
          correctAnswer: "Pilihan B",
          explanationText: "Pembahasan belum ditulis final oleh tim editorial.",
          explanationImageUrl: null,
          isWrong: true,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          correctOptionKey: "B",
          selectedOptionKey: "A",
        },
      ],
    });

    expect(createSignedUrl).toHaveBeenCalledWith("question/questions/missing-question.png", 3600);
    expect(createSignedUrl).toHaveBeenCalledWith("explanation/questions/missing-explanation.png", 3600);
  });

  test("can find the latest submitted attempt for review-oriented pages", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "attempt-9",
      },
      error: null,
    });
    const order = vi.fn(() => ({
      limit: vi.fn(() => ({
        maybeSingle,
      })),
    }));
    const eqStatus = vi.fn(() => ({
      order,
    }));
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: eqStatus,
          })),
        })),
      })),
    };

    await expect(
      findLatestSubmittedAttemptId({
        client: client as never,
        userId: "user-1",
      }),
    ).resolves.toBe("attempt-9");
  });

  test("lists submitted attempt history with template and result summaries", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "attempt-9",
          submitted_at: "2026-05-03T09:00:00.000Z",
          exam_template: {
            title: "Try Out Besar",
          },
          attempt_result: {
            score: 82,
            correct_answers: 164,
            wrong_answers: 36,
          },
        },
        {
          id: "attempt-7",
          submitted_at: "2026-05-01T09:00:00.000Z",
          exam_template: {
            title: "Clinical Science",
          },
          attempt_result: {
            score: 71,
            correct_answers: 71,
            wrong_answers: 29,
          },
        },
      ],
      error: null,
    });
    const eqStatus = vi.fn(() => ({
      order,
    }));
    const eqUser = vi.fn(() => ({
      eq: eqStatus,
    }));
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: eqUser,
        })),
      })),
    };

    await expect(
      listSubmittedAttemptHistory({
        client: client as never,
        userId: "user-1",
      }),
    ).resolves.toEqual([
      {
        attemptId: "attempt-9",
        title: "Try Out Besar",
        submittedAt: "2026-05-03T09:00:00.000Z",
        score: 82,
        correctAnswers: 164,
        wrongAnswers: 36,
      },
      {
        attemptId: "attempt-7",
        title: "Clinical Science",
        submittedAt: "2026-05-01T09:00:00.000Z",
        score: 71,
        correctAnswers: 71,
        wrongAnswers: 29,
      },
    ]);
  });

});
