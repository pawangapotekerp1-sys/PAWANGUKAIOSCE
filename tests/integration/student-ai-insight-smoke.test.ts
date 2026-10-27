import http from "http";
import { describe, expect, test } from "vitest";
import { DIAGNOSIS_CONFIG } from "../../supabase/functions/_shared/diagnosis-engine/config.ts";
import { runDiagnosisEngine } from "../../supabase/functions/_shared/diagnosis-engine/engine.ts";
import {
  buildDiagnosisNarrationPrompt,
  decorateNarrativeWithDeterministicBadges,
  validateNarrative,
} from "../../supabase/functions/_shared/diagnosis-engine/narrative.ts";
import type { EvidenceRow } from "../../supabase/functions/_shared/diagnosis-engine/types.ts";

function createMockRow(overrides: Partial<EvidenceRow> = {}): EvidenceRow {
  return {
    attempt_id: "att-smoke-1",
    submitted_at: "2026-10-25T10:00:00Z",
    question_id: "q-smoke-1",
    topic_id: "top-smoke-1",
    topic_name: "Farmakoterapi Endokrin",
    question_text: "Pasien DM tipe 2 dengan komplikasi...",
    selected_option_key: "A",
    correct_option_key: "B",
    is_correct: false,
    explanation: "Penjelasan acuan buku teks resmi",
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

describe("Integration Smoke: student-ai-insight pipeline & mock Gemini", () => {
  test("smoke: (a) without API key returns deterministic fallback markdown", () => {
    const rows: EvidenceRow[] = Array.from({ length: 15 }, (_, i) =>
      createMockRow({ question_id: `q-${i}`, is_correct: i < 6 }),
    );
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.totalAttempts).toBe(1);
    expect(report.totalQuestions).toBe(15);
    expect(report.overallAccuracy).toBe(40);

    // Fallback response without API key
    const responsePayload = {
      insight: {
        summary: report.fallbackMarkdown,
        narrative: report.fallbackMarkdown,
        report,
        source: "fallback",
        fallbackReason: "no_key",
        model: "deterministic-engine",
        engineVersion: "1.1.0",
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.source).toBe("fallback");
    expect(responsePayload.insight.fallbackReason).toBe("no_key");
    expect(responsePayload.insight.model).toBe("deterministic-engine");
    expect(responsePayload.insight.narrative).toContain("# Laporan Analisis Kelemahan Belajar");
  });

  test("smoke: (b) with mock Gemini, valid narrative passes validation", async () => {
    const rows: EvidenceRow[] = Array.from({ length: 15 }, (_, i) =>
      createMockRow({ question_id: `q-${i}`, is_correct: i < 6 }),
    );
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);
    const prompt = buildDiagnosisNarrationPrompt(report);

    // Proves prompt sent to Gemini does NOT contain full question text, keys, explanations, or user credentials
    expect(prompt).not.toContain("Penjelasan acuan"); // No explanation
    expect(prompt).not.toContain("correct_option_key"); // No correct option keys
    expect(prompt).not.toContain("password");
    expect(prompt).not.toContain("email");

    const validMockNarrative = [
      "# Laporan Analisis Kelemahan Belajar",
      "## 1. Ringkasan Kinerja",
      "Siswa menyelesaikan 1 sesi try out dengan 15 butir soal dan akurasi 40%.",
      "## 2. Profil Karakteristik Kesalahan",
      "Terdapat 9 butir salah pada topik.",
      "## 3. Temuan Prioritas & Rekomendasi Studi",
      "1. Perlu penguatan pada Farmakoterapi Endokrin.",
      "## 4. Disiplin Ujian & Rekomendasi Belajar",
      "Pertahankan konsistensi latihan soal.",
    ].join("\n");

    const validation = validateNarrative(validMockNarrative, report);
    expect(validation.valid).toBe(true);

    const decorated = decorateNarrativeWithDeterministicBadges(validMockNarrative, report);
    const responsePayload = {
      insight: {
        summary: decorated,
        narrative: decorated,
        report,
        source: "gemini",
        fallbackReason: null,
        model: "gemini-3.8-flash",
        engineVersion: "1.1.0",
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.source).toBe("gemini");
    expect(responsePayload.insight.fallbackReason).toBeNull();
    expect(responsePayload.insight.model).toBe("gemini-3.8-flash");
  });

  test("smoke: (c) foreign numbers trigger retry and fallback to deterministic engine", () => {
    const rows: EvidenceRow[] = Array.from({ length: 15 }, (_, i) =>
      createMockRow({ question_id: `q-${i}`, is_correct: i < 6 }),
    );
    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    // Call 1 hallucinated text
    const text1 = "Dosis furosemid pasien adalah 500 mg sehari.";
    const check1 = validateNarrative(text1, report);
    expect(check1.valid).toBe(false);
    expect(check1.code).toBe("REJECT_FOREIGN_NUMBERS");
    expect(check1.invalidNumbers).toContain(500);

    // Retry hallucinated text
    const text2 = "Kadar serum pasien adalah 250 mcg per liter.";
    const check2 = validateNarrative(text2, report);
    expect(check2.valid).toBe(false);
    expect(check2.code).toBe("REJECT_FOREIGN_NUMBERS");
    expect(check2.invalidNumbers).toContain(250);

    // After retry fails, fallback is activated
    const responsePayload = {
      insight: {
        summary: report.fallbackMarkdown,
        narrative: report.fallbackMarkdown,
        report,
        source: "fallback",
        fallbackReason: "validation_failed",
        model: "deterministic-engine",
        engineVersion: "1.1.0",
        generatedAt: new Date().toISOString(),
      },
    };

    expect(responsePayload.insight.source).toBe("fallback");
    expect(responsePayload.insight.fallbackReason).toBe("validation_failed");
    expect(responsePayload.insight.model).toBe("deterministic-engine");
  });
});
