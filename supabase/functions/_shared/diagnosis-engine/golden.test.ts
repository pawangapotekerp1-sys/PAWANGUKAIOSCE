import { describe, expect, test } from "vitest";
import { DIAGNOSIS_CONFIG } from "./config.ts";
import { runDiagnosisEngine } from "./engine.ts";
import type { DiagnosisReport, EvidenceRow } from "./types.ts";

function createMockEvidenceRow(overrides: Partial<EvidenceRow> = {}): EvidenceRow {
  return {
    attempt_id: "att-golden-1",
    submitted_at: "2026-10-25T10:00:00Z",
    question_id: "q-golden-1",
    topic_id: "top-cardio",
    topic_name: "Farmakoterapi Kardiovaskular",
    question_text: "Pasien gagal jantung kronis dengan fraksi ejeksi rendah menerima terapi standar.",
    selected_option_key: "A",
    correct_option_key: "B",
    is_correct: false,
    explanation: "Penjelasan acuan resmi guideline klinis",
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

/**
 * Normalizes report timestamps to a fixed deterministic string for snapshot reproducibility.
 */
function normalizeForSnapshot(report: DiagnosisReport): DiagnosisReport {
  return {
    ...report,
    generatedAt: "2026-10-27T12:00:00.000Z",
  };
}

describe("Diagnosis Engine - Fase 6 Golden Tests (Synthetic History Scenarios)", () => {
  // Skenario 1: Data Kurang (<10 soal pada semua topik)
  test("skenario 1: data kurang (<10 soal) menghasilkan laporan tanpa temuan signifikan", () => {
    const rows: EvidenceRow[] = [
      createMockEvidenceRow({ question_id: "q-1", is_correct: true }),
      createMockEvidenceRow({ question_id: "q-2", is_correct: true }),
      createMockEvidenceRow({ question_id: "q-3", is_correct: true }),
      createMockEvidenceRow({ question_id: "q-4", is_correct: false }),
      createMockEvidenceRow({ question_id: "q-5", is_correct: false }),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.totalAttempts).toBe(1);
    expect(report.totalQuestions).toBe(5);
    expect(report.overallAccuracy).toBe(60);
    expect(report.findings).toHaveLength(0);
    expect(report.topFindings).toHaveLength(0);
    expect(report.fallbackMarkdown).toContain("Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada.");

    expect(normalizeForSnapshot(report)).toMatchSnapshot();
  });

  // Skenario 2: Satu Topik 12 Soal (>=10 indikatif, <20 utama)
  test("skenario 2: topik sampel indikatif (12 butir) berlabel 'sampel indikatif' dan tidak masuk peringkat utama", () => {
    // 2 consecutive attempts, each 6 questions on same topic with 33% accuracy
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 6 }, (_, i) =>
        createMockEvidenceRow({
          attempt_id: "att-resp-1",
          submitted_at: "2026-10-01T00:00:00Z",
          topic_id: "top-resp",
          topic_name: "Farmakoterapi Respiratori",
          question_id: `q-resp-1-${i}`,
          is_correct: i < 2, // 2/6 correct
        }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        createMockEvidenceRow({
          attempt_id: "att-resp-2",
          submitted_at: "2026-10-05T00:00:00Z",
          topic_id: "top-resp",
          topic_name: "Farmakoterapi Respiratori",
          question_id: `q-resp-2-${i}`,
          is_correct: i < 2, // 2/6 correct
        }),
      ),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.totalQuestions).toBe(12);
    expect(report.overallAccuracy).toBe(33.33);

    const persistentWeakness = report.findings.find((f) => f.code === "PERSISTENT_WEAKNESS");
    expect(persistentWeakness).toBeDefined();
    expect(persistentWeakness?.metadata.sampleStatus).toBe("sampel indikatif");
    expect(persistentWeakness?.evidenceSummary).toContain("sampel indikatif");

    expect(normalizeForSnapshot(report)).toMatchSnapshot();
  });

  // Skenario 3: Pengecoh Sama pada question_id Sama Lintas Sesi Berbeda
  test("skenario 3: pengecoh sama pada butir yang sama lintas >= 2 sesi memicu tag miskonsepsi dan temuan RECURRING_DISTRACTOR", () => {
    const questionText = "Pasien gagal ginjal kronis stadium 4 membutuhkan penyesuaian dosis aminoglikosida.";
    const rows: EvidenceRow[] = [
      // Same question q-distractor picked option C in 2 different attempts
      createMockEvidenceRow({
        attempt_id: "att-dist-1",
        question_id: "q-distractor",
        question_text: questionText,
        selected_option_key: "C",
        correct_option_key: "B",
        is_correct: false,
        was_ever_flagged_ragu: false,
      }),
      createMockEvidenceRow({
        attempt_id: "att-dist-2",
        question_id: "q-distractor",
        question_text: questionText,
        selected_option_key: "C",
        correct_option_key: "B",
        is_correct: false,
        was_ever_flagged_ragu: false,
      }),
      // Additional questions
      ...Array.from({ length: 8 }, (_, i) =>
        createMockEvidenceRow({
          attempt_id: "att-dist-1",
          question_id: `q-filler-${i}`,
          is_correct: true,
        }),
      ),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.classifiedErrorCounts.miskonsepsi).toBe(2);

    const distractorFinding = report.findings.find((f) => f.code === "RECURRING_DISTRACTOR");
    expect(distractorFinding).toBeDefined();
    expect(distractorFinding?.evidenceSummary).toContain("Opsi salah 'C' dipilih 2 kali");
    expect(distractorFinding?.evidenceSummary).toContain("Pasien gagal ginjal kronis stadium 4");
    expect(distractorFinding?.recommendationDraft).toContain("opsi 'C' dipilih berulang");

    expect(normalizeForSnapshot(report)).toMatchSnapshot();
  });

  // Skenario 4: Topik >= 20 Soal dengan Kesalahan Yakin Tinggi (>=3 butir dan >=20%)
  test("skenario 4: topik sampel utama (>=20 soal) dengan kesalahan yakin tinggi memicu CONFIDENT_ERRORS_TOPIC dengan angka konsisten", () => {
    // 20 questions on Farmakoterapi Endokrin: 8 confident errors (40%), 12 correct
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 8 }, (_, i) =>
        createMockEvidenceRow({
          question_id: `q-endo-err-${i}`,
          topic_id: "top-endo",
          topic_name: "Farmakoterapi Endokrin",
          is_correct: false,
          was_ever_flagged_ragu: false,
        }),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        createMockEvidenceRow({
          question_id: `q-endo-corr-${i}`,
          topic_id: "top-endo",
          topic_name: "Farmakoterapi Endokrin",
          is_correct: true,
        }),
      ),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    const ceFinding = report.findings.find((f) => f.code === "CONFIDENT_ERRORS_TOPIC");
    expect(ceFinding).toBeDefined();
    // Buktikan konsistensi angka dan penyebut
    expect(ceFinding?.evidenceSummary).toContain("8 kesalahan (40% dari 20 butir)");
    expect(ceFinding?.recommendationDraft).toContain("8 butir salah (40% dari 20 butir soal topik)");
    expect(ceFinding?.metadata.confidentErrors).toBe(8);
    expect(ceFinding?.metadata.totalQuestions).toBe(20);
    expect(ceFinding?.metadata.ratio).toBe(40);

    expect(normalizeForSnapshot(report)).toMatchSnapshot();
  });

  // Skenario 5: >= 100 Jawaban Global dengan Perilaku Terburu-buru dan Pergantian Negatif
  test("skenario 5: sampel global >=100 butir memicu NET_ANSWER_CHANGE dan RUSHED_WRONG", () => {
    const rows: EvidenceRow[] = [
      // 6 rushed wrong items (z = -1.2, not doubtful)
      ...Array.from({ length: 6 }, (_, i) =>
        createMockEvidenceRow({
          question_id: `q-rushed-${i}`,
          is_correct: false,
          time_spent_z_score: -1.2,
          was_ever_flagged_ragu: false,
        }),
      ),
      // 4 changed correct to wrong, 1 changed wrong to correct
      ...Array.from({ length: 4 }, (_, i) =>
        createMockEvidenceRow({
          question_id: `q-nac-ctow-${i}`,
          is_correct: false,
          changed_correct_to_wrong_count: 1,
          changed_wrong_to_correct_count: 0,
        }),
      ),
      createMockEvidenceRow({
        question_id: "q-nac-wtoc-0",
        is_correct: true,
        changed_correct_to_wrong_count: 0,
        changed_wrong_to_correct_count: 1,
      }),
      // 89 normal correct questions to reach 100
      ...Array.from({ length: 89 }, (_, i) =>
        createMockEvidenceRow({
          question_id: `q-normal-${i}`,
          is_correct: true,
          time_spent_z_score: 0.1,
        }),
      ),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.totalQuestions).toBe(100);

    const rushedFinding = report.findings.find((f) => f.code === "RUSHED_WRONG");
    expect(rushedFinding).toBeDefined();
    expect(rushedFinding?.metadata.ratio).toBe(6);

    const nacFinding = report.findings.find((f) => f.code === "NET_ANSWER_CHANGE");
    expect(nacFinding).toBeDefined();
    expect(nacFinding?.metadata.changedCorrectToWrong).toBe(4);
    expect(nacFinding?.metadata.changedWrongToCorrect).toBe(1);

    expect(normalizeForSnapshot(report)).toMatchSnapshot();
  });

  // Skenario 6: Try Out Terjadwal dengan Data Perilaku NULL dan Attempt Belum Dirilis
  test("skenario 6: try out terjadwal dengan data perilaku NULL dan unreleased attempts menjaga zero false positive", () => {
    // 50 questions from scheduled tryout where behavioral telemetries are strictly NULL
    const rows: EvidenceRow[] = [
      ...Array.from({ length: 20 }, (_, i) =>
        createMockEvidenceRow({
          attempt_id: "att-scheduled-live",
          question_id: `q-sched-w-${i}`,
          is_correct: false,
          was_ever_flagged_ragu: null,
          flagged_ragu_at_submit: false,
          time_spent_seconds: null,
          time_spent_z_score: null,
          answer_change_count: null,
          changed_correct_to_wrong_count: null,
          changed_wrong_to_correct_count: null,
          session_position_ratio: null,
          unreleased_scheduled_attempts: 2,
        }),
      ),
      ...Array.from({ length: 30 }, (_, i) =>
        createMockEvidenceRow({
          attempt_id: "att-scheduled-live",
          question_id: `q-sched-c-${i}`,
          is_correct: true,
          was_ever_flagged_ragu: null,
          flagged_ragu_at_submit: false,
          time_spent_seconds: null,
          time_spent_z_score: null,
          answer_change_count: null,
          changed_correct_to_wrong_count: null,
          changed_wrong_to_correct_count: null,
          session_position_ratio: null,
          unreleased_scheduled_attempts: 2,
        }),
      ),
    ];

    const report = runDiagnosisEngine(rows, DIAGNOSIS_CONFIG);

    expect(report.totalQuestions).toBe(50);
    expect(report.unreleasedScheduledAttemptsCount).toBe(2);
    expect(report.fallbackMarkdown).toContain("> **Catatan Try Out Terjadwal:** Terdapat 2 sesi try out terjadwal");

    // Zero false positive pada metrik waktu / ragu
    expect(report.classifiedErrorCounts.ceroboh).toBe(0);
    expect(report.classifiedErrorCounts.kehabisan_waktu).toBe(0);
    expect(report.classifiedErrorCounts.celah_pengetahuan).toBe(0);
    // Soal salah masuk ke tidak_terklasifikasi
    expect(report.classifiedErrorCounts.tidak_terklasifikasi).toBe(20);

    // Invarian jumlah kategori == total jawaban salah
    const totalWrong = 20;
    const sumCategories =
      report.classifiedErrorCounts.miskonsepsi +
      report.classifiedErrorCounts.kehabisan_waktu +
      report.classifiedErrorCounts.ceroboh +
      report.classifiedErrorCounts.celah_pengetahuan +
      (report.classifiedErrorCounts.tidak_terklasifikasi ?? 0);
    expect(sumCategories).toBe(totalWrong);

    expect(normalizeForSnapshot(report)).toMatchSnapshot();
  });
});
