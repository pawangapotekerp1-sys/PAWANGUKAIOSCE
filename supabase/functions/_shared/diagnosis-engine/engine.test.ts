import { describe, expect, test } from "vitest";
import { classifyEvidenceRow, classifyAllEvidenceRows, ERROR_TAG_PRIORITY } from "./classify.ts";
import { DIAGNOSIS_CONFIG, ENGINE_VERSION } from "./config.ts";
import { runDiagnosisEngine } from "./engine.ts";
import { detectFindings } from "./findings.ts";
import { prioritizeFindings } from "./prioritize.ts";
import {
  buildRecommendationDraft,
  RECOMMENDATION_TEMPLATES,
  validateTemplateApproval,
} from "./recommend.ts";
import { renderFallbackMarkdown } from "./render.ts";
import type { EvidenceRow, Finding } from "./types.ts";
import { DiagnosisReportSchema, EvidenceRowSchema } from "./validate.ts";

function createMockRow(overrides: Partial<EvidenceRow> = {}): EvidenceRow {
  return {
    attempt_id: "att-1",
    submitted_at: "2026-10-25T10:00:00Z",
    question_id: "q-1",
    topic_id: "top-1",
    topic_name: "Farmakoterapi Kardiovaskular",
    question_text: "Pasien mengeluhkan efek samping batuk kering setelah konsumsi antihipertensi.",
    selected_option_key: "A",
    correct_option_key: "B",
    is_correct: false,
    explanation: "Penjelasan acuan resmi",
    was_ever_flagged_ragu: false,
    flagged_ragu_at_submit: false,
    time_spent_seconds: 60,
    time_spent_z_score: 0.0,
    answer_change_count: 0,
    changed_correct_to_wrong_count: 0,
    changed_wrong_to_correct_count: 0,
    session_position_ratio: 0.2,
    unreleased_scheduled_attempts: 0,
    ...overrides,
  };
}

describe("Diagnosis Engine - classify.ts & Priorities", () => {
  test("returns empty array for correct answer", () => {
    const row = createMockRow({ is_correct: true, selected_option_key: "B" });
    expect(classifyEvidenceRow(row)).toEqual([]);
  });

  test("tag miskonsepsi requires same question_id and same distractor in >= 2 attempts", () => {
    // Calling with recurringDistractorAttemptsCount = 2 on same question_id
    const row = createMockRow({
      is_correct: false,
      was_ever_flagged_ragu: false,
      selected_option_key: "C",
    });
    const tags = classifyEvidenceRow(row, { recurringDistractorAttemptsCount: 2 });
    expect(tags).toContain("miskonsepsi");
  });

  test("huruf B dipilih berulang pada soal-soal BERBEDA tidak boleh menghasilkan tag miskonsepsi", () => {
    // 3 distinct questions, all picking option B on attempt-1
    const rows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", selected_option_key: "B", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-1", question_id: "q-2", selected_option_key: "B", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-1", question_id: "q-3", selected_option_key: "B", is_correct: false, was_ever_flagged_ragu: false }),
    ];

    const { classifiedRows, tagCounts } = classifyAllEvidenceRows(rows);
    expect(tagCounts.miskonsepsi).toBe(0);
    for (const r of classifiedRows) {
      expect(r.error_tags).not.toContain("miskonsepsi");
    }
  });

  test("miskonsepsi IS tagged when same question_id has same distractor chosen in >= 2 attempts", () => {
    // Question q-1 has option B chosen in att-1 and att-2
    const rows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", selected_option_key: "B", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-1", selected_option_key: "B", is_correct: false, was_ever_flagged_ragu: false }),
    ];

    const { classifiedRows, tagCounts } = classifyAllEvidenceRows(rows);
    expect(tagCounts.miskonsepsi).toBe(2);
    expect(classifiedRows[0].error_tags).toContain("miskonsepsi");
    expect(classifiedRows[1].error_tags).toContain("miskonsepsi");
  });

  test("priority hierarchy: miskonsepsi > kehabisan_waktu > ceroboh > celah_pengetahuan", () => {
    // Row qualifies for both miskonsepsi (distractor >= 2) AND kehabisan_waktu (pos 0.9, 15s)
    const row = createMockRow({
      is_correct: false,
      was_ever_flagged_ragu: false,
      session_position_ratio: 0.9,
      time_spent_seconds: 15,
      time_spent_z_score: -1.2, // also ceroboh
    });

    const tags = classifyEvidenceRow(row, { recurringDistractorAttemptsCount: 2 });
    expect(tags[0]).toBe("miskonsepsi");
    expect(tags[1]).toBe("kehabisan_waktu");
    expect(tags[2]).toBe("ceroboh");

    // Check ERROR_TAG_PRIORITY definition
    expect(ERROR_TAG_PRIORITY).toEqual([
      "miskonsepsi",
      "kehabisan_waktu",
      "ceroboh",
      "celah_pengetahuan",
    ]);
  });

  test("uses flagged_ragu_at_submit for scheduled tryout when was_ever_flagged_ragu is null", () => {
    const scheduledRowRagu = createMockRow({
      was_ever_flagged_ragu: null,
      flagged_ragu_at_submit: true,
      time_spent_seconds: null,
      time_spent_z_score: null,
    });
    expect(classifyEvidenceRow(scheduledRowRagu)).toContain("celah_pengetahuan");

    const scheduledRowConfident = createMockRow({
      was_ever_flagged_ragu: null,
      flagged_ragu_at_submit: false,
      time_spent_seconds: null,
      time_spent_z_score: null,
    });
    // With distractor >= 2 attempts on same question, confident scheduled row receives miskonsepsi
    expect(classifyEvidenceRow(scheduledRowConfident, { recurringDistractorAttemptsCount: 2 })).toContain("miskonsepsi");
  });
});

describe("Diagnosis Engine - recommend.ts Revised Copy", () => {
  test("all templates remain 'draft' and satisfy revised pedagogical guidelines", () => {
    for (const [code, tpl] of Object.entries(RECOMMENDATION_TEMPLATES)) {
      expect(tpl.templateId).toBeDefined();
      expect(tpl.code).toBe(code);
      expect(tpl.status).toBe("draft"); // Tetap draft per instruksi

      const text = tpl.renderText({
        topicName: "Kardiovaskular",
        optionKey: "B",
        count: 3,
        questionSummary: "Antihipertensi batuk kering",
        accuracy: 45,
        attemptCount: 3,
        sampleStatus: "sampel utama",
        isConsecutive: true,
        ratio: 8,
        dropPercentage: 25,
        changedCorrectToWrong: 4,
        changedWrongToCorrect: 1,
        doubtfulRatio: 35,
        initialAccuracy: 30,
        latestAccuracy: 65,
      });

      expect(text).not.toContain("[DRAFT]");
      expect(text).not.toContain("DRAFT");

      // Verify specific phrase revisions per item 4:
      if (code === "CONFIDENT_ERRORS_TOPIC") {
        expect(text).not.toContain("intuisi awal");
        expect(text).toContain("Cocokkan jawaban Anda dengan pembahasan resmi dan catat konsep yang meleset");
      }
      if (code === "NET_ANSWER_CHANGE") {
        expect(text).not.toContain("pilihan pertama umumnya");
        expect(text).toContain("Dalam data Anda, perubahan jawaban dari benar ke salah");
        expect(text).toContain("ubah pilihan jawaban hanya bila Anda menemukan alasan atau data konkret");
      }
      if (code === "LATE_SESSION_DROP") {
        expect(text).not.toContain("pernapasan");
        expect(text).toContain("dapat terkait kelelahan kognitif, keterbatasan sisa waktu, atau tingkat kesulitan butir soal di akhir sesi");
        expect(text).toContain("latihan simulasi blok penuh dan menerapkan pembagian alokasi waktu yang konsisten");
      }
      if (code === "RUSHED_WRONG") {
        expect(text).not.toContain("30–45 detik");
        expect(text).toContain("baca ulang inti pertanyaan dan kata kunci dalam skenario soal sebelum menetapkan pilihan jawaban");
      }
      if (code === "IMPROVING") {
        expect(text).toContain("Pertahankan pola belajar Anda pada topik ini");
      }
      if (code === "RECURRING_DISTRACTOR") {
        expect(text).toContain("Antihipertensi batuk kering");
      }
    }
  });

  test("validateTemplateApproval throws in production mode when drafts exist", () => {
    expect(() => validateTemplateApproval(true)).toThrowError(/PRODUCTION CHECK FAILED/);
    expect(() => validateTemplateApproval(false)).not.toThrow();
  });
});

describe("Diagnosis Engine - Findings Detectors & Revised Triggers", () => {
  test("RECURRING_DISTRACTOR triggers ONLY on same question_id in >= 2 attempts (not across different questions)", () => {
    // Case 1: Different questions picking 'B' -> NO finding
    const diffQuestions: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", selected_option_key: "B", is_correct: false }),
      createMockRow({ attempt_id: "att-1", question_id: "q-2", selected_option_key: "B", is_correct: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-3", selected_option_key: "B", is_correct: false }),
    ];
    expect(detectFindings(diffQuestions).find((f) => f.code === "RECURRING_DISTRACTOR")).toBeUndefined();

    // Case 2: Same question q-1 picking 'B' across att-1 and att-2 -> TRIGGERS finding with question snippet
    const sameQuestion: EvidenceRow[] = [
      createMockRow({
        attempt_id: "att-1",
        question_id: "q-1",
        question_text: "Pasien mengeluhkan efek samping batuk kering setelah konsumsi antihipertensi.",
        selected_option_key: "B",
        is_correct: false,
      }),
      createMockRow({
        attempt_id: "att-2",
        question_id: "q-1",
        question_text: "Pasien mengeluhkan efek samping batuk kering setelah konsumsi antihipertensi.",
        selected_option_key: "B",
        is_correct: false,
      }),
    ];

    const fnd = detectFindings(sameQuestion).find((f) => f.code === "RECURRING_DISTRACTOR");
    expect(fnd).toBeDefined();
    expect(fnd?.recommendationDraft).toContain("batuk kering");
    expect(fnd?.evidenceSummary).toContain("batuk kering");
  });

  test("FRAGILE_KNOWLEDGE triggers when >= 30% of CORRECT answers are marked doubtful with topic sample >= 10", () => {
    // 10 questions total on topic: 6 correct (2 doubtful, 4 confident) -> 2/6 = 33.3% >= 30%
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 2 }, (_, i) =>
        createMockRow({ question_id: `q-corr-ragu-${i}`, is_correct: true, was_ever_flagged_ragu: true }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        createMockRow({ question_id: `q-corr-conf-${i}`, is_correct: true, was_ever_flagged_ragu: false }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        createMockRow({ question_id: `q-wrong-${i}`, is_correct: false, was_ever_flagged_ragu: false }),
      ),
    ];

    const fnd = detectFindings(rows).find((f) => f.code === "FRAGILE_KNOWLEDGE");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.doubtfulRatio).toBe(33);
    expect(fnd?.evidenceSummary).toContain("33% jawaban benar pada topik ini ditandai ragu-ragu");
  });

  test("PERSISTENT_WEAKNESS respects topic sample gate (>= 10 questions) and tracks consecutive status", () => {
    // Only 6 questions (< 10) -> should NOT trigger even if accuracy is low across 2 attempts
    const smallRows: EvidenceRow[] = [
      ...Array.from({ length: 3 }, (_, i) =>
        createMockRow({ attempt_id: "att-1", question_id: `q-${i}`, is_correct: false }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        createMockRow({ attempt_id: "att-2", question_id: `q-${i + 3}`, is_correct: false }),
      ),
    ];
    expect(detectFindings(smallRows).find((f) => f.code === "PERSISTENT_WEAKNESS")).toBeUndefined();

    // 10 questions (>= 10 indicative threshold) across 2 consecutive attempts with accuracy < 60%
    const validRows: EvidenceRow[] = [
      ...Array.from({ length: 5 }, (_, i) =>
        createMockRow({ attempt_id: "att-1", submitted_at: "2026-10-01T00:00:00Z", question_id: `q-${i}`, is_correct: i === 0 }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        createMockRow({ attempt_id: "att-2", submitted_at: "2026-10-05T00:00:00Z", question_id: `q-${i + 5}`, is_correct: i === 0 }),
      ),
    ];

    const fnd = detectFindings(validRows).find((f) => f.code === "PERSISTENT_WEAKNESS");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.sampleStatus).toBe("sampel indikatif");
    expect(fnd?.metadata.isConsecutive).toBe(true);
    expect(fnd?.recommendationDraft).toContain("berurutan");
  });

  test("RUSHED_WRONG triggers when proportion of rushed wrong items is >= 5% of global questions (>= 100)", () => {
    // 100 global questions, 6 rushed wrong items -> 6% >= 5%
    const rows: EvidenceRow[] = Array.from({ length: 100 }, (_, i) =>
      createMockRow({
        question_id: `q-${i}`,
        is_correct: i >= 6,
        time_spent_z_score: i < 6 ? -1.2 : 0.1,
        was_ever_flagged_ragu: false,
      }),
    );

    const fnd = detectFindings(rows).find((f) => f.code === "RUSHED_WRONG");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.ratio).toBe(6);
    expect(fnd?.recommendationDraft).toContain("6% dari total soal");
  });

  test("LATE_SESSION_DROP calculates percentage points drop >= 20 on >= 100 questions", () => {
    // 100 questions: 80 early/mid (pos < 0.75) with 80% acc; 20 late (pos >= 0.75) with 50% acc
    // Drop = 80 - 50 = 30 percentage points >= 20
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 80 }, (_, i) =>
        createMockRow({
          question_id: `q-early-${i}`,
          session_position_ratio: 0.009 * i, // max 0.009 * 79 = 0.711 (< 0.75)
          is_correct: i < 64, // 64/80 = 80%
        }),
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        createMockRow({
          question_id: `q-late-${i}`,
          session_position_ratio: 0.8 + 0.009 * i, // min 0.8 (>= 0.75)
          is_correct: i < 10, // 10/20 = 50%
        }),
      ),
    ];

    const fnd = detectFindings(rows).find((f) => f.code === "LATE_SESSION_DROP");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.dropPercentage).toBe(30);
    expect(fnd?.recommendationDraft).toContain("30 poin persentase");
  });
});

describe("Diagnosis Engine - Determinism, Invariance & Tie-Break", () => {
  test("determinism: 2 runs on identical data produce identical report", () => {
    const dataset: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", topic_id: "top-1", selected_option_key: "A", is_correct: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-1", topic_id: "top-1", selected_option_key: "A", is_correct: false }),
      createMockRow({ attempt_id: "att-3", question_id: "q-2", topic_id: "top-2", is_correct: true }),
    ];

    const report1 = runDiagnosisEngine(dataset);
    const report2 = runDiagnosisEngine(dataset);

    expect({ ...report1, generatedAt: "" }).toEqual({ ...report2, generatedAt: "" });
  });

  test("order invariance: shuffled input rows array produces identical output", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", topic_id: "top-1", selected_option_key: "A", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-1", topic_id: "top-1", selected_option_key: "A", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-1", question_id: "q-2", topic_id: "top-2", selected_option_key: "B", is_correct: true }),
      createMockRow({ attempt_id: "att-3", question_id: "q-3", topic_id: "top-3", selected_option_key: "C", is_correct: true }),
    ];

    const shuffled = [rows[2], rows[0], rows[3], rows[1]];

    const reportA = runDiagnosisEngine(rows);
    const reportB = runDiagnosisEngine(shuffled);

    expect(reportA.overallAccuracy).toBe(reportB.overallAccuracy);
    expect(reportA.totalQuestions).toBe(reportB.totalQuestions);
    expect(reportA.classifiedErrorCounts).toEqual(reportB.classifiedErrorCounts);
    expect(reportA.findings.map((f) => f.id)).toEqual(reportB.findings.map((f) => f.id));
    expect(reportA.topFindings.map((f) => f.id)).toEqual(reportB.topFindings.map((f) => f.id));
    expect(reportA.fallbackMarkdown).toBe(reportB.fallbackMarkdown);
  });

  test("tie-break: by topicId ASC (NOT topicName)", () => {
    const findingA: Finding = {
      id: "fnd-2",
      code: "CONFIDENT_ERRORS_TOPIC",
      title: "Finding A",
      topicId: "00000000-0000-0000-0000-000000000002",
      topicName: "AAA (Topic Name with AAA)",
      severity: 4,
      persistence: 3,
      confidence: 4,
      topicWeight: 1.0,
      urgencyScore: 48,
      evidenceSummary: "summary",
      recommendationTemplateId: "tpl-1",
      recommendationTemplateStatus: "draft",
      recommendationDraft: "draft",
      metadata: {},
    };

    const findingB: Finding = {
      id: "fnd-1",
      code: "CONFIDENT_ERRORS_TOPIC",
      title: "Finding B",
      topicId: "00000000-0000-0000-0000-000000000001",
      topicName: "ZZZ (Topic Name with ZZZ)",
      severity: 4,
      persistence: 3,
      confidence: 4,
      topicWeight: 1.0,
      urgencyScore: 48,
      evidenceSummary: "summary",
      recommendationTemplateId: "tpl-1",
      recommendationTemplateStatus: "draft",
      recommendationDraft: "draft",
      metadata: {},
    };

    const prioritized = prioritizeFindings([findingA, findingB]);
    expect(prioritized[0].topicId).toBe("00000000-0000-0000-0000-000000000001");
    expect(prioritized[1].topicId).toBe("00000000-0000-0000-0000-000000000002");
  });

  test("validates report against Zod schema", () => {
    const rows = [
      createMockRow({ question_id: "q-1", is_correct: true }),
      createMockRow({ question_id: "q-2", is_correct: false }),
    ];
    const report = runDiagnosisEngine(rows);
    const parsed = DiagnosisReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
  });
});
