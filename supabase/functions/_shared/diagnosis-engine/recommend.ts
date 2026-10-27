import type { FindingCode } from "./types.ts";

export interface RecommendationDraft {
  templateId: string;
  draftText: string;
}

/**
 * Builds slatted recommendation draft text based on the finding code and slots.
 * NOTE: All recommendation templates are prefixed with [DRAFT] per user requirement.
 * NOTE: Never include clinical dosages or invented clinical facts.
 */
export function buildRecommendationDraft(
  code: FindingCode,
  slots: Record<string, unknown>,
): RecommendationDraft {
  const topicName = (slots.topicName as string) || "Topik terkait";

  switch (code) {
    case "RECURRING_DISTRACTOR": {
      const optionKey = (slots.optionKey as string) || "tertentu";
      const count = slots.count ?? 2;
      return {
        templateId: "TPL_DRAFT_RECURRING_DISTRACTOR_V1",
        draftText: `[DRAFT] Evaluasi Distraktor Pengecoh: Pada topik "${topicName}", opsi '${optionKey}' dipilih berulang sebanyak ${count} kali sebagai jawaban salah. Disarankan menelaah kembali materi pembeda antara opsi tersebut dengan konsep kunci jawaban yang tepat agar tidak terjebak pola distorsi pemahaman yang sama.`,
      };
    }

    case "CONFIDENT_ERRORS_TOPIC": {
      const count = slots.count ?? 3;
      return {
        templateId: "TPL_DRAFT_CONFIDENT_ERRORS_V1",
        draftText: `[DRAFT] Rekalibrasi Keyakinan Jawaban: Pada topik "${topicName}", terdeteksi ${count} soal dijawab keliru tanpa tanda ragu. Pola ini mengindikasikan keyakinan semu pada pemahaman yang belum akurat. Luangkan waktu untuk mereviu ulang definisi prinsip dasar topik ini dan jangan tergesa-gesa mengandalkan intuisi awal.`,
      };
    }

    case "PERSISTENT_WEAKNESS": {
      const accuracy = slots.accuracy ?? 0;
      const attemptCount = slots.attemptCount ?? 3;
      return {
        templateId: "TPL_DRAFT_PERSISTENT_WEAKNESS_V1",
        draftText: `[DRAFT] Penguatan Fondasi Teori Berkelanjutan: Akurasi pada topik "${topicName}" bertahan rendah (${accuracy}%) di ${attemptCount} sesi try out berurutan. Jadwalkan sesi pendalaman literatur acuan resmi untuk membangun pemahaman konseptual yang kokoh sebelum melanjutkan latihan soal berikutnya.`,
      };
    }

    case "RUSHED_WRONG": {
      const count = slots.count ?? 3;
      return {
        templateId: "TPL_DRAFT_RUSHED_WRONG_V1",
        draftText: `[DRAFT] Pacing dan Pengendalian Kecepatan: Terdapat ${count} soal salah yang dijawab dengan kecepatan jauh melebihi rata-rata (durasi terlalu singkat). Terapkan jeda observasi minimal 30–45 detik untuk membaca seluruh kata kunci dalam skenario soal sebelum menetapkan pilihan.`,
      };
    }

    case "LATE_SESSION_DROP": {
      const dropPercentage = slots.dropPercentage ?? 20;
      return {
        templateId: "TPL_DRAFT_LATE_SESSION_DROP_V1",
        draftText: `[DRAFT] Manajemen Stamina Akhir Sesi: Akurasi mengalami penurunan sebesar ${dropPercentage}% pada kuartil akhir sesi pengerjaan. Kondisi ini mencerminkan kelelahan kognitif. Latihlah teknik pernapasan teratur dan pembagian alokasi waktu stabil agar ketajaman analisis tetap terjaga hingga butir soal terakhir.`,
      };
    }

    case "NET_ANSWER_CHANGE": {
      const cToW = slots.changedCorrectToWrong ?? 0;
      const wToC = slots.changedWrongToCorrect ?? 0;
      return {
        templateId: "TPL_DRAFT_NET_ANSWER_CHANGE_V1",
        draftText: `[DRAFT] Disiplin Pergantian Jawaban: Frekuensi pengubahan jawaban dari benar ke salah (${cToW} kali) melebihi pengubahan dari salah ke benar (${wToC} kali). Pegang prinsip bahwa pilihan pertama umumnya didasari rekognisi memori yang valid, kecuali jika ditemukan kesalahan interpretasi baca yang nyata.`,
      };
    }

    case "FRAGILE_KNOWLEDGE": {
      const confidentAcc = slots.confidentAccuracy ?? 0;
      const doubtfulAcc = slots.doubtfulAccuracy ?? 0;
      return {
        templateId: "TPL_DRAFT_FRAGILE_KNOWLEDGE_V1",
        draftText: `[DRAFT] Stabilisasi Pemahaman Ragu: Pada topik "${topicName}", akurasi saat mantap mencapai ${confidentAcc}%, namun merosot ke ${doubtfulAcc}% saat ragu. Ini menandakan penguasaan konsep yang masih parsial. Buat bagan ringkasan komparasi untuk memperjelas batas-batas konsep yang membingungkan.`,
      };
    }

    case "IMPROVING": {
      const initialAcc = slots.initialAccuracy ?? 0;
      const latestAcc = slots.latestAccuracy ?? 0;
      return {
        templateId: "TPL_DRAFT_IMPROVING_V1",
        draftText: `[DRAFT] Penguatan Tren Positif: Akurasi topik "${topicName}" menunjukkan peningkatan konsisten dari ${initialAcc}% menjadi ${latestAcc}%. Pertahankan metode telaah soal yang saat ini digunakan untuk mempertahankan retensi pemahaman jangka panjang.`,
      };
    }

    default:
      return {
        templateId: "TPL_DRAFT_GENERIC_V1",
        draftText: `[DRAFT] Tinjau kembali evaluasi hasil sesi untuk memperdalam bagian yang masih memerlukan penguatan konsep.`,
      };
  }
}
