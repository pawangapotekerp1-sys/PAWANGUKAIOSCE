import { describe, expect, test, vi } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  deleteQuestionGeneratorCredential,
  deliverGeneratedItemToQuestionBank,
  deliverGeneratedItemToScheduledEvent,
  generateQuestionBatch,
  getQuestionGenerationBatchDetail,
  getQuestionGeneratorStatus,
  saveQuestionGeneratorCredential,
  testQuestionGeneratorCredential,
  updateGeneratedDraftItem,
} from "./question-generator-api";

describe("question-generator-api", () => {
  test("maps BYOK status and generation actions through the edge function contract", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: true,
            model: "gemini-3.6-flash",
            lastValidatedAt: "2026-06-04T08:00:00.000Z",
            lastError: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: true,
            model: "gemini-3.6-flash",
            lastValidatedAt: null,
            lastError: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: false,
            model: "gemini-3.6-flash",
            lastValidatedAt: null,
            lastError: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: true,
            model: "gemini-3.6-flash",
            lastValidatedAt: "2026-06-04T08:05:00.000Z",
            lastError: null,
          },
          testResult: {
            ok: true,
            message: "Koneksi Gemini berhasil.",
            latencyMs: 1430,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          batchId: "batch-1",
          generatedCount: 3,
        },
        error: null,
      });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(getQuestionGeneratorStatus(client as never)).resolves.toEqual({
      hasCredential: true,
      model: "gemini-3.6-flash",
      modelLabel: "gemini-3.6-flash",
      lastValidatedAt: "2026-06-04T08:00:00.000Z",
      lastError: null,
    });

    await expect(
      saveQuestionGeneratorCredential(
        {
          apiKey: "AIza-testing-key-1234",
          model: "gemini-3.6-flash",
        },
        client as never,
      ),
    ).resolves.toEqual({
      hasCredential: true,
      model: "gemini-3.6-flash",
      modelLabel: "gemini-3.6-flash",
      lastValidatedAt: null,
      lastError: null,
    });

    await expect(deleteQuestionGeneratorCredential(client as never)).resolves.toEqual({
      hasCredential: false,
      model: "gemini-3.6-flash",
      modelLabel: "gemini-3.6-flash",
      lastValidatedAt: null,
      lastError: null,
    });

    await expect(testQuestionGeneratorCredential(client as never)).resolves.toEqual({
      status: {
        hasCredential: true,
        model: "gemini-3.6-flash",
        modelLabel: "gemini-3.6-flash",
        lastValidatedAt: "2026-06-04T08:05:00.000Z",
        lastError: null,
      },
      testResult: {
        ok: true,
        message: "Koneksi Gemini berhasil.",
        latencyMs: 1430,
      },
    });

    await expect(
      generateQuestionBatch(
        {
          references: [
            {
              stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
              options: {
                A: "Amlodipin",
                B: "Lisinopril",
                C: "Parasetamol",
                D: "Metformin",
                E: "Omeprazol",
              },
              correctOptionKey: "B",
              explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.",
            },
          ],
          targetQuestionCount: 3,
        },
        client as never,
      ),
    ).resolves.toEqual({
      batchId: "batch-1",
      generatedCount: 3,
    });
  });

  test("maps batch detail, item update, and delivery actions into page-ready shapes", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          detail: {
            batch: {
              id: "batch-1",
              model: "gemini-3.6-flash",
              targetQuestionCount: 3,
              referenceCount: 1,
              status: "ready_for_review",
              generatedCount: 3,
              failedReason: null,
              createdAt: "2026-06-04T08:00:00.000Z",
              updatedAt: "2026-06-04T08:01:00.000Z",
            },
            references: [
              {
                id: "reference-1",
                order: 1,
                stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
                options: {
                  A: "Amlodipin",
                  B: "Lisinopril",
                  C: "Parasetamol",
                  D: "Metformin",
                  E: "Omeprazol",
                },
                correctOptionKey: "B",
                explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.",
              },
            ],
            items: [
              {
                id: "item-1",
                draftQuestionId: "draft-1",
                order: 1,
                variationMode: "different_trap_same_objective",
                status: "draft_generated",
                editedAt: null,
                stem: "Soal hasil copy konsep",
                options: {
                  A: "A",
                  B: "B",
                  C: "C",
                  D: "D",
                  E: "E",
                },
                correctOptionKey: "B",
                explanationText: "Pembahasan copy konsep.",
                reference: {
                  label: "KDIGO CKD guideline",
                  url: "https://kdigo.org/guidelines/ckd/",
                },
                deliveries: [
                  {
                    id: "delivery-1",
                    destinationType: "question_bank",
                    destinationQuestionId: "question-1",
                    destinationEventId: null,
                    destinationEventQuestionId: null,
                    blockId: "block-1",
                    topicId: "topic-1",
                    deliveredBy: "user-1",
                    createdAt: "2026-06-04T08:10:00.000Z",
                  },
                ],
              },
            ],
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          itemId: "item-1",
          status: "draft_edited",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          deliveryId: "delivery-2",
          questionId: "question-2",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          deliveryId: "delivery-3",
          eventQuestionId: "event-question-1",
        },
        error: null,
      });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(getQuestionGenerationBatchDetail({ batchId: "batch-1" }, client as never)).resolves.toEqual({
      batch: expect.objectContaining({
        id: "batch-1",
        model: "gemini-3.6-flash",
        status: "ready_for_review",
      }),
      references: [
        expect.objectContaining({
          id: "reference-1",
          stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
        }),
      ],
      items: [
        expect.objectContaining({
          id: "item-1",
          variationModeLabel: "Jebakan baru, tujuan sama",
          referenceLabel: "KDIGO CKD guideline",
          referenceUrl: "https://kdigo.org/guidelines/ckd/",
          deliverySummaryLabel: "Bank soal 1x",
        }),
      ],
    });

    await expect(
      updateGeneratedDraftItem(
        {
          generationItemId: "item-1",
          stem: "Soal revisi",
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "Pilihan C",
            D: "Pilihan D",
            E: "Pilihan E",
          },
          correctOptionKey: "C",
          explanationText: "Pembahasan revisi.",
        },
        client as never,
      ),
    ).resolves.toEqual({
      itemId: "item-1",
      status: "draft_edited",
    });

    await expect(
      deliverGeneratedItemToQuestionBank(
        {
          generationItemId: "item-1",
          blockId: "block-1",
          topicId: "topic-1",
        },
        client as never,
      ),
    ).resolves.toEqual({
      deliveryId: "delivery-2",
      questionId: "question-2",
    });

    await expect(
      deliverGeneratedItemToScheduledEvent(
        {
          generationItemId: "item-1",
          eventId: "event-1",
        },
        client as never,
      ),
    ).resolves.toEqual({
      deliveryId: "delivery-3",
      eventQuestionId: "event-question-1",
    });
  });

  test("surfaces the edge function json message when generation fails", async () => {
    const client = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: null,
          error: new FunctionsHttpError(
            new Response(
              JSON.stringify({
                error: "BYOK_INVALID",
                message: "Gemini API key pribadi wajib valid.",
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            ),
          ),
        }),
      },
    };

    await expect(
      generateQuestionBatch(
        {
          references: [],
          targetQuestionCount: 2,
        },
        client as never,
      ),
    ).rejects.toThrow(/api key pribadi wajib valid/i);
  });

  test("surfaces strict trusted-reference failures with their backend message", async () => {
    const client = {
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: null,
          error: new FunctionsHttpError(
            new Response(
              JSON.stringify({
                error: "REFERENCE_URL_UNREACHABLE",
                message: "Output generator memakai link referensi yang tidak bisa diakses dari server.",
              }),
              {
                status: 422,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            ),
          ),
        }),
      },
    };

    await expect(
      generateQuestionBatch(
        {
          references: [            {
            stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
            options: {
              A: "Amlodipin",
              B: "Lisinopril",
              C: "Parasetamol",
              D: "Metformin",
              E: "Omeprazol",
            },
            correctOptionKey: "B",
            explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.",
          }],
          targetQuestionCount: 2,
        },
        client as never,
      ),
    ).rejects.toThrow(/output generator memakai link referensi/i);
  });
});
