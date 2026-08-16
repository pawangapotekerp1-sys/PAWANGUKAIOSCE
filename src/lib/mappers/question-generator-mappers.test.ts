import { describe, expect, test } from "vitest";
import {
  mapQuestionGenerationBatchDetail,
  mapQuestionGeneratorStatus,
} from "./question-generator-mappers";

describe("question-generator-mappers", () => {
  test("maps status payloads into the generator BYOK view model", () => {
    expect(
      mapQuestionGeneratorStatus({
        hasCredential: true,
        model: "gemini-3.7-flash",
        lastValidatedAt: "2026-06-04T08:00:00.000Z",
        lastError: null,
      }),
    ).toEqual({
      hasCredential: true,
      model: "gemini-3.7-flash",
      modelLabel: "gemini-3.7-flash",
      lastValidatedAt: "2026-06-04T08:00:00.000Z",
      lastError: null,
    });
  });

  test("maps variation labels, source metadata, and delivery summaries without surfacing legacy batch wording", () => {
    const detail = mapQuestionGenerationBatchDetail({
      batch: {
        id: "batch-1",
        model: "gemini-3.7-flash",
        targetQuestionCount: 3,
        referenceCount: 1,
        status: "partially_distributed",
        generatedCount: 3,
        failedReason: null,
        createdAt: "2026-06-04T08:00:00.000Z",
        updatedAt: "2026-06-04T08:20:00.000Z",
      },
      references: [],
      items: [
        {
          id: "item-1",
          draftQuestionId: "draft-1",
          order: 1,
          variationMode: "new_case_same_concept",
          status: "draft_generated",
          editedAt: null,
          stem: "Soal A",
          options: {
            A: "A",
            B: "B",
            C: "C",
            D: "D",
            E: "E",
          },
          correctOptionKey: "A",
          explanationText: "Pembahasan A",
          reference: {
            label: "KDIGO CKD guideline",
            url: "https://kdigo.org/guidelines/ckd/",
          },
          deliveries: [],
        },
        {
          id: "item-2",
          draftQuestionId: "draft-2",
          order: 2,
          variationMode: "reverse_reasoning",
          status: "draft_edited",
          editedAt: "2026-06-04T08:15:00.000Z",
          stem: "Soal B",
          options: {
            A: "A",
            B: "B",
            C: "C",
            D: "D",
            E: "E",
          },
          correctOptionKey: "B",
          explanationText: "Pembahasan B",
          reference: {
            label: "WHO hypertension publication",
            url: "https://www.who.int/publications/example",
          },
          deliveries: [
            {
              id: "delivery-1",
              destinationType: "scheduled_event",
              destinationQuestionId: null,
              destinationEventId: "event-1",
              destinationEventQuestionId: "event-question-1",
              blockId: null,
              topicId: null,
              deliveredBy: "user-1",
              createdAt: "2026-06-04T08:16:00.000Z",
            },
            {
              id: "delivery-2",
              destinationType: "scheduled_event",
              destinationQuestionId: null,
              destinationEventId: "event-2",
              destinationEventQuestionId: "event-question-2",
              blockId: null,
              topicId: null,
              deliveredBy: "user-1",
              createdAt: "2026-06-04T08:17:00.000Z",
            },
          ],
        },
      ],
    });

    expect(detail.batch.statusLabel).toBe("Sebagian sudah didistribusikan");
    expect(detail.items[0]).toMatchObject({
      variationModeLabel: "Kasus baru, konsep sama",
      referenceLabel: "KDIGO CKD guideline",
      referenceUrl: "https://kdigo.org/guidelines/ckd/",
      deliverySummaryLabel: "Belum didistribusikan",
    });
    expect(detail.items[1]).toMatchObject({
      variationModeLabel: "Penalaran dibalik",
      referenceLabel: "WHO hypertension publication",
      referenceUrl: "https://www.who.int/publications/example",
      deliverySummaryLabel: "Event 2x",
    });
  });
});
