import type { DiagnosisConfig } from "./config.ts";
import { DIAGNOSIS_CONFIG } from "./config.ts";
import type { ErrorTag, EvidenceRow, ClassifiedEvidenceRow } from "./types.ts";

/**
 * Aturan Prioritas Klasifikasi Tag Kesalahan:
 * Bila satu jawaban salah memenuhi beberapa kriteria tag sekaligus, urutan dominansi
 * ditentukan secara hierarkis (miskonsepsi > kehabisan_waktu > ceroboh > celah_pengetahuan):
 * 1. miskonsepsi: Salah dengan yakin pada opsi pengecoh yang sama di butir soal yang sama (question_id)
 *    selama minimal 2 attempt. Menunjukkan cacat model mental sistematis yang mendahului tag perilaku lain.
 * 2. kehabisan_waktu: Faktor eksternal waktu habis (dikerjakan tergesa di 15% akhir sesi ujian dengan durasi < 30 detik).
 * 3. ceroboh: Tergesa-gesa tanpa ragu di luar zona akhir sesi (kecepatan abnormal z < -0.8 mencerminkan impulsivitas).
 * 4. celah_pengetahuan: Keraguan eksplisit (flag ragu) atau durasi berpikir panjang (z > 1.0) menunjukkan ketiadaan memori/konsep.
 */
export const ERROR_TAG_PRIORITY: readonly ErrorTag[] = [
  "miskonsepsi",
  "kehabisan_waktu",
  "ceroboh",
  "celah_pengetahuan",
  "tidak_terklasifikasi",
] as const;

export interface ClassificationContext {
  recurringDistractorAttemptsCount?: number;
}

/**
 * Helper to determine effective doubt status.
 * Prefers was_ever_flagged_ragu (telemetry attempt reguler);
 * fallbacks to flagged_ragu_at_submit (statis submit tryout terjadwal) if was_ever_flagged_ragu is null.
 */
export function getEffectiveRaguStatus(row: EvidenceRow): {
  isDoubtful: boolean;
  isConfident: boolean;
} {
  if (row.was_ever_flagged_ragu !== null && row.was_ever_flagged_ragu !== undefined) {
    return {
      isDoubtful: row.was_ever_flagged_ragu === true,
      isConfident: row.was_ever_flagged_ragu === false,
    };
  }

  if (row.flagged_ragu_at_submit !== null && row.flagged_ragu_at_submit !== undefined) {
    return {
      isDoubtful: row.flagged_ragu_at_submit === true,
      isConfident: row.flagged_ragu_at_submit === false,
    };
  }

  return { isDoubtful: false, isConfident: false };
}

/**
 * Classifies an individual evidence row with error tags based on cognitive-behavioral signals.
 * Returns an array of ErrorTags ordered by priority (highest priority first).
 * Correct answers return an empty array.
 */
export function classifyEvidenceRow(
  row: EvidenceRow,
  context: ClassificationContext = {},
  config: DiagnosisConfig = DIAGNOSIS_CONFIG,
): ErrorTag[] {
  if (row.is_correct) {
    return [];
  }

  const matchingTags = new Set<ErrorTag>();
  const { isDoubtful, isConfident } = getEffectiveRaguStatus(row);

  // 1. Miskonsepsi:
  // Salah, tidak ragu (yakin), dan opsi pengecoh yang sama dipilih >= recurringDistractorMinAttempts (2)
  // pada BUTIR SOAL YANG SAMA (question_id yang sama) di attempt berbeda.
  // Catatan: Tidak lagi dihitung per huruf lintas soal berbeda, dan tidak mencakup answer change.
  const distractorAttempts = context.recurringDistractorAttemptsCount ?? 0;
  if (
    isConfident &&
    distractorAttempts >= config.sampleThresholds.recurringDistractorMinAttempts
  ) {
    matchingTags.add("miskonsepsi");
  }

  // 2. Kehabisan Waktu:
  // Soal salah/tidak dijawab di 15% akhir sesi (position >= lateSessionPositionRatio)
  // dengan durasi pengerjaan singkat (< timeTroubleMaxSeconds)
  if (
    row.session_position_ratio !== null &&
    row.time_spent_seconds !== null &&
    row.session_position_ratio >= config.behaviorThresholds.lateSessionPositionRatio &&
    row.time_spent_seconds < config.behaviorThresholds.timeTroubleMaxSeconds
  ) {
    matchingTags.add("kehabisan_waktu");
  }

  // 3. Ceroboh:
  // Salah pada butir yang dijawab sangat cepat (z-score < rushedZScore) dengan rasa yakin (tanpa tanda ragu)
  if (
    row.time_spent_z_score !== null &&
    isConfident &&
    row.time_spent_z_score < config.behaviorThresholds.rushedZScore
  ) {
    matchingTags.add("ceroboh");
  }

  // 4. Celah Pengetahuan:
  // Salah + ragu-ragu ATAU waktu berpikir jauh di atas rata-rata (z-score > slowZScore)
  const isSlow =
    row.time_spent_z_score !== null &&
    row.time_spent_z_score > config.behaviorThresholds.slowZScore;

  if (isDoubtful || isSlow) {
    matchingTags.add("celah_pengetahuan");
  }

  // 5. Tidak Terklasifikasi:
  // Jika soal salah tetapi tidak memenuhi salah satu dari 4 sinyal kognitif di atas
  if (matchingTags.size === 0) {
    matchingTags.add("tidak_terklasifikasi");
  }

  // Sort matching tags according to defined priority hierarchy:
  // miskonsepsi > kehabisan_waktu > ceroboh > celah_pengetahuan > tidak_terklasifikasi
  return ERROR_TAG_PRIORITY.filter((tag) => matchingTags.has(tag));
}

/**
 * Classifies a list of evidence rows and counts error tag distributions.
 * Computes distractor frequency PER QUESTION_ID across distinct attempts.
 */
export function classifyAllEvidenceRows(
  rows: EvidenceRow[],
  config: DiagnosisConfig = DIAGNOSIS_CONFIG,
): {
  classifiedRows: ClassifiedEvidenceRow[];
  tagCounts: Record<ErrorTag, number>;
} {
  const tagCounts: Record<ErrorTag, number> = {
    miskonsepsi: 0,
    kehabisan_waktu: 0,
    ceroboh: 0,
    celah_pengetahuan: 0,
    tidak_terklasifikasi: 0,
  };

  // Grouping kunci: question_id -> selected_option_key -> Set<attempt_id>
  // Pengecoh berulang hanya valid jika question_id yang sama dan opsi salah yang sama dipilih di >= 2 attempt.
  const questionDistractorAttempts = new Map<string, Map<string, Set<string>>>();
  for (const row of rows) {
    if (!row.is_correct && row.selected_option_key) {
      let optMap = questionDistractorAttempts.get(row.question_id);
      if (!optMap) {
        optMap = new Map();
        questionDistractorAttempts.set(row.question_id, optMap);
      }
      let attSet = optMap.get(row.selected_option_key);
      if (!attSet) {
        attSet = new Set();
        optMap.set(row.selected_option_key, attSet);
      }
      attSet.add(row.attempt_id);
    }
  }

  const classifiedRows: ClassifiedEvidenceRow[] = rows.map((row) => {
    let recurringDistractorAttemptsCount = 0;
    if (!row.is_correct && row.selected_option_key) {
      recurringDistractorAttemptsCount =
        questionDistractorAttempts.get(row.question_id)?.get(row.selected_option_key)?.size || 0;
    }

    const error_tags = classifyEvidenceRow(
      row,
      { recurringDistractorAttemptsCount },
      config,
    );

    const primary_error_tag = error_tags.length > 0 ? error_tags[0] : null;

    // Setiap jawaban salah memiliki tepat 1 primary tag dalam distribusi klasifikasi
    // untuk menjamin invarian: jumlah semua kategori == jumlah jawaban salah.
    if (primary_error_tag) {
      tagCounts[primary_error_tag] = (tagCounts[primary_error_tag] || 0) + 1;
    }

    return {
      ...row,
      error_tags,
      primary_error_tag,
    };
  });

  return { classifiedRows, tagCounts };
}
