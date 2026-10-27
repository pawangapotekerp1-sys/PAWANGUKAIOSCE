import type { FindingCode, TemplateStatus } from "./types.ts";

export interface RecommendationTemplateDefinition {
  templateId: string;
  code: FindingCode;
  title: string;
  triggerCondition: string;
  status: TemplateStatus;
  renderText: (slots: Record<string, unknown>) => string;
}

export interface RecommendationDraft {
  templateId: string;
  status: TemplateStatus;
  draftText: string;
}

/**
 * Master Registry of Recommendation Templates.
 * Every template contains complete metadata: ID, code, trigger condition, status ('draft' | 'approved'),
 * and deterministic text generation.
 * NOTE: Never include clinical dosages, clinical claims, or invented facts outside the report object.
 */
export const RECOMMENDATION_TEMPLATES: Record<FindingCode, RecommendationTemplateDefinition> = {
  RECURRING_DISTRACTOR: {
    templateId: "TPL_RECURRING_DISTRACTOR_V1",
    code: "RECURRING_DISTRACTOR",
    title: "Pengecoh Berulang pada Subtopik",
    triggerCondition: "Opsi pengecoh yang sama dipilih >= 3 kali pada minimal 2 sesi try out berbeda dalam topik yang sama.",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const optionKey = (slots.optionKey as string) || "tertentu";
      const count = slots.count ?? 3;
      return `Evaluasi Distraktor Pengecoh: Pada topik "${topicName}", opsi '${optionKey}' dipilih berulang sebanyak ${count} kali sebagai jawaban salah. Disarankan menelaah kembali materi pembeda antara opsi tersebut dengan konsep kunci jawaban yang tepat agar tidak terjebak pola distorsi pemahaman yang sama.`;
    },
  },

  CONFIDENT_ERRORS_TOPIC: {
    templateId: "TPL_CONFIDENT_ERRORS_V1",
    code: "CONFIDENT_ERRORS_TOPIC",
    title: "Kesalahan Tanpa Ragu di Subtopik",
    triggerCondition: "Terjadi >= 3 jawaban salah tanpa tanda ragu (was_ever_flagged_ragu = false) pada topik yang sama.",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const count = slots.count ?? 3;
      return `Rekalibrasi Keyakinan Jawaban: Pada topik "${topicName}", terdeteksi ${count} soal dijawab keliru tanpa tanda ragu. Pola ini mengindikasikan keyakinan semu pada pemahaman yang belum akurat. Luangkan waktu untuk mereviu ulang definisi prinsip dasar topik ini dan jangan tergesa-gesa mengandalkan intuisi awal.`;
    },
  },

  PERSISTENT_WEAKNESS: {
    templateId: "TPL_PERSISTENT_WEAKNESS_V1",
    code: "PERSISTENT_WEAKNESS",
    title: "Kelemahan Persisten Lintas Sesi",
    triggerCondition: "Akurasi topik < 60% yang bertahan di >= 2 sesi try out dengan total minimal 4 soal.",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const accuracy = slots.accuracy ?? 0;
      const attemptCount = slots.attemptCount ?? 2;
      return `Penguatan Fondasi Teori Berkelanjutan: Akurasi pada topik "${topicName}" bertahan rendah (${accuracy}%) di ${attemptCount} sesi try out berurutan. Jadwalkan sesi pendalaman literatur acuan resmi untuk membangun pemahaman konseptual yang kokoh sebelum melanjutkan latihan soal berikutnya.`;
    },
  },

  RUSHED_WRONG: {
    templateId: "TPL_RUSHED_WRONG_V1",
    code: "RUSHED_WRONG",
    title: "Pengerjaan Terburu-buru pada Soal Salah",
    triggerCondition: "Sampel global >= 100 soal DAN terdapat >= 3 butir salah dengan durasi sangat cepat (z-score < -0.8).",
    status: "draft",
    renderText: (slots) => {
      const count = slots.count ?? 3;
      return `Pacing dan Pengendalian Kecepatan: Terdapat ${count} butir salah yang dikerjakan dengan durasi abnormal (jauh lebih cepat dari rata-rata). Terapkan jeda observasi minimal 30–45 detik untuk membaca seluruh kata kunci dalam skenario soal sebelum menetapkan pilihan.`;
    },
  },

  LATE_SESSION_DROP: {
    templateId: "TPL_LATE_SESSION_DROP_V1",
    code: "LATE_SESSION_DROP",
    title: "Penurunan Konsentrasi Akhir Sesi",
    triggerCondition: "Sampel global >= 100 soal DAN akurasi kuartil akhir sesi (posisi >= 0.75) merosot >= 20% dibandingkan 3 kuartil awal.",
    status: "draft",
    renderText: (slots) => {
      const dropPercentage = slots.dropPercentage ?? 20;
      return `Manajemen Stamina Akhir Sesi: Akurasi mengalami penurunan sebesar ${dropPercentage}% pada kuartil akhir sesi pengerjaan. Kondisi ini mencerminkan kelelahan kognitif. Latihlah teknik pernapasan teratur dan pembagian alokasi waktu stabil agar ketajaman analisis tetap terjaga hingga butir soal terakhir.`;
    },
  },

  NET_ANSWER_CHANGE: {
    templateId: "TPL_NET_ANSWER_CHANGE_V1",
    code: "NET_ANSWER_CHANGE",
    title: "Perubahan Jawaban Berdampak Negatif",
    triggerCondition: "Sampel global >= 100 soal DAN pergantian jawaban dari benar ke salah melampaui pergantian dari salah ke benar (minimal 2 kali).",
    status: "draft",
    renderText: (slots) => {
      const cToW = slots.changedCorrectToWrong ?? 0;
      const wToC = slots.changedWrongToCorrect ?? 0;
      return `Disiplin Pergantian Jawaban: Frekuensi pengubahan jawaban dari benar ke salah (${cToW} kali) melebihi pengubahan dari salah ke benar (${wToC} kali). Pegang prinsip bahwa pilihan pertama umumnya didasari rekognisi memori yang valid, kecuali jika ditemukan kesalahan interpretasi baca yang nyata.`;
    },
  },

  FRAGILE_KNOWLEDGE: {
    templateId: "TPL_FRAGILE_KNOWLEDGE_V1",
    code: "FRAGILE_KNOWLEDGE",
    title: "Pemahaman Rentan Ragu",
    triggerCondition: "Akurasi saat yakin >= 70% namun akurasi saat ragu-ragu <= 40% pada topik yang sama.",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const confidentAcc = slots.confidentAccuracy ?? 0;
      const doubtfulAcc = slots.doubtfulAccuracy ?? 0;
      return `Stabilisasi Pemahaman Ragu: Pada topik "${topicName}", akurasi saat mantap mencapai ${confidentAcc}%, namun merosot ke ${doubtfulAcc}% saat ragu. Ini menandakan penguasaan konsep yang masih parsial. Buat bagan ringkasan komparasi untuk memperjelas batas-batas konsep yang membingungkan.`;
    },
  },

  IMPROVING: {
    templateId: "TPL_IMPROVING_V1",
    code: "IMPROVING",
    title: "Tren Peningkatan Konsisten",
    triggerCondition: "Minimal 10 soal pada periode awal dan akhir, dengan kenaikan akurasi periode akhir >= 15% (dan akurasi akhir >= 50%).",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const initialAcc = slots.initialAccuracy ?? 0;
      const latestAcc = slots.latestAccuracy ?? 0;
      return `Penguatan Tren Positif: Akurasi topik "${topicName}" menunjukkan peningkatan konsisten dari ${initialAcc}% menjadi ${latestAcc}%. Pertahankan metode telaah soal yang saat ini digunakan untuk mempertahankan retensi pemahaman jangka panjang.`;
    },
  },
};

/**
 * Builds recommendation draft text based on finding code and slots.
 */
export function buildRecommendationDraft(
  code: FindingCode,
  slots: Record<string, unknown>,
): RecommendationDraft {
  const template = RECOMMENDATION_TEMPLATES[code];
  if (!template) {
    return {
      templateId: "TPL_GENERIC_V1",
      status: "draft",
      draftText: "Tinjau kembali evaluasi hasil sesi untuk memperdalam bagian yang masih memerlukan penguatan konsep.",
    };
  }

  return {
    templateId: template.templateId,
    status: template.status,
    draftText: template.renderText(slots),
  };
}

/**
 * Production gate validator:
 * When requireApproved is true (e.g. in production or strict CI), throws an Error
 * if any template is still in 'draft' status.
 */
export function validateTemplateApproval(requireApproved = false): void {
  if (!requireApproved) return;

  const draftTemplates = Object.values(RECOMMENDATION_TEMPLATES)
    .filter((tpl) => tpl.status === "draft")
    .map((tpl) => `${tpl.templateId} (${tpl.code})`);

  if (draftTemplates.length > 0) {
    throw new Error(
      `[PRODUCTION CHECK FAILED] Terdapat ${draftTemplates.length} template rekomendasi yang masih berstatus DRAFT: ${draftTemplates.join(", ")}. Semua template harus disetujui ('approved') sebelum masuk produksi.`,
    );
  }
}
