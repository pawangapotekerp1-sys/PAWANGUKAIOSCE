import type { DiagnosisReport } from "./types.ts";

/**
 * Deterministically renders structured diagnosis reports into clear, informative Markdown.
 * Used when BYOK Gemini is not configured, or if Gemini calls fail/timeout.
 * NOTE: Never displays the word 'DRAFT' anywhere in the output.
 */
export function renderFallbackMarkdown(report: DiagnosisReport): string {
  const lines: string[] = [];

  lines.push("# Laporan Analisis Kelemahan Belajar");
  lines.push(`*Versi Engine: ${report.version} | Mode Analisis: ${report.mode.toUpperCase()}*`);
  lines.push("");

  // Notice for pending/unreleased scheduled attempts
  if (report.unreleasedScheduledAttemptsCount > 0) {
    lines.push(
      `> **Catatan Try Out Terjadwal:** Terdapat ${report.unreleasedScheduledAttemptsCount} sesi try out terjadwal yang belum disertakan dalam analisis ini karena periode pelaksanaan event belum berakhir. Hasil dan pembahasan butir soal akan otomatis masuk setelah event ditutup.`,
    );
    lines.push("");
  }

  // 1. Ringkasan Kinerja
  lines.push("## 1. Ringkasan Kinerja");
  lines.push(`- **Total Sesi Try Out:** ${report.totalAttempts}`);
  lines.push(`- **Total Butir Soal Teranalisis:** ${report.totalQuestions}`);
  lines.push(`- **Akurasi Kumulatif:** ${report.overallAccuracy.toFixed(1)}%`);
  lines.push("");

  // 2. Karakteristik Kesalahan
  lines.push("## 2. Profil Karakteristik Kesalahan");
  lines.push("Berdasarkan waktu respon, perilaku ragu-ragu, dan distorsi pilihan jawaban:");
  lines.push(`- **Miskonsepsi (Distraktor Kuat Berulang):** ${report.classifiedErrorCounts.miskonsepsi} butir`);
  lines.push(`- **Celah Pengetahuan (Ragu / Berpikir Panjang):** ${report.classifiedErrorCounts.celah_pengetahuan} butir`);
  lines.push(`- **Kecerobohan (Terlalu Cepat Tanpa Ragu):** ${report.classifiedErrorCounts.ceroboh} butir`);
  lines.push(`- **Kendala Manajemen Waktu Akhir Sesi:** ${report.classifiedErrorCounts.kehabisan_waktu} butir`);
  lines.push("");

  // 3. Temuan Prioritas & Rekomendasi Studi
  lines.push("## 3. Temuan Prioritas & Rekomendasi Studi");
  if (report.topFindings.length === 0) {
    lines.push("Belum ditemukan pola kelemahan spesifik yang signifikan dari data yang ada. Pertahankan konsistensi latihan soal.");
  } else {
    report.topFindings.forEach((finding, index) => {
      lines.push(`### ${index + 1}. ${finding.title}`);
      lines.push(`- **Indikator Bukti:** ${finding.evidenceSummary}`);
      lines.push(`- **Rekomendasi Tindakan:**`);
      lines.push(`  > ${finding.recommendationDraft}`);
      lines.push("");
    });
  }

  // 4. Catatan Evaluasi Belajar
  lines.push("## 4. Disiplin Ujian & Rekomendasi Belajar");
  lines.push("Fokuskan sesi perbaikan pada pemahaman konseptual literatur acuan resmi serta perhatikan ritme waktu per butir soal untuk memaksimalkan akurasi pada ujian sesungguhnya.");

  return lines.join("\n");
}
