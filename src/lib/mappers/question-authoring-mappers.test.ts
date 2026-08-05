import { describe, expect, test } from "vitest";
import {
  mapQuestionBankItem,
  mapQuestionEditorData,
  mapQuestionStatusLabel,
} from "./question-authoring-mappers";

describe("question-authoring-mappers", () => {
  test("maps final question rows into simple question bank cards", () => {
    expect(
      mapQuestionBankItem({
        id: "question-1",
        stem: "Apa target tekanan darah pada CKD?",
        status: "draft",
        blockId: "block-1",
        blockName: "Clinical Science",
        topicId: "topic-1",
        topicName: "Kardiologi",
        questionImageUrl: "https://example.com/question.png",
        explanationText: "Target dipilih lebih ketat untuk proteksi ginjal.",
        explanationImageUrl: null,
        updatedAt: "2026-05-03T08:00:00.000Z",
      }),
    ).toEqual({
      id: "question-1",
      stem: "Apa target tekanan darah pada CKD?",
      status: "draft",
      statusLabel: "Draft",
      blockId: "block-1",
      blockName: "Clinical Science",
      topicId: "topic-1",
      topicName: "Kardiologi",
      questionImageUrl: "https://example.com/question.png",
      hasQuestionImage: true,
      hasExplanationText: true,
      hasExplanationImage: false,
      updatedAt: "2026-05-03T08:00:00.000Z",
    });
  });

  test("maps editor data with taxonomy, options, and both media fields", () => {
    expect(
      mapQuestionEditorData({
        id: "question-2",
        stem: "Dokumentasi intervensi farmasis akan paling berguna bila ditautkan dengan apa?",
        status: "published",
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
        updatedAt: "2026-05-03T09:15:00.000Z",
      }),
    ).toEqual({
      id: "question-2",
      stem: "Dokumentasi intervensi farmasis akan paling berguna bila ditautkan dengan apa?",
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

  test("maps final question statuses to concise admin labels", () => {
    expect(mapQuestionStatusLabel("draft")).toBe("Draft");
    expect(mapQuestionStatusLabel("published")).toBe("Published");
    expect(mapQuestionStatusLabel("archived")).toBe("Archived");
  });
});
