import type { DiagnosisConfig } from "./config.ts";
import { DIAGNOSIS_CONFIG } from "./config.ts";
import type { ErrorTag, EvidenceRow, ClassifiedEvidenceRow } from "./types.ts";

/**
 * Aturan Prioritas Klasifikasi Tag Kesalahan:
 * Bila satu jawaban salah memenuhi beberapa kriteria tag sekaligus, urutan dominansi
 * ditentukan secara hierarkis berdasarkan urgensi perilaku:
 * 1. kehabisan_waktu: Faktor eksternal waktu habis mendominasi kekeliruan (jawaban tergesa di akhir sesi).
 * 2. ceroboh: Tergesa-gesa tanpa ragu di luar zona akhir sesi (kecepatan abnormal mengindikasikan impulsivitas).
 * 3. miskonsepsi: Salah dengan yakin pada distraktor yang konsisten (cacat model mental sistematis).
 * 4. celah_pengetahuan: Keraguan eksplisit atau durasi berpikir panjang (ketiadaan informasi/memori).
 */
export const ERROR_TAG_PRIORITY: readonly ErrorTag[] = [
  "kehabisan_waktu",
  "ceroboh",
  "miskonsepsi",
  "celah_pengetahuan",
] as const;

export interface ClassificationContext {
  recurringDistractorCount?: number;
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

  // 1. Kehabisan Waktu:
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

  // 2. Ceroboh:
  // Salah pada butir yang dijawab sangat cepat (z-score < rushedZScore) dengan rasa yakin (tanpa tanda ragu)
  if (
    row.time_spent_z_score !== null &&
    row.was_ever_flagged_ragu === false &&
    row.time_spent_z_score < config.behaviorThresholds.rushedZScore
  ) {
    matchingTags.add("ceroboh");
  }

  // 3. Miskonsepsi:
  // Salah, tidak ragu (yakin), dan opsi pengecoh yang sama dipilih >= 2 kali di subtopik/topik terkait
  // Catatan: perubahan jawaban dari benar ke salah TIDAK dimasukkan di sini (dianalisis khusus di NET_ANSWER_CHANGE).
  const distractorCount = context.recurringDistractorCount ?? 0;
  if (
    row.was_ever_flagged_ragu === false &&
    distractorCount >= config.sampleThresholds.recurringDistractorInTopicThreshold
  ) {
    matchingTags.add("miskonsepsi");
  }

  // 4. Celah Pengetahuan:
  // Salah + ragu-ragu ATAU waktu berpikir jauh di atas rata-rata (z-score > slowZScore)
  const isDoubtful = row.was_ever_flagged_ragu === true;
  const isSlow =
    row.time_spent_z_score !== null &&
    row.time_spent_z_score > config.behaviorThresholds.slowZScore;

  if (isDoubtful || isSlow) {
    matchingTags.add("celah_pengetahuan");
  }

  // Sort matching tags according to defined priority hierarchy
  return ERROR_TAG_PRIORITY.filter((tag) => matchingTags.has(tag));
}

/**
 * Classifies a list of evidence rows and counts error tag distributions.
 * Computes topic distractor distributions across the dataset to accurately identify miskonsepsi.
 */
export function classifyAllEvidenceRows(
  rows: EvidenceRow[],
  config: DiagnosisConfig = DIAGNOSIS_CONFIG,
): {
  classifiedRows: ClassifiedEvidenceRow[];
  tagCounts: Record<ErrorTag, number>;
} {
  const tagCounts: Record<ErrorTag, number> = {
    kehabisan_waktu: 0,
    ceroboh: 0,
    miskonsepsi: 0,
    celah_pengetahuan: 0,
  };

  // Pre-calculate distractor counts per topic and option key: topicKey -> optionKey -> count
  const distractorFrequency = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.is_correct && row.selected_option_key) {
      const topicKey = row.topic_id || row.topic_name || "unknown";
      let optMap = distractorFrequency.get(topicKey);
      if (!optMap) {
        optMap = new Map();
        distractorFrequency.set(topicKey, optMap);
      }
      optMap.set(row.selected_option_key, (optMap.get(row.selected_option_key) || 0) + 1);
    }
  }

  const classifiedRows: ClassifiedEvidenceRow[] = rows.map((row) => {
    let recurringDistractorCount = 0;
    if (!row.is_correct && row.selected_option_key) {
      const topicKey = row.topic_id || row.topic_name || "unknown";
      recurringDistractorCount = distractorFrequency.get(topicKey)?.get(row.selected_option_key) || 0;
    }

    const error_tags = classifyEvidenceRow(
      row,
      { recurringDistractorCount },
      config,
    );

    for (const tag of error_tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    return {
      ...row,
      error_tags,
      primary_error_tag: error_tags.length > 0 ? error_tags[0] : null,
    };
  });

  return { classifiedRows, tagCounts };
}
