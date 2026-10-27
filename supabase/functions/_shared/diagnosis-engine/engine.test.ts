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
    selected_option_key: "A",
    correct_option_key: "B",
    is_correct: false,
    explanation: "Penjelasan acuan resmi",
    was_ever_flagged_ragu: false,
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

describe("Diagnosis Engine - classify.ts", () => {
  test("returns empty array for correct answer", () => {
    const row = createMockRow({ is_correct: true, selected_option_key: "B" });
    expect(classifyEvidenceRow(row)).toEqual([]);
  });

  test("does NOT tag miskonsepsi merely for answer change (NET_ANSWER_CHANGE handles this)", () => {
    // Per requirement: miskonsepsi = salah, tidak ragu, pengecoh sama >= 2 kali.
    // changed_correct_to_wrong_count alone does NOT trigger miskonsepsi.
    const row = createMockRow({ changed_correct_to_wrong_count: 1 });
    const tags = classifyEvidenceRow(row, { recurringDistractorCount: 1 });
    expect(tags).not.toContain("miskonsepsi");
  });

  test("tags miskonsepsi when wrong, not doubtful, and distractor selected >= 2 times in topic", () => {
    const row = createMockRow({
      is_correct: false,
      was_ever_flagged_ragu: false,
      selected_option_key: "C",
    });
    const tags = classifyEvidenceRow(row, { recurringDistractorCount: 2 });
    expect(tags).toContain("miskonsepsi");
  });

  test("does NOT tag miskonsepsi if student was doubtful", () => {
    const row = createMockRow({
      is_correct: false,
      was_ever_flagged_ragu: true, // student was hesitant
      selected_option_key: "C",
    });
    const tags = classifyEvidenceRow(row, { recurringDistractorCount: 3 });
    expect(tags).not.toContain("miskonsepsi");
    expect(tags).toContain("celah_pengetahuan");
  });

  test("tags celah_pengetahuan when question is flagged ragu or thinking time > slowZScore", () => {
    const raguRow = createMockRow({ was_ever_flagged_ragu: true });
    expect(classifyEvidenceRow(raguRow)).toContain("celah_pengetahuan");

    const slowRow = createMockRow({ time_spent_z_score: 1.5, was_ever_flagged_ragu: false });
    expect(classifyEvidenceRow(slowRow)).toContain("celah_pengetahuan");
  });

  test("tags ceroboh when question is answered very fast (z < rushedZScore) without ragu", () => {
    const row = createMockRow({ time_spent_z_score: -1.2, was_ever_flagged_ragu: false });
    const tags = classifyEvidenceRow(row);
    expect(tags).toContain("ceroboh");
    expect(tags).not.toContain("celah_pengetahuan");
  });

  test("tags kehabisan_waktu on late session questions with short duration", () => {
    const row = createMockRow({
      session_position_ratio: 0.92,
      time_spent_seconds: 12,
    });
    const tags = classifyEvidenceRow(row);
    expect(tags).toContain("kehabisan_waktu");
  });

  test("enforces priority hierarchy when multiple tags match", () => {
    // Row matches kehabisan_waktu (pos 0.92, 12s) AND ceroboh (z -1.2, not ragu)
    const row = createMockRow({
      session_position_ratio: 0.92,
      time_spent_seconds: 12,
      time_spent_z_score: -1.2,
      was_ever_flagged_ragu: false,
    });
    const tags = classifyEvidenceRow(row);
    expect(tags[0]).toBe("kehabisan_waktu");
    expect(tags[1]).toBe("ceroboh");
  });

  test("safely handles null telemetry on scheduled attempt items", () => {
    const scheduledRow = createMockRow({
      time_spent_seconds: null,
      time_spent_z_score: null,
      was_ever_flagged_ragu: null,
      answer_change_count: null,
      changed_correct_to_wrong_count: null,
      changed_wrong_to_correct_count: null,
      session_position_ratio: null,
    });

    const tags = classifyEvidenceRow(scheduledRow);
    expect(tags).toEqual([]); // All behavioral tags safely skipped
  });
});

describe("Diagnosis Engine - recommend.ts", () => {
  test("all templates have metadata and do NOT contain [DRAFT] prefix", () => {
    for (const [code, tpl] of Object.entries(RECOMMENDATION_TEMPLATES)) {
      expect(tpl.templateId).toBeDefined();
      expect(tpl.code).toBe(code);
      expect(tpl.status).toBe("draft");
      expect(tpl.triggerCondition).toBeTruthy();

      const text = tpl.renderText({ topicName: "Kardio", optionKey: "A", count: 3 });
      expect(text).not.toContain("[DRAFT]");
      expect(text).not.toContain("DRAFT");
    }
  });

  test("validateTemplateApproval throws in production mode when drafts exist", () => {
    expect(() => validateTemplateApproval(true)).toThrowError(/PRODUCTION CHECK FAILED/);
    expect(() => validateTemplateApproval(false)).not.toThrow();
  });
});

describe("Diagnosis Engine - render.ts", () => {
  test("does NOT include the word DRAFT in fallback markdown", () => {
    const mockFinding: Finding = {
      id: "f-1",
      code: "CONFIDENT_ERRORS_TOPIC",
      title: "Kesalahan Tanpa Ragu",
      topicId: "top-1",
      topicName: "Farmakoterapi",
      severity: 4,
      persistence: 3,
      confidence: 4,
      topicWeight: 1.0,
      urgencyScore: 48,
      evidenceSummary: "3 kesalahan tanpa ragu",
      recommendationTemplateId: "TPL_CONFIDENT_ERRORS_V1",
      recommendationTemplateStatus: "draft",
      recommendationDraft: "Rekalibrasi Keyakinan Jawaban pada topik Farmakoterapi.",
      metadata: {},
    };

    const markdown = renderFallbackMarkdown({
      version: ENGINE_VERSION,
      generatedAt: "2026-10-27T10:00:00Z",
      mode: "full",
      totalAttempts: 2,
      totalQuestions: 20,
      overallAccuracy: 65,
      unreleasedScheduledAttemptsCount: 0,
      classifiedErrorCounts: {
        kehabisan_waktu: 0,
        ceroboh: 1,
        miskonsepsi: 1,
        celah_pengetahuan: 2,
      },
      findings: [mockFinding],
      topFindings: [mockFinding],
      fallbackMarkdown: "",
    });

    expect(markdown).not.toMatch(/draft/i);
    expect(markdown).toContain("## 3. Temuan Prioritas & Rekomendasi Studi");
    expect(markdown).toContain("- **Rekomendasi Tindakan:**");
  });

  test("renders prominent notice when unreleased scheduled attempts exist", () => {
    const markdown = renderFallbackMarkdown({
      version: ENGINE_VERSION,
      generatedAt: "2026-10-27T10:00:00Z",
      mode: "basic",
      totalAttempts: 1,
      totalQuestions: 10,
      overallAccuracy: 70,
      unreleasedScheduledAttemptsCount: 2,
      classifiedErrorCounts: {
        kehabisan_waktu: 0,
        ceroboh: 0,
        miskonsepsi: 0,
        celah_pengetahuan: 0,
      },
      findings: [],
      topFindings: [],
      fallbackMarkdown: "",
    });

    expect(markdown).toContain("Catatan Try Out Terjadwal");
    expect(markdown).toContain("Terdapat 2 sesi try out terjadwal yang belum disertakan");
  });
});

describe("Diagnosis Engine - Sample Minimums & Gating", () => {
  test("global behavioral findings require >= 100 global questions", () => {
    // 30 questions with rushed z-score < -0.8
    const smallBatch: EvidenceRow[] = Array.from({ length: 30 }, (_, i) =>
      createMockRow({
        question_id: `q-${i}`,
        is_correct: false,
        time_spent_z_score: -1.2,
        was_ever_flagged_ragu: false,
      }),
    );

    const findingsSmall = detectFindings(smallBatch);
    expect(findingsSmall.find((f) => f.code === "RUSHED_WRONG")).toBeUndefined();

    // 100 questions with rushed z-score
    const largeBatch: EvidenceRow[] = Array.from({ length: 100 }, (_, i) =>
      createMockRow({
        question_id: `q-${i}`,
        is_correct: i < 5 ? false : true,
        time_spent_z_score: i < 5 ? -1.2 : 0.0,
        was_ever_flagged_ragu: false,
      }),
    );

    const findingsLarge = detectFindings(largeBatch);
    expect(findingsLarge.find((f) => f.code === "RUSHED_WRONG")).toBeDefined();
  });

  test("RECURRING_DISTRACTOR requires count >= 3 across >= 2 distinct tryouts", () => {
    // Same tryout att-1, 3 times -> should NOT trigger (only 1 tryout)
    const singleTryoutRows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", selected_option_key: "C" }),
      createMockRow({ attempt_id: "att-1", question_id: "q-2", selected_option_key: "C" }),
      createMockRow({ attempt_id: "att-1", question_id: "q-3", selected_option_key: "C" }),
    ];
    expect(detectFindings(singleTryoutRows).find((f) => f.code === "RECURRING_DISTRACTOR")).toBeUndefined();

    // 2 distinct tryouts, 3 times total -> SHOULD trigger
    const multiTryoutRows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", selected_option_key: "C" }),
      createMockRow({ attempt_id: "att-2", question_id: "q-2", selected_option_key: "C" }),
      createMockRow({ attempt_id: "att-2", question_id: "q-3", selected_option_key: "C" }),
    ];
    const fnd = detectFindings(multiTryoutRows).find((f) => f.code === "RECURRING_DISTRACTOR");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.count).toBe(3);
    expect(fnd?.metadata.distinctTryouts).toBe(2);
  });

  test("IMPROVING requires >= 10 questions per period", () => {
    // Only 5 questions early and 5 questions late -> should NOT trigger
    const smallTrend: EvidenceRow[] = [
      ...Array.from({ length: 5 }, (_, i) =>
        createMockRow({ attempt_id: "att-1", submitted_at: "2026-10-01T00:00:00Z", is_correct: false }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        createMockRow({ attempt_id: "att-2", submitted_at: "2026-10-10T00:00:00Z", is_correct: true }),
      ),
    ];
    expect(detectFindings(smallTrend).find((f) => f.code === "IMPROVING")).toBeUndefined();

    // 10 questions early (20% acc) and 10 questions late (80% acc) -> SHOULD trigger
    const validTrend: EvidenceRow[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        createMockRow({ attempt_id: "att-1", submitted_at: "2026-10-01T00:00:00Z", is_correct: i < 2 }),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        createMockRow({ attempt_id: "att-2", submitted_at: "2026-10-10T00:00:00Z", is_correct: i < 8 }),
      ),
    ];
    const impFnd = detectFindings(validTrend).find((f) => f.code === "IMPROVING");
    expect(impFnd).toBeDefined();
    expect(impFnd?.metadata.initialAccuracy).toBe(20);
    expect(impFnd?.metadata.latestAccuracy).toBe(80);
  });
});

describe("Diagnosis Engine - Determinism & Invariance", () => {
  test("2 runs on identical data produce identical report", () => {
    const dataset: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", topic_id: "top-1", selected_option_key: "A", is_correct: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-2", topic_id: "top-1", selected_option_key: "A", is_correct: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-3", topic_id: "top-1", selected_option_key: "A", is_correct: false }),
      createMockRow({ attempt_id: "att-3", question_id: "q-4", topic_id: "top-2", is_correct: true }),
    ];

    const report1 = runDiagnosisEngine(dataset);
    const report2 = runDiagnosisEngine(dataset);

    // Exclude dynamic generatedAt timestamp
    expect({ ...report1, generatedAt: "" }).toEqual({ ...report2, generatedAt: "" });
  });

  test("order invariance: shuffled input rows array produces identical output", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", topic_id: "top-1", selected_option_key: "A", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-2", topic_id: "top-1", selected_option_key: "A", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-3", topic_id: "top-1", selected_option_key: "A", is_correct: false, was_ever_flagged_ragu: false }),
      createMockRow({ attempt_id: "att-1", question_id: "q-4", topic_id: "top-2", selected_option_key: "B", is_correct: true }),
      createMockRow({ attempt_id: "att-3", question_id: "q-5", topic_id: "top-3", selected_option_key: "C", is_correct: true }),
    ];

    // Reverse and pseudo-shuffle
    const shuffledRows = [rows[3], rows[0], rows[4], rows[2], rows[1]];

    const reportOriginal = runDiagnosisEngine(rows);
    const reportShuffled = runDiagnosisEngine(shuffledRows);

    expect(reportOriginal.overallAccuracy).toBe(reportShuffled.overallAccuracy);
    expect(reportOriginal.totalQuestions).toBe(reportShuffled.totalQuestions);
    expect(reportOriginal.classifiedErrorCounts).toEqual(reportShuffled.classifiedErrorCounts);
    expect(reportOriginal.findings.map((f) => f.id)).toEqual(reportShuffled.findings.map((f) => f.id));
    expect(reportOriginal.topFindings.map((f) => f.id)).toEqual(reportShuffled.topFindings.map((f) => f.id));
    expect(reportOriginal.fallbackMarkdown).toBe(reportShuffled.fallbackMarkdown);
  });

  test("tie-break: when urgencyScore and code match, tie-break by topicId ASC (NOT topicName)", () => {
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

    // Even though findingA has topicName 'AAA', findingB has topicId '...0001' which precedes '...0002'
    const prioritized = prioritizeFindings([findingA, findingB]);
    expect(prioritized[0].topicId).toBe("00000000-0000-0000-0000-000000000001");
    expect(prioritized[1].topicId).toBe("00000000-0000-0000-0000-000000000002");
  });

  test("validates report output against Zod schema", () => {
    const rows = [
      createMockRow({ question_id: "q-1", is_correct: true }),
      createMockRow({ question_id: "q-2", is_correct: false }),
    ];
    const report = runDiagnosisEngine(rows);
    const parsed = DiagnosisReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
  });
});
