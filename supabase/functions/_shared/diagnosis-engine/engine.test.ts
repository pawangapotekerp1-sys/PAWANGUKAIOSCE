import { describe, expect, test } from "vitest";
import { classifyEvidenceRow, classifyAllEvidenceRows } from "./classify.ts";
import { DIAGNOSIS_CONFIG } from "./config.ts";
import { runDiagnosisEngine } from "./engine.ts";
import { detectFindings } from "./findings.ts";
import { prioritizeFindings } from "./prioritize.ts";
import { buildRecommendationDraft } from "./recommend.ts";
import { renderFallbackMarkdown } from "./render.ts";
import type { EvidenceRow, Finding } from "./types.ts";
import { DiagnosisReportSchema } from "./validate.ts";

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
    ...overrides,
  };
}

describe("Diagnosis Engine - classify.ts", () => {
  test("returns empty array for correct answer", () => {
    const row = createMockRow({ is_correct: true, selected_option_key: "B" });
    expect(classifyEvidenceRow(row)).toEqual([]);
  });

  test("tags miskonsepsi when correct answer was changed to wrong", () => {
    const row = createMockRow({ changed_correct_to_wrong_count: 1 });
    const tags = classifyEvidenceRow(row);
    expect(tags).toContain("miskonsepsi");
  });

  test("tags celah_pengetahuan when question is flagged ragu or thinking time > 1.0 z-score", () => {
    const raguRow = createMockRow({ was_ever_flagged_ragu: true });
    expect(classifyEvidenceRow(raguRow)).toContain("celah_pengetahuan");

    const slowRow = createMockRow({ time_spent_z_score: 1.5, was_ever_flagged_ragu: false });
    expect(classifyEvidenceRow(slowRow)).toContain("celah_pengetahuan");
  });

  test("tags ceroboh when question is answered very fast without ragu", () => {
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
});

describe("Diagnosis Engine - findings.ts", () => {
  test("detects RECURRING_DISTRACTOR when same wrong option is picked >= 2 times in topic", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", selected_option_key: "C", correct_option_key: "A" }),
      createMockRow({ question_id: "q-2", selected_option_key: "C", correct_option_key: "B" }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "RECURRING_DISTRACTOR");
    expect(fnd).toBeDefined();
    expect(fnd?.topicName).toBe("Farmakoterapi Kardiovaskular");
    expect(fnd?.metadata.optionKey).toBe("C");
    expect(fnd?.recommendationDraft).toContain("[DRAFT]");
  });

  test("detects CONFIDENT_ERRORS_TOPIC when >= 3 errors occur without ragu in topic", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", was_ever_flagged_ragu: false }),
      createMockRow({ question_id: "q-2", was_ever_flagged_ragu: false }),
      createMockRow({ question_id: "q-3", was_ever_flagged_ragu: false }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "CONFIDENT_ERRORS_TOPIC");
    expect(fnd).toBeDefined();
    expect(fnd?.urgencyScore).toBeGreaterThan(0);
    expect(fnd?.recommendationDraft).toContain("[DRAFT]");
  });

  test("detects PERSISTENT_WEAKNESS across multiple attempts with low accuracy", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", question_id: "q-1", is_correct: false }),
      createMockRow({ attempt_id: "att-1", question_id: "q-2", is_correct: true }),
      createMockRow({ attempt_id: "att-2", question_id: "q-3", is_correct: false }),
      createMockRow({ attempt_id: "att-2", question_id: "q-4", is_correct: false }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "PERSISTENT_WEAKNESS");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.accuracy).toBe(25);
  });

  test("detects RUSHED_WRONG across overall questions", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", time_spent_z_score: -1.1, is_correct: false }),
      createMockRow({ question_id: "q-2", time_spent_z_score: -0.9, is_correct: false }),
      createMockRow({ question_id: "q-3", time_spent_z_score: -1.4, is_correct: false }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "RUSHED_WRONG");
    expect(fnd).toBeDefined();
  });

  test("detects LATE_SESSION_DROP when accuracy drops in last quartile", () => {
    const rows: EvidenceRow[] = [];
    // 12 early questions with 90%+ accuracy (all position < 0.75)
    for (let i = 0; i < 12; i++) {
      rows.push(createMockRow({
        question_id: `q-early-${i}`,
        session_position_ratio: 0.05 * i,
        is_correct: i !== 0,
      }));
    }
    // 4 late questions with 0% accuracy
    for (let i = 0; i < 4; i++) {
      rows.push(createMockRow({
        question_id: `q-late-${i}`,
        session_position_ratio: 0.8 + 0.05 * i,
        is_correct: false,
      }));
    }
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "LATE_SESSION_DROP");
    expect(fnd).toBeDefined();
    expect(fnd?.recommendationDraft).toContain("[DRAFT]");
  });

  test("detects NET_ANSWER_CHANGE when correct-to-wrong outweighs wrong-to-correct", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", changed_correct_to_wrong_count: 2, changed_wrong_to_correct_count: 0 }),
      createMockRow({ question_id: "q-2", changed_correct_to_wrong_count: 1, changed_wrong_to_correct_count: 0 }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "NET_ANSWER_CHANGE");
    expect(fnd).toBeDefined();
    expect(fnd?.metadata.changedCorrectToWrong).toBe(3);
  });

  test("detects FRAGILE_KNOWLEDGE when accuracy collapses under ragu", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", was_ever_flagged_ragu: false, is_correct: true }),
      createMockRow({ question_id: "q-2", was_ever_flagged_ragu: false, is_correct: true }),
      createMockRow({ question_id: "q-3", was_ever_flagged_ragu: true, is_correct: false }),
      createMockRow({ question_id: "q-4", was_ever_flagged_ragu: true, is_correct: false }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "FRAGILE_KNOWLEDGE");
    expect(fnd).toBeDefined();
  });

  test("detects IMPROVING when accuracy rises steadily across chronological attempts", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ attempt_id: "att-1", submitted_at: "2026-10-01T10:00:00Z", is_correct: false }),
      createMockRow({ attempt_id: "att-1", submitted_at: "2026-10-01T10:00:00Z", is_correct: false }),
      createMockRow({ attempt_id: "att-2", submitted_at: "2026-10-15T10:00:00Z", is_correct: true }),
      createMockRow({ attempt_id: "att-2", submitted_at: "2026-10-15T10:00:00Z", is_correct: true }),
    ];
    const findings = detectFindings(rows);
    const fnd = findings.find((f) => f.code === "IMPROVING");
    expect(fnd).toBeDefined();
    expect(fnd?.recommendationDraft).toContain("[DRAFT]");
  });
});

describe("Diagnosis Engine - prioritize.ts", () => {
  test("ranks findings strictly by urgencyScore descending", () => {
    const findings: Finding[] = [
      {
        id: "f1",
        code: "RUSHED_WRONG",
        title: "T1",
        severity: 3,
        persistence: 2,
        confidence: 3,
        topicWeight: 1,
        urgencyScore: 18,
        evidenceSummary: "",
        recommendationTemplateId: "",
        recommendationDraft: "",
        metadata: {},
      },
      {
        id: "f2",
        code: "PERSISTENT_WEAKNESS",
        title: "T2",
        severity: 5,
        persistence: 4,
        confidence: 4,
        topicWeight: 1,
        urgencyScore: 80,
        evidenceSummary: "",
        recommendationTemplateId: "",
        recommendationDraft: "",
        metadata: {},
      },
    ];

    const prioritized = prioritizeFindings(findings);
    expect(prioritized[0].id).toBe("f2");
    expect(prioritized[1].id).toBe("f1");
  });

  test("resolves score ties deterministically by code ASC then topicName ASC", () => {
    const findings: Finding[] = [
      {
        id: "f-rushed",
        code: "RUSHED_WRONG",
        title: "Rushed",
        topicName: "Farmakoterapi",
        severity: 3,
        persistence: 3,
        confidence: 3,
        topicWeight: 1,
        urgencyScore: 27,
        evidenceSummary: "",
        recommendationTemplateId: "",
        recommendationDraft: "",
        metadata: {},
      },
      {
        id: "f-distractor-b",
        code: "RECURRING_DISTRACTOR",
        title: "Distractor B",
        topicName: "Kimia Medisinal",
        severity: 3,
        persistence: 3,
        confidence: 3,
        topicWeight: 1,
        urgencyScore: 27,
        evidenceSummary: "",
        recommendationTemplateId: "",
        recommendationDraft: "",
        metadata: {},
      },
      {
        id: "f-distractor-a",
        code: "RECURRING_DISTRACTOR",
        title: "Distractor A",
        topicName: "Farmakologi Dasar",
        severity: 3,
        persistence: 3,
        confidence: 3,
        topicWeight: 1,
        urgencyScore: 27,
        evidenceSummary: "",
        recommendationTemplateId: "",
        recommendationDraft: "",
        metadata: {},
      },
    ];

    const prioritized = prioritizeFindings(findings);
    // RECURRING_DISTRACTOR comes before RUSHED_WRONG alphabetically
    // Farmakologi Dasar comes before Kimia Medisinal alphabetically
    expect(prioritized[0].id).toBe("f-distractor-a");
    expect(prioritized[1].id).toBe("f-distractor-b");
    expect(prioritized[2].id).toBe("f-rushed");
  });
});

describe("Diagnosis Engine - recommend.ts", () => {
  test("all recommendation templates are prefixed with [DRAFT]", () => {
    const codes = [
      "RECURRING_DISTRACTOR",
      "CONFIDENT_ERRORS_TOPIC",
      "PERSISTENT_WEAKNESS",
      "RUSHED_WRONG",
      "LATE_SESSION_DROP",
      "NET_ANSWER_CHANGE",
      "FRAGILE_KNOWLEDGE",
      "IMPROVING",
    ] as const;

    for (const code of codes) {
      const rec = buildRecommendationDraft(code, {
        topicName: "Farmasi Klinis",
        count: 3,
        accuracy: 45,
        optionKey: "D",
      });
      expect(rec.draftText).toMatch(/^\[DRAFT\]/);
      // Ensure no invented drug dosage (e.g., mg, ml, BID, TID)
      expect(rec.draftText).not.toMatch(/\b\d+\s*(mg|mcg|ml|IU)\b/i);
    }
  });
});

describe("Diagnosis Engine - render.ts & runDiagnosisEngine", () => {
  test("handles empty evidence rows gracefully", () => {
    const report = runDiagnosisEngine([]);
    expect(report.mode).toBe("empty");
    expect(report.totalQuestions).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.topFindings).toEqual([]);
    expect(report.fallbackMarkdown).toContain("Belum ada data pengerjaan");
  });

  test("runs end-to-end deterministically and satisfies DiagnosisReportSchema", () => {
    const rows: EvidenceRow[] = [];
    // 12 questions in Farmakoterapi Kardiovaskular (meets >= 10 sample threshold)
    for (let i = 0; i < 12; i++) {
      rows.push(createMockRow({
        question_id: `q-cardio-${i}`,
        topic_id: "top-cardio",
        topic_name: "Farmakoterapi Kardiovaskular",
        is_correct: i % 2 === 0,
        selected_option_key: i % 2 === 0 ? "B" : "C",
        correct_option_key: "B",
        changed_correct_to_wrong_count: i === 1 ? 1 : 0,
        was_ever_flagged_ragu: i === 3,
        time_spent_z_score: i === 5 ? -1.2 : 0.0,
      }));
    }

    const report1 = runDiagnosisEngine(rows);
    const report2 = runDiagnosisEngine(rows);

    // Determinism test: identical outputs
    expect(report1.mode).toBe("full");
    expect(report1.totalQuestions).toBe(12);
    expect(report1.overallAccuracy).toBe(50);
    expect(report1.topFindings.length).toBeGreaterThan(0);
    expect(report1.fallbackMarkdown).toBe(report2.fallbackMarkdown);
    expect(JSON.stringify(report1.topFindings)).toBe(JSON.stringify(report2.topFindings));

    // Zod Schema validation
    const parsed = DiagnosisReportSchema.safeParse(report1);
    expect(parsed.success).toBe(true);
  });
});
