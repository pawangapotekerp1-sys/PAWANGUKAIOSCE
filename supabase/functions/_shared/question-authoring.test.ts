import { describe, expect, test } from "vitest";
import {
  normalizeStructuredUploadRows,
  resolveManualDraftStatus,
} from "./question-authoring";

describe("question-authoring shared helpers", () => {
  test("rows with valid topic names map to taxonomy ids and become draft_ready when answer plus explanation exist", () => {
    const result = normalizeStructuredUploadRows({
      inputFormat: "csv",
      rows: [
        {
          question_text: "Apa target tekanan darah pada CKD?",
          option_a: "<140/90 mmHg",
          option_b: "<130/80 mmHg",
          correct_answer: "B",
          explanation: "Target lebih ketat dipilih untuk proteksi ginjal.",
          block: "Clinical Science",
          topic: "Kardiologi",
        },
      ],
      taxonomy: {
        blocks: [
          { id: "block-1", name: "Clinical Science" },
        ],
        topics: [
          { id: "topic-1", name: "Kardiologi", blockId: "block-1" },
        ],
      },
    });

    expect(result.items[0]).toMatchObject({
      blockId: "block-1",
      topicId: "topic-1",
      workflowStatus: "draft_ready",
      topicSuggestionStatus: "accepted_from_upload",
    });
  });

  test("rows with blank topic values receive topic suggestion placeholders", () => {
    const result = normalizeStructuredUploadRows({
      inputFormat: "xlsx",
      rows: [
        {
          question_text: "Penyebab wheezing akut paling mungkin?",
          option_a: "Edema paru",
          option_b: "Bronkospasme",
          correct_answer: "B",
        },
      ],
      taxonomy: {
        blocks: [],
        topics: [],
      },
    });

    expect(result.items[0]).toMatchObject({
      topicId: null,
      suggestedTopicName: null,
      topicSuggestionStatus: "pending",
    });
  });

  test("rows missing explanation become needs_enrichment", () => {
    const result = normalizeStructuredUploadRows({
      inputFormat: "csv",
      rows: [
        {
          question_text: "Terapi awal edema paru akut?",
          option_a: "Furosemid",
          option_b: "Vitamin C",
          correct_answer: "A",
          topic: "Kardiologi",
        },
      ],
      taxonomy: {
        blocks: [],
        topics: [
          { id: "topic-1", name: "Kardiologi", blockId: null },
        ],
      },
    });

    expect(result.items[0]).toMatchObject({
      workflowStatus: "needs_enrichment",
      topicId: "topic-1",
    });
  });

  test("structured rows preserve option E when upload provides five answer choices", () => {
    const result = normalizeStructuredUploadRows({
      inputFormat: "csv",
      rows: [
        {
          question_text: "Antibiotik cadangan yang paling tepat?",
          option_a: "Amoksisilin",
          option_b: "Ampisilin",
          option_c: "Sefiksim",
          option_d: "Seftriakson",
          option_e: "Meropenem",
          correct_answer: "E",
          explanation: "Pilihan cadangan dipakai untuk kasus berat dengan pertimbangan spektrum.",
        },
      ],
      taxonomy: {
        blocks: [],
        topics: [],
      },
    });

    expect(result.items[0]).toMatchObject({
      correctOptionKey: "E",
      options: [
        { key: "A", text: "Amoksisilin" },
        { key: "B", text: "Ampisilin" },
        { key: "C", text: "Sefiksim" },
        { key: "D", text: "Seftriakson" },
        { key: "E", text: "Meropenem" },
      ],
    });
  });

  test("manual draft status falls back to needs_enrichment when explanation is missing", () => {
    expect(resolveManualDraftStatus("B", "")).toBe("needs_enrichment");
    expect(resolveManualDraftStatus("B", "Pembahasan tersedia.")).toBe("draft_ready");
  });
});
