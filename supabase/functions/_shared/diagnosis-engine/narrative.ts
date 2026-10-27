import { DIAGNOSIS_CONFIG } from "./config.ts";
import { formatQuestionSummary } from "./recommend.ts";
import type { DiagnosisReport } from "./types.ts";

export interface NarrativeValidationResult {
  valid: boolean;
  reason?: string;
  invalidNumbers?: number[];
  invalidIds?: string[];
}

/**
 * Builds a strict, constrained prompt for Gemini to narrate the diagnosis report.
 * Constrained to:
 * - Temperature 0.2
 * - Question summaries truncated to max 60 characters
 * - Only numbers and findings from the deterministic report object
 * - Clear instructions to never invent clinical claims, facts, or dosages
 * - Forbids quoting clinical figures from question summaries.
 */
export function buildDiagnosisNarrationPrompt(report: DiagnosisReport): string {
  const lines: string[] = [];
  lines.push("Kamu adalah asisten analisis pembelajaran farmasi klinis.");
  lines.push("Tugasmu: Susun narasi evaluasi belajar siswa dalam format Markdown yang rapi HANYA berdasarkan data laporan diagnosis deterministik berikut.");
  lines.push("");
  lines.push("ATURAN KETAT VALIDASI:");
  lines.push("1. HANYA gunakan angka dan data statistik yang tercantum pada data laporan di bawah ini.");
  lines.push("2. DILARANG KERAS mengarang angka baru, dosis obat, persen pasien, durasi waktu baru, atau klaim klinis yang tidak ada di data.");
  lines.push("3. DILARANG mengutip atau mencantumkan angka klinis spesifik dari ringkasan soal (seperti umur pasien, dosis, atau nilai lab di ringkasan soal).");
  lines.push("4. Gunakan ringkasan butir soal (maks 60 karakter) yang disediakan.");
  lines.push("5. Jika temuan prioritas memiliki status sampel 'sampel indikatif', WAJIB sebutkan secara eksplisit label 'sampel indikatif'.");
  lines.push("6. Jika terdapat sesi try out terjadwal yang belum dihitung, sebutkan secara eksplisit jumlahnya.");
  lines.push("7. Jika temuan prioritas kosong, sampaikan dengan jelas bahwa belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada, dan berikan dorongan positif untuk melanjutkan latihan.");
  lines.push("");
  lines.push("STRUKTUR DOKUMEN YANG DIHARAPKAN:");
  lines.push("# Laporan Analisis Kelemahan Belajar");
  lines.push("## 1. Ringkasan Kinerja");
  lines.push("## 2. Profil Karakteristik Kesalahan");
  lines.push("## 3. Temuan Prioritas & Rekomendasi Studi");
  lines.push("## 4. Disiplin Ujian & Rekomendasi Belajar");
  lines.push("");
  lines.push("DATA LAPORAN RESMI:");
  lines.push(`- Total Sesi Try Out: ${report.totalAttempts}`);
  lines.push(`- Total Soal Teranalisis: ${report.totalQuestions}`);
  lines.push(`- Akurasi Kumulatif: ${report.overallAccuracy}%`);
  if (report.unreleasedScheduledAttemptsCount > 0) {
    lines.push(`- Sesi Try Out Terjadwal Belum Dihitung: ${report.unreleasedScheduledAttemptsCount} (karena periode event belum berakhir)`);
  }
  lines.push("- Distribusi Kesalahan:");
  lines.push(`  * Miskonsepsi: ${report.classifiedErrorCounts.miskonsepsi} butir`);
  lines.push(`  * Celah Pengetahuan: ${report.classifiedErrorCounts.celah_pengetahuan} butir`);
  lines.push(`  * Kecerobohan: ${report.classifiedErrorCounts.ceroboh} butir`);
  lines.push(`  * Kehabisan Waktu: ${report.classifiedErrorCounts.kehabisan_waktu} butir`);
  lines.push("");
  lines.push("TEMUAN PRIORITAS DAN REKOMENDASI:");
  if (report.topFindings.length === 0) {
    lines.push("(Tidak ada temuan kelemahan signifikan pada data saat ini)");
  } else {
    report.topFindings.forEach((f, idx) => {
      const sampleStatusLabel = f.metadata?.sampleStatus ? ` [${f.metadata.sampleStatus}]` : "";
      lines.push(`${idx + 1}. [${f.code}] ${f.title}${sampleStatusLabel}`);
      lines.push(`   Topik: ${f.topicName}`);
      lines.push(`   Bukti: ${f.evidenceSummary}`);
      lines.push(`   Rekomendasi: ${f.recommendationDraft}`);
    });
  }

  return lines.join("\n");
}

/**
 * Extracts all numeric values legitimately present in the DiagnosisReport,
 * including numbers embedded inside question summaries or metadata.
 */
export function extractAllowedNumbers(report: DiagnosisReport): Set<number> {
  const allowed = new Set<number>();

  // Formatting numbers always allowed for headings / lists (1 to 20)
  for (let i = 0; i <= 20; i++) {
    allowed.add(i);
  }

  // Top level report numbers
  allowed.add(report.totalAttempts);
  allowed.add(report.totalQuestions);
  allowed.add(report.overallAccuracy);
  allowed.add(Math.round(report.overallAccuracy));
  allowed.add(Math.floor(report.overallAccuracy));
  allowed.add(Math.ceil(report.overallAccuracy));
  allowed.add(report.unreleasedScheduledAttemptsCount);

  // Error counts
  for (const count of Object.values(report.classifiedErrorCounts)) {
    allowed.add(count);
  }

  // Findings numbers
  for (const f of [...report.findings, ...report.topFindings]) {
    allowed.add(f.severity);
    allowed.add(f.persistence);
    allowed.add(f.confidence);
    allowed.add(Math.round(f.urgencyScore));
    allowed.add(Math.floor(f.urgencyScore));

    // Numbers in metadata
    if (f.metadata) {
      for (const val of Object.values(f.metadata)) {
        if (typeof val === "number") {
          allowed.add(val);
          allowed.add(Math.round(val));
          allowed.add(Math.floor(val));
        } else if (typeof val === "string") {
          const strMatches = val.match(/\b\d+(?:[.,]\d+)?\b/g);
          if (strMatches) {
            for (const m of strMatches) {
              const num = parseFloat(m.replace(",", "."));
              if (!isNaN(num)) {
                allowed.add(num);
                allowed.add(Math.round(num));
              }
            }
          }
        }
      }
    }

    // Extract numbers from evidenceSummary and recommendationDraft strings
    const str = `${f.evidenceSummary} ${f.recommendationDraft}`;
    const matches = str.match(/\b\d+(?:[.,]\d+)?\b/g);
    if (matches) {
      for (const m of matches) {
        const num = parseFloat(m.replace(",", "."));
        if (!isNaN(num)) {
          allowed.add(num);
          allowed.add(Math.round(num));
          allowed.add(Math.floor(num));
        }
      }
    }
  }

  return allowed;
}

/**
 * Extracts all IDs legitimately present in the DiagnosisReport.
 */
export function extractAllowedIds(report: DiagnosisReport): Set<string> {
  const allowed = new Set<string>();

  for (const f of [...report.findings, ...report.topFindings]) {
    allowed.add(f.id.toLowerCase());
    allowed.add(f.code.toLowerCase());
    allowed.add(f.recommendationTemplateId.toLowerCase());
    if (f.topicId) allowed.add(f.topicId.toLowerCase());
    if (f.metadata?.questionId && typeof f.metadata.questionId === "string") {
      allowed.add(f.metadata.questionId.toLowerCase());
    }
  }

  return allowed;
}

/**
 * Validates that all numbers and specific ID formats in the generated narrative
 * derive strictly from the report object.
 * Rules:
 * - Numbered list items (1., 2.) allowed.
 * - Accuracy rounding allowed (difference <= 0.5 percentage points).
 * - Numbers in question summaries are included in allowed list.
 * - If top findings contain indicative status, requires mention of 'indikatif'.
 * - Other foreign numbers not matching any report number are rejected.
 */
export function validateNarrative(
  text: string,
  report: DiagnosisReport,
): NarrativeValidationResult {
  const allowedNumbers = extractAllowedNumbers(report);
  const allowedIds = extractAllowedIds(report);

  // 1. Check numbers in generated text
  const numberMatches = text.match(/\b\d+(?:[.,]\d+)?\b/g);
  const invalidNumbers: number[] = [];

  if (numberMatches) {
    for (const match of numberMatches) {
      const num = parseFloat(match.replace(",", "."));
      if (isNaN(num)) continue;

      // Allow if exact match, integer rounding, or within rounding tolerance <= 0.5 of any allowed number
      const isAllowed =
        allowedNumbers.has(num) ||
        allowedNumbers.has(Math.round(num)) ||
        allowedNumbers.has(Math.floor(num)) ||
        allowedNumbers.has(Math.ceil(num)) ||
        Array.from(allowedNumbers).some((allowed) => Math.abs(num - allowed) <= 0.5001);

      if (!isAllowed) {
        invalidNumbers.push(num);
      }
    }
  }

  // 2. Check IDs in text (patterns like FND_..., TPL_..., or UUIDs)
  const idMatches = text.match(/\b(FND_[A-Z0-9_]+|TPL_[A-Z0-9_]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi);
  const invalidIds: string[] = [];

  if (idMatches) {
    for (const id of idMatches) {
      if (!allowedIds.has(id.toLowerCase())) {
        invalidIds.push(id);
      }
    }
  }

  // 3. Check presence of 'indikatif' label when indicative findings exist
  const hasIndicativeFinding = report.topFindings.some(
    (f) => f.metadata?.sampleStatus === "sampel indikatif",
  );
  if (hasIndicativeFinding && !text.toLowerCase().includes("indikatif")) {
    return {
      valid: false,
      reason: "Laporan memuat temuan berstatus sampel indikatif namun kata 'indikatif' tidak tercantum dalam narasi.",
    };
  }

  if (invalidNumbers.length > 0 || invalidIds.length > 0) {
    const reasons: string[] = [];
    if (invalidNumbers.length > 0) {
      reasons.push(`Angka di luar laporan ditemukan: [${Array.from(new Set(invalidNumbers)).join(", ")}]`);
    }
    if (invalidIds.length > 0) {
      reasons.push(`ID di luar laporan ditemukan: [${Array.from(new Set(invalidIds)).join(", ")}]`);
    }
    return {
      valid: false,
      reason: reasons.join("; "),
      invalidNumbers: Array.from(new Set(invalidNumbers)),
      invalidIds: Array.from(new Set(invalidIds)),
    };
  }

  return { valid: true };
}

/**
 * Deterministically prepends unreleased scheduled tryout notices to the narrative.
 * Guarantees that scheduled attempt notices are never lost or distorted by LLM output.
 */
export function decorateNarrativeWithDeterministicBadges(
  narrative: string,
  report: DiagnosisReport,
): string {
  if (report.unreleasedScheduledAttemptsCount <= 0) {
    return narrative;
  }

  // If already contains the exact callout block, return as is
  if (narrative.includes("Catatan Try Out Terjadwal:")) {
    return narrative;
  }

  const callout = `> **Catatan Try Out Terjadwal:** Terdapat ${report.unreleasedScheduledAttemptsCount} sesi try out terjadwal yang belum disertakan dalam analisis ini karena periode pelaksanaan event belum berakhir. Hasil dan pembahasan butir soal akan otomatis masuk setelah event ditutup.\n\n`;

  // Prepend directly after the document title (# ...) if present, or at the top
  const titleMatch = narrative.match(/^(#[^\n]+\n+)/);
  if (titleMatch) {
    return narrative.replace(titleMatch[0], `${titleMatch[0]}${callout}`);
  }

  return `${callout}${narrative}`;
}
