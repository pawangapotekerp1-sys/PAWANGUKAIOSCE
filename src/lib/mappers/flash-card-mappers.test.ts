import { describe, expect, test } from "vitest";
import {
  mapFlashCardMaterialDetail,
  mapPublishedFlashCardDeck,
  mapPublishedFlashCardLibraryRows,
} from "./flash-card-mappers";

describe("flash-card-mappers", () => {
  test("maps academic grouping labels and filters unpublished rows out of the student library", () => {
    expect(
      mapPublishedFlashCardLibraryRows([
        {
          id: "subtopic-1",
          title: "ACE inhibitor pada CKD",
          summary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
          sort_order: 2,
          flashcard_materials: {
            id: "material-1",
            title: "Farmakoterapi Hipertensi",
            academic_group: "clinical_science",
            status: "published",
            published_at: "2026-06-06T12:00:00.000Z",
          },
          flashcard_cards: [{ id: "card-1" }, { id: "card-2" }],
        },
        {
          id: "subtopic-2",
          title: "Draft internal mentor",
          summary: "Harus disaring dari library siswa.",
          sort_order: 1,
          flashcard_materials: {
            id: "material-2",
            title: "Draft internal mentor",
            academic_group: "pharmaceutical_science",
            status: "draft",
            published_at: null,
          },
          flashcard_cards: [{ id: "card-3" }],
        },
      ]),
    ).toEqual([
      {
        academicGroup: "clinical_science",
        academicGroupLabel: "Clinical Science",
        cardCount: 2,
        materialId: "material-1",
        materialTitle: "Farmakoterapi Hipertensi",
        publishedAt: "2026-06-06T12:00:00.000Z",
        sortOrder: 2,
        subtopicId: "subtopic-1",
        subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
        subtopicTitle: "ACE inhibitor pada CKD",
      },
    ]);
  });

  test("maps mentor detail status labels and sorts cards plus progress into deck order", () => {
    expect(
      mapFlashCardMaterialDetail({
        material: {
          id: "material-1",
          title: "Farmakoterapi Hipertensi",
          academicGroup: "social_behavioral_and_administration",
          status: "failed",
          globalSummary: "Ringkasan materi untuk mentor review.",
          processingError: "OCR gagal membaca satu halaman.",
          publishedAt: null,
          createdAt: "2026-06-06T10:00:00.000Z",
          updatedAt: "2026-06-06T10:05:00.000Z",
        },
        sourceFiles: [],
        subtopics: [
          {
            id: "subtopic-1",
            title: "Konseling pasien",
            summary: "Poin utama edukasi dan komunikasi terapi.",
            sortOrder: 1,
            cards: [
              {
                id: "card-2",
                frontText: "Apa fokus konseling awal?",
                backText: "Tujuan terapi, cara pakai, dan warning utama.",
                sortOrder: 2,
              },
              {
                id: "card-1",
                frontText: "Kapan teach-back dipakai?",
                backText: "Saat memastikan pasien benar-benar paham.",
                sortOrder: 1,
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      material: {
        academicGroupLabel: "Social Behavioral and Administration",
        statusLabel: "Gagal diproses",
      },
      subtopics: [
        {
          cards: [
            {
              id: "card-1",
              sortOrder: 1,
            },
            {
              id: "card-2",
              sortOrder: 2,
            },
          ],
        },
      ],
    });

    expect(
      mapPublishedFlashCardDeck({
        subtopic: {
          id: "subtopic-1",
          title: "ACE inhibitor pada CKD",
          summary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
          sort_order: 1,
          flashcard_materials: {
            id: "material-1",
            title: "Farmakoterapi Hipertensi",
            academic_group: "clinical_science",
            status: "published",
            published_at: "2026-06-06T12:00:00.000Z",
          },
          flashcard_cards: [
            {
              id: "card-2",
              front_text: "Apa target tekanan darah?",
              back_text: "Kurang dari 130/80 mmHg pada banyak pasien CKD.",
              sort_order: 2,
            },
            {
              id: "card-1",
              front_text: "Kapan ACE inhibitor dipilih?",
              back_text: "Saat albuminuria atau CKD yang relevan.",
              sort_order: 1,
            },
          ],
        },
        progressRows: [
          {
            card_id: "card-2",
            difficulty: "medium",
            last_reviewed_at: "2026-06-06T12:05:00.000Z",
          },
        ],
      }),
    ).toEqual({
      academicGroup: "clinical_science",
      academicGroupLabel: "Clinical Science",
      cards: [
        {
          backText: "Saat albuminuria atau CKD yang relevan.",
          frontText: "Kapan ACE inhibitor dipilih?",
          id: "card-1",
          lastReviewedAt: null,
          savedDifficulty: null,
          sortOrder: 1,
        },
        {
          backText: "Kurang dari 130/80 mmHg pada banyak pasien CKD.",
          frontText: "Apa target tekanan darah?",
          id: "card-2",
          lastReviewedAt: "2026-06-06T12:05:00.000Z",
          savedDifficulty: "medium",
          sortOrder: 2,
        },
      ],
      materialId: "material-1",
      materialTitle: "Farmakoterapi Hipertensi",
      publishedAt: "2026-06-06T12:00:00.000Z",
      subtopicId: "subtopic-1",
      subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
      subtopicTitle: "ACE inhibitor pada CKD",
    });
  });
});
