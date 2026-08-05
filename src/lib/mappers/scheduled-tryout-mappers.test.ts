import { describe, expect, test } from "vitest";
import {
  mapScheduledAttemptResultToPageData,
  mapScheduledAttemptSessionPageData,
  mapScheduledCatalogEntriesToCards,
  mapScheduledEventEditorData,
  mapScheduledEventLeaderboardToPageData,
  mapScheduledOpsEventsToRows,
} from "./scheduled-tryout-mappers";

describe("scheduled-tryout-mappers", () => {
  test("maps active catalog entries into student-facing cards with five-attempt labels", () => {
    expect(
      mapScheduledCatalogEntriesToCards([
        {
          id: "event-1",
          title: "TO Klinik Juni",
          description: "Latihan klinik dengan jendela waktu aktif.",
          accessStartAt: "2026-06-01T01:00:00.000Z",
          accessEndAt: "2026-06-03T14:00:00.000Z",
          currentCycle: 2,
          questionCount: 40,
          durationMinutes: 40,
          remainingAttempts: 2,
          submittedAttemptCount: 1,
          hasActiveAttempt: false,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        id: "event-1",
        title: "TO Klinik Juni",
        questionCountLabel: "40 soal",
        durationLabel: "40 menit",
        attemptsRemainingLabel: "2 dari 5 attempt tersisa",
        isLocked: false,
      }),
    ]);
  });

  test("maps scheduled leaderboard rows with live state and shared ranks", () => {
    expect(
      mapScheduledEventLeaderboardToPageData({
        state: "live",
        eventId: "event-1",
        eventTitle: "TO Klinik Juni",
        eventCycle: 2,
        rows: [
          {
            rank: 1,
            eventId: "event-1",
            eventCycle: 2,
            userId: "user-1",
            alias: "FarmasiNad",
            bestScore: 92,
            bestScoreAttemptNumber: 2,
            attemptId: "attempt-2",
            submittedAt: "2026-06-16T01:00:00.000Z",
          },
          {
            rank: 1,
            eventId: "event-1",
            eventCycle: 2,
            userId: "user-2",
            alias: "Apoteker-Rani",
            bestScore: 92,
            bestScoreAttemptNumber: 2,
            attemptId: "attempt-9",
            submittedAt: "2026-06-16T01:05:00.000Z",
          },
        ],
      }),
    ).toEqual({
      state: "live",
      eventId: "event-1",
      eventTitle: "TO Klinik Juni",
      eventCycle: 2,
      stateLabel: "Leaderboard sementara",
      helperText: "Peringkat ini masih bisa berubah sampai event berakhir.",
      rows: [
        expect.objectContaining({
          rank: 1,
          alias: "FarmasiNad",
          bestScore: 92,
          bestScoreAttemptNumber: 2,
        }),
        expect.objectContaining({
          rank: 1,
          alias: "Apoteker-Rani",
          bestScore: 92,
          bestScoreAttemptNumber: 2,
        }),
      ],
    });
  });

  test("maps ops rows into draft upcoming active and expired labels", () => {
    const rows = mapScheduledOpsEventsToRows([
      {
        id: "event-draft",
        title: "Draft Event",
        description: "",
        editorialStatus: "draft",
        accessStartAt: "2026-06-10T01:00:00.000Z",
        accessEndAt: "2026-06-10T03:00:00.000Z",
        currentCycle: 1,
        questionCount: 10,
        durationMinutes: 10,
      },
      {
        id: "event-upcoming",
        title: "Upcoming Event",
        description: "",
        editorialStatus: "published",
        accessStartAt: "2026-06-10T01:00:00.000Z",
        accessEndAt: "2026-06-10T03:00:00.000Z",
        currentCycle: 1,
        questionCount: 20,
        durationMinutes: 20,
      },
      {
        id: "event-active",
        title: "Active Event",
        description: "",
        editorialStatus: "published",
        accessStartAt: "2026-06-08T01:00:00.000Z",
        accessEndAt: "2026-06-10T03:00:00.000Z",
        currentCycle: 2,
        questionCount: 30,
        durationMinutes: 30,
      },
      {
        id: "event-expired",
        title: "Expired Event",
        description: "",
        editorialStatus: "published",
        accessStartAt: "2026-06-01T01:00:00.000Z",
        accessEndAt: "2026-06-03T03:00:00.000Z",
        currentCycle: 3,
        questionCount: 40,
        durationMinutes: 40,
      },
    ], new Date("2026-06-09T01:30:00.000Z"));

    expect(rows.map((row) => ({
      id: row.id,
      statusLabel: row.statusLabel,
    }))).toEqual([
      { id: "event-draft", statusLabel: "Draft" },
      { id: "event-upcoming", statusLabel: "Upcoming" },
      { id: "event-active", statusLabel: "Active" },
      { id: "event-expired", statusLabel: "Expired" },
    ]);
  });

  test("maps scheduled session data with the same answer and ragu-ragu shape as tryout", () => {
    expect(
      mapScheduledAttemptSessionPageData({
        attempt: {
          id: "scheduled-attempt-1",
          status: "paused",
          totalQuestions: 20,
          timeLimitSeconds: 1200,
          startedAt: "2026-06-01T10:00:00.000Z",
          submittedAt: null,
          elapsedSeconds: 300,
          lastResumedAt: null,
          pausedAt: "2026-06-01T10:05:00.000Z",
        },
        items: [
          {
            id: "attempt-item-1",
            blockName: "Clinical Science",
            stem: "Apa terapi awal yang paling rasional?",
            questionImageUrl: null,
            options: [
              { key: "A", text: "Pilihan A" },
              { key: "B", text: "Pilihan B" },
            ],
            sortOrder: 1,
          },
        ],
        answers: [
          {
            attemptItemId: "attempt-item-1",
            selectedOptionKey: "B",
            isDoubtful: true,
          },
        ],
        now: new Date("2026-06-01T10:10:00.000Z"),
      }),
    ).toEqual({
      view: "ready",
      attempt: {
        id: "scheduled-attempt-1",
        status: "paused",
        totalQuestions: 20,
        timeRemainingSeconds: 900,
      },
      questions: [
        {
          id: "attempt-item-1",
          order: 1,
          blockLabel: "Clinical Science",
          stem: "Apa terapi awal yang paling rasional?",
          questionImageUrl: null,
          options: [
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
          ],
          selectedOptionKey: "B",
          isDoubtful: true,
        },
      ],
    });
  });

  test("maps scheduled result data into score counts and block summaries", () => {
    expect(
      mapScheduledAttemptResultToPageData({
        attemptId: "scheduled-attempt-1",
        eventId: "event-1",
        eventCycle: 2,
        score: 82.5,
        correctAnswers: 33,
        wrongAnswers: 7,
        unansweredCount: 0,
        timeUsedSeconds: 1800,
        blockSummary: [
          { name: "Clinical Science", correct: 18, wrong: 2 },
          { name: "Pharmaceutical Science", correct: 15, wrong: 5 },
        ],
      }),
    ).toEqual({
      attemptId: "scheduled-attempt-1",
      eventId: "event-1",
      eventCycle: 2,
      score: 82.5,
      correctAnswers: 33,
      wrongAnswers: 7,
      unansweredCount: 0,
      timeUsedSeconds: 1800,
      blocks: [
        { blockLabel: "Clinical Science", correct: 18, wrong: 2 },
        { blockLabel: "Pharmaceutical Science", correct: 15, wrong: 5 },
      ],
    });
  });

  test("maps event editor payload into isolated scheduled event question rows", () => {
    expect(
      mapScheduledEventEditorData({
        event: {
          id: "event-1",
          title: "TO Klinik Juni",
          description: "Try out aktif untuk peserta pro.",
          editorialStatus: "published",
          accessStartAt: "2026-06-01T01:00:00.000Z",
          accessEndAt: "2026-06-03T14:00:00.000Z",
          currentCycle: 2,
          updatedAt: "2026-06-05T08:30:00.000Z",
        },
        questions: [
          {
            id: "question-1",
            order: 1,
            stem: "Apa terapi awal yang paling rasional?",
            questionImagePath: "question/scheduled-events/event-1-question.png",
            questionImageUrl: "https://signed.example/question/scheduled-events/event-1-question.png",
            explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
            explanationImagePath: "explanation/scheduled-events/event-1-explanation.png",
            explanationImageUrl: "https://signed.example/explanation/scheduled-events/event-1-explanation.png",
            blockId: "block-1",
            blockName: "Clinical Science",
            topicId: "topic-1",
            topicName: "Kardiologi",
            correctOptionKey: "B",
            options: [
              { id: "option-1", key: "A", text: "Pilihan A", sortOrder: 1 },
              { id: "option-2", key: "B", text: "Pilihan B", sortOrder: 2 },
            ],
          },
        ],
      }),
    ).toEqual({
      event: {
        id: "event-1",
        title: "TO Klinik Juni",
        description: "Try out aktif untuk peserta pro.",
        editorialStatus: "published",
        accessStartAt: "2026-06-01T01:00:00.000Z",
        accessEndAt: "2026-06-03T14:00:00.000Z",
        currentCycle: 2,
        updatedAt: "2026-06-05T08:30:00.000Z",
      },
      questions: [
        expect.objectContaining({
          id: "question-1",
          order: 1,
          stem: "Apa terapi awal yang paling rasional?",
          questionImagePath: "question/scheduled-events/event-1-question.png",
          questionImageUrl: "https://signed.example/question/scheduled-events/event-1-question.png",
          explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
          explanationImagePath: "explanation/scheduled-events/event-1-explanation.png",
          explanationImageUrl: "https://signed.example/explanation/scheduled-events/event-1-explanation.png",
          correctOptionKey: "B",
          blockId: "block-1",
          blockName: "Clinical Science",
          topicId: "topic-1",
          topicName: "Kardiologi",
        }),
      ],
    });
  });
});
