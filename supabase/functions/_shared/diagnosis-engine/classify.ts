import type { ErrorTag, EvidenceRow, ClassifiedEvidenceRow } from "./types.ts";

/**
 * Classifies an individual evidence row with error tags based on cognitive behavioral signals.
 * Returns an array of ErrorTags. Correct answers receive an empty array.
 */
export function classifyEvidenceRow(row: EvidenceRow): ErrorTag[] {
  if (row.is_correct) {
    return [];
  }

  const tags: ErrorTag[] = [];

  // 1. Miskonsepsi:
  // Jawaban diubah dari benar ke salah ATAU salah pada distraktor dominan
  if (row.changed_correct_to_wrong_count > 0) {
    tags.push("miskonsepsi");
  }

  // 2. Celah Pengetahuan:
  // Salah + ragu-ragu ATAU waktu berpikir jauh lebih lama dari rata-rata (z-score > 1.0)
  if (row.was_ever_flagged_ragu || row.time_spent_z_score > 1.0) {
    tags.push("celah_pengetahuan");
  }

  // 3. Ceroboh:
  // Salah pada soal yang dijawab sangat cepat (z-score < -0.8) tanpa tanda ragu
  if (row.time_spent_z_score < -0.8 && !row.was_ever_flagged_ragu) {
    tags.push("ceroboh");
  }

  // 4. Kehabisan Waktu:
  // Salah atau tidak terjawab pada 10-15% soal terakhir sesi (position >= 0.85) dengan durasi < 30 detik
  if (
    (!row.is_correct || row.selected_option_key === null) &&
    row.session_position_ratio >= 0.85 &&
    row.time_spent_seconds < 30
  ) {
    tags.push("kehabisan_waktu");
  }

  return tags;
}

/**
 * Classifies a list of evidence rows and counts error tag distributions.
 */
export function classifyAllEvidenceRows(rows: EvidenceRow[]): {
  classifiedRows: ClassifiedEvidenceRow[];
  tagCounts: Record<ErrorTag, number>;
} {
  const tagCounts: Record<ErrorTag, number> = {
    miskonsepsi: 0,
    celah_pengetahuan: 0,
    ceroboh: 0,
    kehabisan_waktu: 0,
  };

  const classifiedRows = rows.map((row) => {
    const error_tags = classifyEvidenceRow(row);
    for (const tag of error_tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    return {
      ...row,
      error_tags,
    };
  });

  return { classifiedRows, tagCounts };
}
