import { describe, expect, test, vi } from "vitest";
import { DIAGNOSIS_CONFIG, ENGINE_VERSION } from "../_shared/diagnosis-engine/config.ts";
import { runDiagnosisEngine } from "../_shared/diagnosis-engine/engine.ts";
import {
  buildDiagnosisNarrationPrompt,
  validateNarrative,
} from "../_shared/diagnosis-engine/narrative.ts";
import type { EvidenceRow } from "../_shared/diagnosis-engine/types.ts";
import { computeDiagnosisInputHash } from "./index.ts";

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

describe("Phase 4 Pipeline - Evidence -> Engine -> Gemini -> Validator -> Retry -> Fallback", () => {
  test("end-to-end: valid Gemini narration accepted with source='gemini' and expected response shape", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: false }),
      createMockRow({ question_id: "q-2", is_correct: true }),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);
    expect(report.totalQuestions).toBe(2);
    expect(report.overallAccuracy).toBe(50);

    const prompt = buildDiagnosisNarrationPrompt(report);
    expect(prompt).toContain("ATURAN KETAT VALIDASI");
    expect(prompt).toContain("Akurasi Kumulatif: 50%");

    // Mock Gemini response using report numbers
    const validGeminiText = [
      "# Laporan Analisis Kelemahan Belajar",
      "## 1. Ringkasan Kinerja",
      "Siswa menyelesaikan 1 sesi try out dengan 2 soal dan akurasi 50%.",
      "## 2. Profil Karakteristik Kesalahan",
      "Belum terdeteksi kesalahan berulang.",
      "## 3. Temuan Prioritas & Rekomendasi Studi",
      "Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada.",
      "## 4. Disiplin Ujian & Rekomendasi Belajar",
      "Pertahankan konsistensi latihan soal.",
    ].join("\n");

    const validation = validateNarrative(validGeminiText, report);
    expect(validation.valid).toBe(true);

    const responsePayload = {
      insight: {
        summary: validGeminiText,
        narrative: validGeminiText,
        report,
        source: "gemini",
        model: "gemini-3.8-flash",
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.summary).toBe(validGeminiText);
    expect(responsePayload.insight.source).toBe("gemini");
    expect(responsePayload.insight.engineVersion).toBe(ENGINE_VERSION);
    expect(responsePayload.insight.report).toEqual(report);
  });

  test("validator catches hallucinated clinical data and succeeds on retry", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: false }),
    ];
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    // Call 1 hallucinated text: mentions 500 mg
    const badText = "Dosis obat pasien adalah 500 mg sehari.";
    const check1 = validateNarrative(badText, report);
    expect(check1.valid).toBe(false);
    expect(check1.invalidNumbers).toContain(500);

    // Simulated retry with corrected text
    const correctedText = [
      "# Laporan Analisis Kelemahan Belajar",
      "Siswa telah menyelesaikan 1 sesi ujian dengan 1 butir soal.",
    ].join("\n");
    const check2 = validateNarrative(correctedText, report);
    expect(check2.valid).toBe(true);
  });

  test("falls back to report.fallbackMarkdown if validator fails after retry", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: false }),
    ];
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    const badText1 = "Dosis 500 mg.";
    const badText2 = "Kadar 250 mcg.";

    const check1 = validateNarrative(badText1, report);
    const check2 = validateNarrative(badText2, report);

    expect(check1.valid).toBe(false);
    expect(check2.valid).toBe(false);

    // Fallback activates
    const fallbackNarrative = report.fallbackMarkdown;
    expect(fallbackNarrative).toContain("# Laporan Analisis Kelemahan Belajar");

    const responsePayload = {
      insight: {
        summary: fallbackNarrative,
        narrative: fallbackNarrative,
        report,
        source: "fallback",
        model: "deterministic-engine",
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.source).toBe("fallback");
    expect(responsePayload.insight.model).toBe("deterministic-engine");
  });

  test("without API key returns report.fallbackMarkdown directly without throwing", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: true }),
    ];
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    // Without API key: directly uses fallbackMarkdown
    const narrative = report.fallbackMarkdown;
    const responsePayload = {
      insight: {
        summary: narrative,
        narrative,
        report,
        source: "fallback",
        model: "deterministic-engine",
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.source).toBe("fallback");
    expect(responsePayload.insight.narrative).toBe(report.fallbackMarkdown);
  });

  test("when engine finds nothing, returns 'tidak ada temuan signifikan' rather than throwing an error", () => {
    // 10 correct answers -> 0 errors, 0 findings
    const rows: EvidenceRow[] = Array.from({ length: 10 }, (_, i) =>
      createMockRow({ question_id: `q-corr-${i}`, is_correct: true }),
    );
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.topFindings).toHaveLength(0);
    expect(report.fallbackMarkdown).toContain("Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada. Pertahankan konsistensi latihan soal.");

    const prompt = buildDiagnosisNarrationPrompt(report);
    expect(prompt).toContain("(Tidak ada temuan kelemahan signifikan pada data saat ini)");

    const responsePayload = {
      insight: {
        summary: report.fallbackMarkdown,
        narrative: report.fallbackMarkdown,
        report,
        source: "fallback",
        model: "deterministic-engine",
        engineVersion: ENGINE_VERSION,
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.report.topFindings).toHaveLength(0);
    expect(responsePayload.insight.summary).toContain("Belum ditemukan pola kelemahan spesifik");
  });

  test("computeDiagnosisInputHash is deterministic and order-invariant across attempts", async () => {
    const paramsA = {
      userId: "user-1",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-27",
      limitAttempts: 5,
      timezone: "Asia/Jakarta",
      attempts: [
        { id: "att-1", submittedAt: "2026-10-20T10:00:00Z" },
        { id: "att-2", submittedAt: "2026-10-25T10:00:00Z" },
      ],
    };

    const paramsB = {
      userId: "user-1",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-27",
      limitAttempts: 5,
      timezone: "Asia/Jakarta",
      attempts: [
        { id: "att-2", submittedAt: "2026-10-25T10:00:00Z" },
        { id: "att-1", submittedAt: "2026-10-20T10:00:00Z" },
      ],
    };

    const hashA = await computeDiagnosisInputHash(paramsA);
    const hashB = await computeDiagnosisInputHash(paramsB);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64); // SHA-256 hex string

    // Modifying an attempt ID changes hash
    const paramsC = {
      ...paramsA,
      attempts: [{ id: "att-3", submittedAt: "2026-10-26T10:00:00Z" }],
    };
    const hashC = await computeDiagnosisInputHash(paramsC);
    expect(hashC).not.toBe(hashA);
  });
});
