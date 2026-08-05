import { describe, expect, test } from "vitest";
import {
  groupTemplatesForCatalog,
  mapAttemptSessionPageData,
  mapTemplatesToCatalogCards,
} from "./tryout-mappers";

describe("tryout-mappers", () => {
  test("maps count labels for full, block, and topic templates", () => {
    expect(
      mapTemplatesToCatalogCards([
        {
          id: "template-full",
          slug: "tryout-besar",
          title: "Try Out Besar",
          description: "Simulasi penuh",
          mode: "full",
          questionCount: 50,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
        },
        {
          id: "template-block",
          slug: "clinical-science",
          title: "Clinical Science",
          description: "Try out per blok",
          mode: "block",
          questionCount: 30,
          blockId: "block-1",
          blockName: "Clinical Science",
          topicId: null,
          topicName: null,
        },
        {
          id: "template-topic",
          slug: "kardiologi",
          title: "Kardiologi",
          description: "Try out per materi",
          mode: "topic",
          questionCount: 20,
          blockId: "block-1",
          blockName: "Clinical Science",
          topicId: "topic-1",
          topicName: "Kardiologi",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        title: "Try Out Besar",
        subtitle: "Simulasi penuh",
        questionCountLabel: "50 soal",
      }),
      expect.objectContaining({
        title: "Clinical Science",
        subtitle: "Try out per blok",
        questionCountLabel: "30 soal",
      }),
      expect.objectContaining({
        title: "Kardiologi",
        subtitle: "Try out per materi",
        questionCountLabel: "20 soal",
      }),
    ]);
  });

  test("groups topic templates under their parent blocks for the catalog page", () => {
    expect(
      groupTemplatesForCatalog([
        {
          id: "template-full",
          slug: "tryout-besar",
          title: "Try Out Besar",
          description: "Simulasi penuh",
          mode: "full",
          questionCount: 50,
          durationMinutes: 60,
          blockId: null,
          blockName: null,
          topicId: null,
          topicName: null,
        },
        {
          id: "template-block-1",
          slug: "clinical-science",
          title: "Clinical Science",
          description: "Try out per blok Clinical Science.",
          mode: "block",
          questionCount: 30,
          durationMinutes: 40,
          blockId: "block-1",
          blockName: "Clinical Science",
          blockSortOrder: 2,
          topicId: null,
          topicName: null,
          topicSortOrder: null,
        },
        {
          id: "template-topic-1",
          slug: "kardiologi",
          title: "Kardiologi",
          description: "Try out per materi Kardiologi.",
          mode: "topic",
          questionCount: 20,
          durationMinutes: 30,
          blockId: "block-1",
          blockName: "Clinical Science",
          blockSortOrder: 2,
          topicId: "topic-1",
          topicName: "Kardiologi",
          topicSortOrder: 1,
        },
        {
          id: "template-topic-2",
          slug: "pernafasan-dan-pencernaan",
          title: "Pernafasan dan Pencernaan",
          description: "Try out per materi Pernafasan dan Pencernaan.",
          mode: "topic",
          questionCount: 20,
          durationMinutes: 30,
          blockId: "block-1",
          blockName: "Clinical Science",
          blockSortOrder: 2,
          topicId: "topic-2",
          topicName: "Pernafasan dan Pencernaan",
          topicSortOrder: 2,
        },
      ]),
    ).toEqual({
      fullTemplate: expect.objectContaining({
        title: "Try Out Besar",
        questionCountLabel: "50 soal",
      }),
      blockTemplates: [
        expect.objectContaining({
          title: "Clinical Science",
          questionCountLabel: "30 soal",
        }),
      ],
      topicGroups: [
        {
          blockId: "block-1",
          blockName: "Clinical Science",
          topics: [
            expect.objectContaining({
              title: "Kardiologi",
              questionCountLabel: "20 soal",
            }),
            expect.objectContaining({
              title: "Pernafasan dan Pencernaan",
              questionCountLabel: "20 soal",
            }),
          ],
        },
      ],
    });
  });

  test("sorts block and topic groups by taxonomy order even when incoming templates are unsorted", () => {
    const result = groupTemplatesForCatalog([
      {
        id: "template-topic-2",
        slug: "farmakokinetik-interaksi-obat-dan-antidotum",
        title: "Farmakokinetik, Interaksi Obat dan Antidotum",
        description: "Try out per materi farmakokinetik.",
        mode: "topic",
        questionCount: 20,
        durationMinutes: 30,
        blockId: "block-2",
        blockName: "Clinical Science",
        blockSortOrder: 2,
        topicId: "topic-2",
        topicName: "Farmakokinetik, Interaksi Obat dan Antidotum",
        topicSortOrder: 4,
      },
      {
        id: "template-block-2",
        slug: "clinical-science",
        title: "Clinical Science",
        description: "Try out per blok Clinical Science.",
        mode: "block",
        questionCount: 30,
        durationMinutes: 40,
        blockId: "block-2",
        blockName: "Clinical Science",
        blockSortOrder: 2,
        topicId: null,
        topicName: null,
        topicSortOrder: null,
      },
      {
        id: "template-topic-1",
        slug: "kardiologi",
        title: "Kardiologi",
        description: "Try out per materi kardiologi.",
        mode: "topic",
        questionCount: 20,
        durationMinutes: 30,
        blockId: "block-2",
          blockName: "Clinical Science",
          blockSortOrder: 2,
          topicId: "topic-1",
          topicName: "Kardiologi",
          topicSortOrder: 5,
        },
      {
        id: "template-block-1",
        slug: "pharmaceutical-science",
        title: "Pharmaceutical Science",
        description: "Try out per blok Pharmaceutical Science.",
        mode: "block",
        questionCount: 30,
        durationMinutes: 40,
        blockId: "block-1",
        blockName: "Pharmaceutical Science",
        blockSortOrder: 1,
        topicId: null,
        topicName: null,
        topicSortOrder: null,
      },
    ]);

    expect(result.blockTemplates.map((template) => template.id)).toEqual([
      "template-block-1",
      "template-block-2",
    ]);
    expect(result.topicGroups.map((group) => group.blockId)).toEqual(["block-2"]);
    expect(result.topicGroups[0]?.topics.map((topic) => topic.id)).toEqual([
      "template-topic-2",
      "template-topic-1",
    ]);
  });

  test("maps session answers with doubtful state and computes remaining time", () => {
    expect(
      mapAttemptSessionPageData({
        attempt: {
          id: "attempt-1",
          status: "in_progress",
          totalQuestions: 2,
          timeLimitSeconds: 120,
          startedAt: "2026-05-01T10:00:00.000Z",
          submittedAt: null,
          elapsedSeconds: 30,
          lastResumedAt: "2026-05-01T10:00:30.000Z",
          pausedAt: null,
        },
        items: [
          {
            id: "item-1",
            blockName: "Clinical Science",
            stem: "Apa terapi awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            sortOrder: 1,
          },
          {
            id: "item-2",
            blockName: "Pharmaceutical Science",
            stem: "Apa indikator proses aseptik?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            sortOrder: 2,
          },
        ],
        answers: [
          {
            attemptItemId: "item-1",
            selectedOptionKey: "B",
            isDoubtful: true,
          },
        ],
        now: new Date("2026-05-01T10:01:00.000Z"),
      }),
    ).toEqual({
      view: "ready",
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        totalQuestions: 2,
        timeRemainingSeconds: 60,
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
  });

  test("keeps the timer frozen while an attempt is paused", () => {
    expect(
      mapAttemptSessionPageData({
        attempt: {
          id: "attempt-2",
          status: "paused",
          totalQuestions: 2,
          timeLimitSeconds: 120,
          startedAt: "2026-05-01T10:00:00.000Z",
          submittedAt: null,
          elapsedSeconds: 45,
          lastResumedAt: null,
          pausedAt: "2026-05-01T10:00:45.000Z",
        },
        items: [
          {
            id: "item-1",
            blockName: "Clinical Science",
            stem: "Apa terapi awal?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            sortOrder: 1,
          },
        ],
        answers: [],
        now: new Date("2026-05-01T10:10:00.000Z"),
      }),
    ).toEqual({
      view: "ready",
      attempt: {
        id: "attempt-2",
        status: "paused",
        totalQuestions: 2,
        timeRemainingSeconds: 75,
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
});
