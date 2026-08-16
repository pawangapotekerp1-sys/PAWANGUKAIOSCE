import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  buildGeneratedItemRows,
  buildGeneratorCredentialWritePayload,
  buildQuestionBankDeliveryPayload,
  buildScheduledEventDeliveryPayload,
  buildQuestionGenerationBatchInsert,
  ensureQuestionGeneratorAccess,
  QuestionGeneratorAccessError,
  validateQuestionGeneratorReferences,
} from "./handler";

const validReference = {
  stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
  options: {
    A: "Amlodipin",
    B: "Lisinopril",
    C: "Parasetamol",
    D: "Metformin",
    E: "Omeprazol",
  },
  correctOptionKey: "B" as const,
  explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.\n\nPustaka:\nDOI: 10.1000/test",
};

describe("ensureQuestionGeneratorAccess", () => {
  test("uses explicit .ts extensions for runtime local imports", () => {
    const handlerSource = readFileSync(resolve(import.meta.dirname, "./handler.ts"), "utf8");
    const indexSource = readFileSync(resolve(import.meta.dirname, "./index.ts"), "utf8");

    expect(handlerSource).toContain('../_shared/question-generator.ts');
    expect(indexSource).toContain('.rpc("create_vault_secret"');
    expect(indexSource).toContain('.rpc("read_vault_secret"');
    expect(indexSource).toContain('.rpc("delete_vault_secret"');
    expect(indexSource).toContain('.rpc("persist_generated_question_batch"');
    expect(indexSource).toContain('.rpc("deliver_generated_item_to_question_bank"');
    expect(indexSource).toContain('.rpc("deliver_generated_item_to_scheduled_event"');
    expect(indexSource).not.toContain('.schema("vault")');
    expect(indexSource).toMatch(/payload\.action === "update-item"[\s\S]*assertQuestionTopicProximity/);
    expect(indexSource).toContain('TOPIC_DRIFT');
    expect(indexSource).toContain('MAX_TARGET_QUESTION_COUNT');
    expect(indexSource).not.toContain("JSON.parse(responseText)");
    expect(indexSource).toContain("generateGeminiStructuredData");
    expect(indexSource).toContain("validateGeneratedReferenceBatch");
    expect(indexSource).toContain("INVALID_REFERENCE_URL_FORMAT");
    expect(indexSource).toContain("REFERENCE_DOMAIN_NOT_ALLOWED");
    expect(indexSource).toContain("REFERENCE_URL_UNREACHABLE");
    expect(indexSource).not.toContain('"copy_concept"');
    expect(indexSource).not.toContain('"paraphrase"');
    expect(indexSource).toMatch(/validateGeneratedReferenceBatch[\s\S]*persistGeneratedQuestionBatch/);
  });

  test("rejects users who are not admin or mentor", () => {
    expect(() => ensureQuestionGeneratorAccess("pro")).toThrow(QuestionGeneratorAccessError);
    expect(() => ensureQuestionGeneratorAccess("pendaftar_baru")).toThrow(/admin atau mentor/i);
  });
});

describe("buildGeneratorCredentialWritePayload", () => {
  test("saves a personal Gemini key with default model and masked hint", () => {
    expect(buildGeneratorCredentialWritePayload({
      apiKey: "AIza-testing-key-1234",
      model: "",
      userId: "user-1",
    })).toEqual({
      user_id: "user-1",
      provider: "gemini",
      model: "gemini-3.7-flash",
      secret_hint: "••••1234",
      last_error: null,
    });
  });
});

describe("validateQuestionGeneratorReferences", () => {
  test("accepts one fully complete reference question", () => {
    expect(validateQuestionGeneratorReferences([validReference])).toHaveLength(1);
  });

  test("accepts reference input without any bibliography block", () => {
    expect(validateQuestionGeneratorReferences([
      {
        ...validReference,
        explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.",
      },
    ])).toHaveLength(1);
  });

  test("accepts reference input with a sufficiently detailed non-link book citation", () => {
    expect(validateQuestionGeneratorReferences([
      {
        ...validReference,
        explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.\n\nPustaka:\nKatzung BG. Basic & Clinical Pharmacology. 15th ed. 2021.",
      },
    ])).toHaveLength(1);
  });

  test("rejects references that do not contain full A-E options, correct answer, or explanation", () => {
    expect(() =>
      validateQuestionGeneratorReferences([
        {
          ...validReference,
          options: {
            A: "A",
            B: "B",
            C: "C",
            D: "D",
          },
        },
      ]),
    ).toThrow(/A-E/i);

    expect(() =>
      validateQuestionGeneratorReferences([
        {
          ...validReference,
          explanationText: "  ",
        },
      ]),
    ).toThrow(/pembahasan/i);
  });

  test("rejects empty or generic labeled bibliography blocks", () => {
    expect(() =>
      validateQuestionGeneratorReferences([
        {
          ...validReference,
          explanationText: "Pembahasan inti.\n\nPustaka:",
        },
      ]),
    ).toThrow(/pustaka/i);

    expect(() =>
      validateQuestionGeneratorReferences([
        {
          ...validReference,
          explanationText: "Pembahasan inti.\n\nSumber: internet",
        },
      ]),
    ).toThrow(/ditelusuri|pustaka/i);

    expect(() =>
      validateQuestionGeneratorReferences([
        {
          ...validReference,
          explanationText: "Pembahasan inti.\n\nReferensi: artikel jurnal farmakologi",
        },
      ]),
    ).toThrow(/ditelusuri|pustaka/i);
  });
});

describe("generator persistence builders", () => {
  test("builds a batch insert payload with reference count and target count", () => {
    expect(buildQuestionGenerationBatchInsert({
      createdBy: "user-1",
      model: "gemini-3.7-flash",
      references: [validReference],
      targetQuestionCount: 5,
    })).toEqual({
      created_by: "user-1",
      model: "gemini-3.7-flash",
      target_question_count: 5,
      reference_count: 1,
      status: "generating",
      generated_count: 0,
      failed_reason: null,
    });
  });

  test("persists generated batch items with mode metadata", () => {
    expect(buildGeneratedItemRows({
      batchId: "batch-1",
      generatedItems: [
        {
          stem: "Soal 1",
          options: validReference.options,
          correctOptionKey: "B",
          explanationText: "Pembahasan 1",
          variationMode: "new_case_same_concept",
          reference: {
            label: "KDIGO CKD guideline",
            url: "https://kdigo.org/guidelines/ckd/",
          },
        },
        {
          stem: "Soal 2",
          options: validReference.options,
          correctOptionKey: "A",
          explanationText: "Pembahasan 2",
          variationMode: "reverse_reasoning",
          reference: {
            label: "WHO hypertension publication",
            url: "https://www.who.int/publications/example",
          },
        },
      ],
    })).toEqual([
      {
        batch_id: "batch-1",
        item_order: 1,
        generation_mode: "new_case_same_concept",
        status: "draft_generated",
      },
      {
        batch_id: "batch-1",
        item_order: 2,
        generation_mode: "reverse_reasoning",
        status: "draft_generated",
      },
    ]);
  });
});

describe("delivery payload validation", () => {
  test("requires blok and materi before bank soal delivery", () => {
    expect(() =>
      buildQuestionBankDeliveryPayload({
        generationItemId: "item-1",
        deliveredBy: "user-1",
        blockId: "",
        topicId: "topic-1",
      }),
    ).toThrow(/blok/i);
  });

  test("requires event selection before scheduled-event delivery", () => {
    expect(() =>
      buildScheduledEventDeliveryPayload({
        generationItemId: "item-1",
        deliveredBy: "user-1",
        eventId: "",
      }),
    ).toThrow(/event/i);
  });
});
