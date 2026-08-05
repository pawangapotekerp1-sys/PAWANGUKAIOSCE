import { describe, expect, test, vi } from "vitest";
import * as questionAuthoringApi from "./question-authoring-api";
import {
  archiveQuestion,
  createQuestion,
  getQuestionEditorData,
  listQuestionBank,
  listQuestionTaxonomy,
  removeQuestionMedia,
  updateQuestion,
  uploadQuestionMedia,
} from "./question-authoring-api";

describe("question-authoring-api", () => {
  test("lists taxonomy blocks and topics for manual authoring selectors", async () => {
    const orderTopics = vi.fn().mockResolvedValue({
      data: [
        {
          id: "block-1",
          name: "Clinical Science",
          slug: "clinical-science",
          topics: [
            { id: "topic-1", name: "Farmakokinetik, Interaksi Obat dan Antidotum", slug: "farmakokinetik-interaksi-obat-dan-antidotum" },
            { id: "topic-2", name: "Pernafasan dan Pencernaan", slug: "pernafasan-dan-pencernaan" },
          ],
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table !== "blocks") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: orderTopics,
            })),
          })),
        };
      }),
    };

    await expect(listQuestionTaxonomy(client as never)).resolves.toEqual([
      {
        id: "block-1",
        name: "Clinical Science",
        slug: "clinical-science",
        topics: [
          { id: "topic-1", name: "Farmakokinetik, Interaksi Obat dan Antidotum", slug: "farmakokinetik-interaksi-obat-dan-antidotum" },
          { id: "topic-2", name: "Pernafasan dan Pencernaan", slug: "pernafasan-dan-pencernaan" },
        ],
      },
    ]);
  });

  test("lists final questions directly from question tables", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "question-1",
          stem: "Apa target tekanan darah pada CKD?",
          status: "draft",
          updated_at: "2026-05-03T08:00:00.000Z",
          question_image_path: "questions/ckd.png",
          block: { id: "block-1", name: "Clinical Science" },
          topic: { id: "topic-1", name: "Kardiologi" },
          explanation: {
            explanation: "Target lebih ketat dipilih untuk proteksi ginjal.",
            explanation_image_path: null,
          },
        },
      ],
      error: null,
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/questions/ckd.png" },
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table !== "questions") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn(() => ({
            order,
          })),
        };
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(listQuestionBank(client as never)).resolves.toEqual([
      {
        id: "question-1",
        stem: "Apa target tekanan darah pada CKD?",
        status: "draft",
        statusLabel: "Draft",
        blockId: "block-1",
        blockName: "Clinical Science",
        topicId: "topic-1",
        topicName: "Kardiologi",
        questionImageUrl: "https://example.com/questions/ckd.png",
        hasQuestionImage: true,
        hasExplanationText: true,
        hasExplanationImage: false,
        updatedAt: "2026-05-03T08:00:00.000Z",
      },
    ]);
  });

  test("keeps the question bank readable when a referenced image file is missing in storage", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "question-1",
          stem: "Apa target tekanan darah pada CKD?",
          status: "draft",
          updated_at: "2026-05-03T08:00:00.000Z",
          question_image_path: "questions/missing-image.png",
          block: { id: "block-1", name: "Clinical Science" },
          topic: { id: "topic-1", name: "Kardiologi" },
          explanation: {
            explanation: "Target lebih ketat dipilih untuk proteksi ginjal.",
            explanation_image_path: "explanations/missing-image.png",
          },
        },
      ],
      error: null,
    });
    const createSignedUrl = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Object not found" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Object not found" },
      });
    const client = {
      from: vi.fn((table: string) => {
        if (table !== "questions") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn(() => ({
            order,
          })),
        };
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(listQuestionBank(client as never)).resolves.toEqual([
      {
        id: "question-1",
        stem: "Apa target tekanan darah pada CKD?",
        status: "draft",
        statusLabel: "Draft",
        blockId: "block-1",
        blockName: "Clinical Science",
        topicId: "topic-1",
        topicName: "Kardiologi",
        questionImageUrl: null,
        hasQuestionImage: false,
        hasExplanationText: true,
        hasExplanationImage: false,
        updatedAt: "2026-05-03T08:00:00.000Z",
      },
    ]);
  });

  test("loads editor data with signed URLs and option details", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "question-2",
        stem: "Dokumentasi intervensi farmasis paling berguna bila ditautkan dengan apa?",
        status: "published",
        updated_at: "2026-05-03T09:15:00.000Z",
        question_image_path: "questions/documentation.png",
        block: { id: "block-3", name: "Social, Behavioral, and Administrative" },
        topic: { id: "topic-15", name: "Pelayanan Farmasi Klinis" },
        options: [
          { id: "option-1", option_key: "A", option_text: "Promo produk", is_correct: false, sort_order: 1 },
          { id: "option-2", option_key: "B", option_text: "Tujuan klinis", is_correct: true, sort_order: 2 },
        ],
        explanation: {
          explanation: "Tujuan klinis dan hasil monitoring memudahkan tindak lanjut.",
          explanation_image_path: "explanations/documentation.png",
        },
      },
      error: null,
    });
    const createSignedUrl = vi
      .fn()
      .mockResolvedValueOnce({
        data: { signedUrl: "https://example.com/questions/documentation.png" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { signedUrl: "https://example.com/explanations/documentation.png" },
        error: null,
      });
    const client = {
      from: vi.fn((table: string) => {
        if (table !== "questions") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle,
            })),
          })),
        };
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(getQuestionEditorData({
      client: client as never,
      questionId: "question-2",
    })).resolves.toEqual({
      id: "question-2",
      stem: "Dokumentasi intervensi farmasis paling berguna bila ditautkan dengan apa?",
      status: "published",
      statusLabel: "Published",
      blockId: "block-3",
      blockName: "Social, Behavioral, and Administrative",
      topicId: "topic-15",
      topicName: "Pelayanan Farmasi Klinis",
      questionImagePath: "questions/documentation.png",
      questionImageUrl: "https://example.com/questions/documentation.png",
      explanationText: "Tujuan klinis dan hasil monitoring memudahkan tindak lanjut.",
      explanationImagePath: "explanations/documentation.png",
      explanationImageUrl: "https://example.com/explanations/documentation.png",
      options: [
        { id: "option-1", key: "A", text: "Promo produk", isCorrect: false, sortOrder: 1 },
        { id: "option-2", key: "B", text: "Tujuan klinis", isCorrect: true, sortOrder: 2 },
      ],
      correctOptionKey: "B",
      updatedAt: "2026-05-03T09:15:00.000Z",
    });
  });

  test("creates a final question with options and optional explanation record", async () => {
    const questionSingle = vi.fn().mockResolvedValue({
      data: { id: "question-9" },
      error: null,
    });
    const optionSelect = vi.fn().mockResolvedValue({
      data: [{ id: "option-1" }, { id: "option-2" }],
      error: null,
    });
    const explanationSingle = vi.fn().mockResolvedValue({
      data: { id: "explanation-9" },
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "questions") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: questionSingle,
              })),
            })),
          };
        }

        if (table === "question_options") {
          return {
            insert: vi.fn(() => ({
              select: optionSelect,
            })),
          };
        }

        if (table === "question_explanations") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: explanationSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(createQuestion({
      client: client as never,
      input: {
        stem: "Apa target tekanan darah pada CKD?",
        blockId: "block-1",
        topicId: "topic-1",
        status: "draft",
        questionImagePath: "questions/ckd.png",
        options: [
          { key: "A", text: "<140/90", isCorrect: false },
          { key: "B", text: "<130/80", isCorrect: true },
        ],
        explanationText: "Target dipilih lebih ketat untuk proteksi ginjal.",
        explanationImagePath: "explanations/ckd.png",
      },
    })).resolves.toEqual({
      id: "question-9",
    });
  });

  test("updates an existing final question and replaces its options", async () => {
    const questionSingle = vi.fn().mockResolvedValue({
      data: { id: "question-10" },
      error: null,
    });
    const deleteEq = vi.fn().mockResolvedValue({
      error: null,
    });
    const optionSelect = vi.fn().mockResolvedValue({
      data: [{ id: "option-10a" }, { id: "option-10b" }],
      error: null,
    });
    const explanationUpsertSingle = vi.fn().mockResolvedValue({
      data: { id: "explanation-10" },
      error: null,
    });
    const explanationUpsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: explanationUpsertSingle,
      })),
    }));
    const client = {
      from: vi.fn((table: string) => {
        if (table === "questions") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: questionSingle,
                })),
              })),
            })),
          };
        }

        if (table === "question_options") {
          return {
            delete: vi.fn(() => ({
              eq: deleteEq,
            })),
            insert: vi.fn(() => ({
              select: optionSelect,
            })),
          };
        }

        if (table === "question_explanations") {
          return {
            upsert: explanationUpsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(updateQuestion({
      client: client as never,
      questionId: "question-10",
      input: {
        stem: "Dokumentasi intervensi farmasis paling berguna bila ditautkan dengan apa?",
        blockId: "block-3",
        topicId: "topic-15",
        status: "published",
        questionImagePath: null,
        options: [
          { key: "A", text: "Promo produk", isCorrect: false },
          { key: "B", text: "Tujuan klinis", isCorrect: true },
        ],
        explanationText: "Tujuan klinis dan hasil monitoring memudahkan tindak lanjut.",
        explanationImagePath: null,
      },
    })).resolves.toEqual({
      id: "question-10",
    });
    expect(explanationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: "question-10",
        explanation: "Tujuan klinis dan hasil monitoring memudahkan tindak lanjut.",
      }),
      {
        onConflict: "question_id",
      },
    );
  });

  test("archives a question without deleting historical data", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "question-11",
        status: "archived",
      },
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table !== "questions") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single,
              })),
            })),
          })),
        };
      }),
    };

    await expect(archiveQuestion({
      client: client as never,
      questionId: "question-11",
    })).resolves.toEqual({
      id: "question-11",
      status: "archived",
    });
  });

  test("deletes a question through the guarded Supabase RPC and removes related media", async () => {
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "question-11",
          question_image_path: "question/questions/question-11-image.png",
          explanation_image_path: "explanation/questions/question-11-image.png",
        },
      ],
      error: null,
    });
    const client = {
      rpc,
      storage: {
        from: vi.fn(() => ({
          remove,
        })),
      },
    };
    const api = questionAuthoringApi as Record<string, unknown>;

    await expect((api.deleteQuestion as (input: {
      questionId: string;
      client: unknown;
    }) => Promise<unknown>)({
      client: client as never,
      questionId: "question-11",
    })).resolves.toEqual({
      deletedIds: ["question-11"],
    });

    expect(rpc).toHaveBeenCalledWith("delete_question", {
      target_question_id: "question-11",
    });
    expect(remove).toHaveBeenCalledWith([
      "question/questions/question-11-image.png",
      "explanation/questions/question-11-image.png",
    ]);
  });

  test("deletes multiple questions atomically through the guarded bulk RPC and removes returned media", async () => {
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: [
          {
            id: "question-11",
            question_image_path: "question/questions/question-11-image.png",
            explanation_image_path: null,
          },
          {
            id: "question-12",
            question_image_path: null,
            explanation_image_path: "explanation/questions/question-12-image.png",
          },
        ],
        error: null,
      });
    const client = {
      rpc,
      storage: {
        from: vi.fn(() => ({
          remove,
        })),
      },
    };
    const api = questionAuthoringApi as Record<string, unknown>;

    await expect((api.deleteQuestions as (input: {
      questionIds: string[];
      client: unknown;
    }) => Promise<unknown>)({
      client: client as never,
      questionIds: ["question-11", "question-12"],
    })).resolves.toEqual({
      deletedIds: ["question-11", "question-12"],
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("delete_questions", {
      target_question_ids: ["question-11", "question-12"],
    });
    expect(remove).toHaveBeenCalledWith([
      "question/questions/question-11-image.png",
      "explanation/questions/question-12-image.png",
    ]);
  });

  test("falls back to direct question delete when the hosted schema cache does not know the rpc yet", async () => {
    const questionMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "question-13",
        question_image_path: "question/questions/question-13-image.png",
        explanation: {
          explanation_image_path: "explanation/questions/question-13-image.png",
        },
      },
      error: null,
    });
    const questionDeleteSingle = vi.fn().mockResolvedValue({
      data: { id: "question-13" },
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.delete_question(target_question_id) in the schema cache",
      },
    });
    const client = {
      rpc,
      from: vi.fn((table: string) => {
        if (table !== "questions") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: questionMaybeSingle,
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: questionDeleteSingle,
              })),
            })),
          })),
        };
      }),
      storage: {
        from: vi.fn(() => ({
          remove,
        })),
      },
    };
    const api = questionAuthoringApi as Record<string, unknown>;

    await expect((api.deleteQuestion as (input: {
      questionId: string;
      client: unknown;
    }) => Promise<unknown>)({
      client: client as never,
      questionId: "question-13",
    })).resolves.toEqual({
      deletedIds: ["question-13"],
    });

    expect(rpc).toHaveBeenCalledWith("delete_question", {
      target_question_id: "question-13",
    });
    expect(remove).toHaveBeenCalledWith([
      "question/questions/question-13-image.png",
      "explanation/questions/question-13-image.png",
    ]);
  });

  test("uploads question media into the protected question-media bucket", async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: "question/questions/question-1-image.png" },
      error: null,
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/question/questions/question-1-image.png" },
      error: null,
    });
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
          createSignedUrl,
        })),
      },
    };
    const file = new File(["image-content"], "image.png", { type: "image/png" });

    await expect(uploadQuestionMedia({
      client: client as never,
      questionId: "question-1",
      kind: "question",
      file,
    })).resolves.toEqual({
      path: "question/questions/question-1-image.png",
      signedUrl: "https://example.com/question/questions/question-1-image.png",
    });
  });

  test("removes question media from the protected bucket", async () => {
    const remove = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const client = {
      storage: {
        from: vi.fn(() => ({
          remove,
        })),
      },
    };

    await expect(removeQuestionMedia({
      client: client as never,
      path: "question/questions/question-1-image.png",
    })).resolves.toBeUndefined();
  });
});
