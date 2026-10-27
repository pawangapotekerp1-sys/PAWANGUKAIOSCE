import { describe, expect, test } from "vitest";
import { runDiagnosisEngine } from "./engine.ts";
import {
  buildDiagnosisNarrationPrompt,
  decorateNarrativeWithDeterministicBadges,
  extractAllowedNumbers,
  extractAllowedIds,
  validateNarrative,
} from "./narrative.ts";
import type { EvidenceRow } from "./types.ts";

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

describe("Diagnosis Engine - Narrative Prompt & Validator", () => {
  test("buildDiagnosisNarrationPrompt formats concise prompt with truncated question snippet", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: false }),
      createMockRow({ question_id: "q-2", is_correct: true }),
    ];
    const report = runDiagnosisEngine(rows);
    const prompt = buildDiagnosisNarrationPrompt(report);

    expect(prompt).toContain("ATURAN KETAT VALIDASI");
    expect(prompt).toContain("Total Sesi Try Out: 1");
    expect(prompt).toContain("Total Soal Teranalisis: 2");
    expect(prompt).toContain("Akurasi Kumulatif: 50%");
  });

  test("validateNarrative succeeds when narrative strictly uses report numbers", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: false }),
      createMockRow({ question_id: "q-2", is_correct: true }),
    ];
    const report = runDiagnosisEngine(rows);

    const validText = `
# Laporan Analisis Kelemahan Belajar
## 1. Ringkasan Kinerja
Siswa telah menyelesaikan 1 sesi try out dengan total 2 butir soal teranalisis dan akurasi kumulatif 50%.
## 2. Profil Karakteristik Kesalahan
Terdapat 0 butir miskonsepsi dan 0 butir ceroboh.
## 3. Temuan Prioritas & Rekomendasi Studi
Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada.
## 4. Disiplin Ujian & Rekomendasi Belajar
Pertahankan ritme belajar secara konsisten.
    `.trim();

    const result = validateNarrative(validText, report);
    expect(result.valid).toBe(true);
  });

  test("validateNarrative permits accuracy rounding within tolerance of <= 0.5 points", () => {
    // 3 questions: 2 correct, 1 wrong -> accuracy = 66.67%
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: true }),
      createMockRow({ question_id: "q-2", is_correct: true }),
      createMockRow({ question_id: "q-3", is_correct: false }),
    ];
    const report = runDiagnosisEngine(rows);
    expect(report.overallAccuracy).toBe(66.67);

    // Narrative rounds 66.67% to 67% (diff = 0.33 <= 0.5) -> ALLOWED
    const roundedText = `
# Laporan Analisis Kelemahan Belajar
## 1. Ringkasan Kinerja
Total 3 soal dengan akurasi 67%.
## 2. Profil Karakteristik Kesalahan
Miskonsepsi 0 butir.
## 3. Temuan Prioritas & Rekomendasi Studi
Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada.
## 4. Disiplin Ujian & Rekomendasi Belajar
Pertahankan ritme belajar.
    `.trim();

    const result = validateNarrative(roundedText, report);
    expect(result.valid).toBe(true);
  });

  test("validateNarrative supports decimal comma (e.g. 45,5% or 66,7%) and fractional expressions (3 dari 10)", () => {
    // 10 questions: 3 correct, 7 wrong -> accuracy = 30%
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 3 }, (_, i) => createMockRow({ question_id: `q-c-${i}`, is_correct: true })),
      ...Array.from({ length: 7 }, (_, i) => createMockRow({ question_id: `q-w-${i}`, is_correct: false })),
    ];
    const report = runDiagnosisEngine(rows);
    expect(report.totalQuestions).toBe(10);

    // Text using decimal comma and "3 dari 10"
    const textWithCommaAndFraction = `
# Laporan Analisis Kelemahan Belajar
## 1. Ringkasan Kinerja
Siswa menjawab benar 3 dari 10 butir soal dengan tingkat akurasi 30,0%.
## 2. Profil Karakteristik Kesalahan
Terdapat 0 butir miskonsepsi.
## 3. Temuan Prioritas & Rekomendasi Studi
Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada.
## 4. Disiplin Ujian & Rekomendasi Belajar
Konsistensi belajar perlu ditingkatkan.
    `.trim();

    const result = validateNarrative(textWithCommaAndFraction, report);
    expect(result.valid).toBe(true);
  });

  test("validateNarrative strictly rejects numbers that are only present in question summaries", () => {
    // Question text contains "45 tahun" (number 45 is NOT a report metric: attempts=1, questions=2, accuracy=50%)
    const rows: EvidenceRow[] = [
      createMockRow({
        attempt_id: "att-1",
        question_id: "q-age",
        question_text: "Pasien pria 45 tahun mengalami komplikasi renal stadium 4",
        selected_option_key: "A",
        is_correct: false,
      }),
      createMockRow({
        attempt_id: "att-1",
        question_id: "q-ok",
        is_correct: true,
      }),
    ];
    const report = runDiagnosisEngine(rows);

    // Allowed numbers should NOT contain 45
    const allowed = extractAllowedNumbers(report);
    expect(allowed.has(45)).toBe(false);

    // Narrative quoting the question text's clinical number "45"
    const textWithSummaryNumber = `
# Laporan Analisis Kelemahan Belajar
## 1. Ringkasan Kinerja
Siswa menyelesaikan 1 sesi dengan 2 butir soal dan akurasi 50%.
## 2. Profil Karakteristik Kesalahan
Miskonsepsi 0 butir.
## 3. Temuan Prioritas & Rekomendasi Studi
1. Terdapat kesalahan pada butir soal pasien usia 45 tahun.
## 4. Disiplin Ujian & Rekomendasi Belajar
Fokuskan review.
    `.trim();

    const result = validateNarrative(textWithSummaryNumber, report);
    expect(result.valid).toBe(false);
    expect(result.code).toBe("REJECT_FOREIGN_NUMBERS");
    expect(result.invalidNumbers).toContain(45);
  });

  test("validateNarrative rejects text with invented numbers not in report", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: false }),
      createMockRow({ question_id: "q-2", is_correct: true }),
    ];
    const report = runDiagnosisEngine(rows);

    // Mentions "500 mg" and "75%" which are not in the report
    const hallucinatedText = `
Berdasarkan data Anda, dosis furosemid adalah 500 mg dan akurasi pasien lain mencapai 75%.
    `.trim();

    const result = validateNarrative(hallucinatedText, report);
    expect(result.valid).toBe(false);
    expect(result.invalidNumbers).toContain(500);
    expect(result.invalidNumbers).toContain(75);
    expect(result.reason).toContain("500");
  });

  test("validateNarrative rejects text when indicative findings exist but label 'indikatif' is omitted", () => {
    // 10 questions across 2 attempts with low accuracy -> triggers PERSISTENT_WEAKNESS with sampleStatus 'sampel indikatif'
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 5 }, (_, i) =>
        createMockRow({ attempt_id: "att-1", question_id: `q-1-${i}`, is_correct: false }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        createMockRow({ attempt_id: "att-2", question_id: `q-2-${i}`, is_correct: false }),
      ),
    ];
    const report = runDiagnosisEngine(rows);
    expect(report.topFindings.some((f) => f.metadata?.sampleStatus === "sampel indikatif")).toBe(true);

    // Omission of the word "indikatif"
    const textWithoutIndicative = `
# Laporan Analisis Kelemahan Belajar
## 1. Ringkasan Kinerja
Siswa menyelesaikan 2 sesi dengan 10 butir soal dan akurasi 0%.
## 2. Profil Karakteristik Kesalahan
Terdapat 0 butir miskonsepsi.
## 3. Temuan Prioritas & Rekomendasi Studi
1. Kelemahan pada Kardiovaskular dengan akurasi 0%.
## 4. Disiplin Ujian & Rekomendasi Belajar
Belajar lagi.
    `.trim();

    const result = validateNarrative(textWithoutIndicative, report);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("indikatif");
  });

  test("decorateNarrativeWithDeterministicBadges prepends scheduled attempt notice deterministically", () => {
    const rows: EvidenceRow[] = [
      createMockRow({ question_id: "q-1", is_correct: true, unreleased_scheduled_attempts: 2 }),
    ];
    const report = runDiagnosisEngine(rows);
    expect(report.unreleasedScheduledAttemptsCount).toBe(2);

    const baseNarrative = `# Laporan Analisis Kelemahan Belajar\n\n## 1. Ringkasan Kinerja\nIsi laporan.`;
    const decorated = decorateNarrativeWithDeterministicBadges(baseNarrative, report);

    expect(decorated).toContain("> **Catatan Try Out Terjadwal:** Terdapat 2 sesi try out terjadwal yang belum disertakan dalam analisis ini karena periode pelaksanaan event belum berakhir.");
    expect(decorated).toContain("# Laporan Analisis Kelemahan Belajar");
  });
});
