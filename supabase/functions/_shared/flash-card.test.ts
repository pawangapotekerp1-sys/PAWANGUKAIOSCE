import { describe, expect, test } from "vitest";
import {
  assertFlashCardOutputQuality,
  collectFlashCardSourcePathsForCleanup,
  classifyFlashCardPdfSource,
  normalizeFlashCardAcademicGroup,
  validateFlashCardOutput,
} from "./flash-card";

describe("normalizeFlashCardAcademicGroup", () => {
  test("normalizes the three supported academic groups", () => {
    expect(normalizeFlashCardAcademicGroup("Pharmaceutical Science")).toBe("pharmaceutical_science");
    expect(normalizeFlashCardAcademicGroup("clinical science")).toBe("clinical_science");
    expect(normalizeFlashCardAcademicGroup("Social Behavioral and Administration")).toBe(
      "social_behavioral_and_administration",
    );
  });
});

describe("validateFlashCardOutput", () => {
  test("rejects ai output missing required summaries and card fields", () => {
    expect(() =>
      validateFlashCardOutput({
        global_summary: "",
        subtopics: [
          {
            title: "",
            summary: "Ringkasan submateri",
            cards: [
              {
                front_text: "Apa itu ACE inhibitor?",
                back_text: "",
              },
            ],
          },
        ],
      }),
    ).toThrow(/summary|title|card/i);
  });

  test("rejects empty subtopic lists and subtopics without cards", () => {
    expect(() =>
      validateFlashCardOutput({
        global_summary: "Ringkasan materi utama.",
        subtopics: [],
      }),
    ).toThrow(/subtopic/i);

    expect(() =>
      validateFlashCardOutput({
        global_summary: "Ringkasan materi utama.",
        subtopics: [
          {
            title: "RAS",
            summary: "Ringkasan submateri",
            cards: [],
          },
        ],
      }),
    ).toThrow(/card/i);
  });
});

describe("assertFlashCardOutputQuality", () => {
  test("rejects ai output with one-word summaries and duplicate card fronts", () => {
    expect(() =>
      assertFlashCardOutputQuality({
        global_summary: "Ringkas",
        subtopics: [
          {
            title: "Hipertensi",
            summary: "Dasar",
            cards: [
              {
                front_text: "Apa target tekanan darah?",
                back_text: "Kurang dari 130/80 mmHg pada banyak kasus CKD.",
              },
              {
                front_text: "Apa target tekanan darah?",
                back_text: "ACE inhibitor sering dipilih pada albuminuria.",
              },
            ],
          },
        ],
      }),
    ).toThrow(/quality|duplicate|summary/i);
  });
});

describe("classifyFlashCardPdfSource", () => {
  test("uses direct text mode when the pdf already has readable text", () => {
    expect(classifyFlashCardPdfSource({
      mimeType: "application/pdf",
      extractedText: "Slide 1: Terapi hipertensi lini pertama.",
    })).toBe("text");
  });

  test("falls back to ocr mode when the pdf has no usable extracted text", () => {
    expect(classifyFlashCardPdfSource({
      mimeType: "application/pdf",
      extractedText: "   ",
    })).toBe("ocr");
  });
});

describe("collectFlashCardSourcePathsForCleanup", () => {
  test("returns only source files marked for cleanup", () => {
    expect(collectFlashCardSourcePathsForCleanup([
      {
        storageBucket: "flash-card-sources",
        storagePath: "mentor-1/material-1/transcript.txt",
        deleteAfterPublish: true,
      },
      {
        storageBucket: "flash-card-sources",
        storagePath: "mentor-1/material-1/slide.pdf",
        deleteAfterPublish: false,
      },
    ])).toEqual([
      {
        storageBucket: "flash-card-sources",
        storagePath: "mentor-1/material-1/transcript.txt",
      },
    ]);
  });
});
