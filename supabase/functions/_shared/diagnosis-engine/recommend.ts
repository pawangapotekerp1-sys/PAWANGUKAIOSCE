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
 * All templates remain 'draft' until explicit approval by user.
 * NOTE: Never include clinical dosages, clinical claims, or invented facts outside the report object.
 */
export const RECOMMENDATION_TEMPLATES: Record<FindingCode, RecommendationTemplateDefinition> = {
  RECURRING_DISTRACTOR: {
    templateId: "TPL_RECURRING_DISTRACTOR_V1",
    code: "RECURRING_DISTRACTOR",
    title: "Pengecoh Berulang pada Butir Soal",
    triggerCondition: "Pengecoh yang sama dipilih pada butir soal yang sama (question_id) di >= 2 sesi try out berbeda.",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const optionKey = (slots.optionKey as string) || "tertentu";
      const count = slots.count ?? 2;
      const questionSummary = (slots.questionSummary as string) || "Soal terkait";
      return `Evaluasi Distraktor Berulang: Pada butir soal "${questionSummary}" (topik ${topicName}), opsi '${optionKey}' dipilih berulang sebanyak ${count} kali di sesi try out yang berbeda sebagai jawaban salah. Disarankan menelaah kembali materi pembeda antara opsi tersebut dengan konsep kunci jawaban yang tepat agar tidak terjebak pola distorsi pemahaman yang sama.`;
    },
  },

  CONFIDENT_ERRORS_TOPIC: {
    templateId: "TPL_CONFIDENT_ERRORS_V1",
    code: "CONFIDENT_ERRORS_TOPIC",
    title: "Kesalahan Tanpa Ragu di Subtopik",
    triggerCondition: "Sampel topik >= 10 soal DAN terdapat >= 3 butir salah tanpa tanda ragu (proporsi >= 20% dari total soal topik).",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const count = slots.count ?? 3;
      const ratio = slots.ratio !== undefined ? slots.ratio : 20;
      return `Rekalibrasi Keyakinan Jawaban: Pada topik "${topicName}", terdeteksi ${count} butir salah (${ratio}% dari total soal) yang dijawab tanpa tanda ragu. Pola ini mengindikasikan keyakinan semu pada materi yang belum sepenuhnya dikuasai. Cocokkan jawaban Anda dengan pembahasan resmi dan catat konsep yang meleset agar tidak mengulang kekeliruan serupa.`;
    },
  },

  PERSISTENT_WEAKNESS: {
    templateId: "TPL_PERSISTENT_WEAKNESS_V1",
    code: "PERSISTENT_WEAKNESS",
    title: "Kelemahan Persisten Lintas Sesi",
    triggerCondition: "Akurasi topik < 60% yang bertahan di >= 2 sesi try out dengan sampel topik memenuhi ambang (>= 10 soal indikatif, >= 20 soal utama).",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const accuracy = slots.accuracy ?? 0;
      const attemptCount = slots.attemptCount ?? 2;
      const sampleStatus = (slots.sampleStatus as string) || "sampel indikatif";
      const consecutiveText = slots.isConsecutive ? " berurutan" : "";
      return `Penguatan Fondasi Teori: Akurasi pada topik "${topicName}" berada pada tingkat ${accuracy}% (${sampleStatus}) di ${attemptCount} sesi try out${consecutiveText}. Jadwalkan pendalaman materi dari literatur acuan resmi untuk membangun pemahaman konseptual yang kokoh sebelum melanjutkan latihan berikutnya.`;
    },
  },

  RUSHED_WRONG: {
    templateId: "TPL_RUSHED_WRONG_V1",
    code: "RUSHED_WRONG",
    title: "Pengerjaan Terburu-buru pada Soal Salah",
    triggerCondition: "Sampel global >= 100 soal DAN proporsi butir salah-cepat (z < -0.8) mencapai >= 5% dari total jawaban.",
    status: "draft",
    renderText: (slots) => {
      const count = slots.count ?? 3;
      const ratio = slots.ratio !== undefined ? slots.ratio : 5;
      return `Pengendalian Ritme Pengerjaan: Terdapat ${count} butir salah (${ratio}% dari total soal) yang dikerjakan dengan kecepatan jauh melampaui rata-rata. Biasakan membaca ulang inti pertanyaan dan kata kunci dalam skenario soal sebelum menetapkan pilihan jawaban.`;
    },
  },

  LATE_SESSION_DROP: {
    templateId: "TPL_LATE_SESSION_DROP_V1",
    code: "LATE_SESSION_DROP",
    title: "Penurunan Akurasi Kuartil Akhir Sesi",
    triggerCondition: "Sampel global >= 100 soal DAN akurasi kuartil akhir sesi (posisi >= 0.75) merosot >= 20 poin persentase dibandingkan 3 kuartil awal.",
    status: "draft",
    renderText: (slots) => {
      const dropPercentage = slots.dropPercentage ?? 20;
      return `Manajemen Performa Akhir Sesi: Akurasi mengalami penurunan sebesar ${dropPercentage} poin persentase pada kuartil akhir sesi ujian. Penurunan ini dapat terkait kelelahan kognitif, keterbatasan sisa waktu, atau tingkat kesulitan butir soal di akhir sesi. Disarankan memperbanyak latihan simulasi blok penuh dan menerapkan pembagian alokasi waktu yang konsisten agar ketelitian tetap terjaga hingga butir terakhir.`;
    },
  },

  NET_ANSWER_CHANGE: {
    templateId: "TPL_NET_ANSWER_CHANGE_V1",
    code: "NET_ANSWER_CHANGE",
    title: "Perubahan Jawaban Berdampak Negatif",
    triggerCondition: "Sampel global >= 100 soal DAN pengubahan benar->salah melampaui salah->benar (minimal 2 kali).",
    status: "draft",
    renderText: (slots) => {
      const cToW = slots.changedCorrectToWrong ?? 0;
      const wToC = slots.changedWrongToCorrect ?? 0;
      return `Disiplin Pergantian Jawaban: Dalam data Anda, perubahan jawaban dari benar ke salah (${cToW} kali) lebih sering terjadi daripada dari salah ke benar (${wToC} kali). Biasakan untuk mengubah pilihan jawaban hanya bila Anda menemukan alasan atau data konkret yang membuktikan kekeliruan interpretasi awal.`;
    },
  },

  FRAGILE_KNOWLEDGE: {
    templateId: "TPL_FRAGILE_KNOWLEDGE_V1",
    code: "FRAGILE_KNOWLEDGE",
    title: "Pemahaman Rentan Ragu",
    triggerCondition: "Sampel topik >= 10 soal DAN proporsi jawaban benar yang ditandai ragu pada topik mencapai >= 30%.",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const doubtfulRatio = slots.doubtfulRatio ?? 30;
      return `Stabilisasi Pemahaman Ragu: Pada topik "${topicName}", sebanyak ${doubtfulRatio}% jawaban benar masih dikerjakan dengan tanda ragu-ragu. Hal ini menandakan pemahaman konsep yang sudah mengarah tepat namun belum kokoh. Lakukan pemantapan materi dan ringkas poin-poin kunci untuk mengonfirmasi keyakinan konsep Anda.`;
    },
  },

  IMPROVING: {
    templateId: "TPL_IMPROVING_V1",
    code: "IMPROVING",
    title: "Tren Peningkatan Konsisten",
    triggerCondition: "Minimal 10 soal pada periode awal dan akhir, dengan kenaikan akurasi periode akhir >= 15 poin persentase (dan akurasi akhir >= 50%).",
    status: "draft",
    renderText: (slots) => {
      const topicName = (slots.topicName as string) || "Topik terkait";
      const initialAcc = slots.initialAccuracy ?? 0;
      const latestAcc = slots.latestAccuracy ?? 0;
      const points = slots.pointsIncrease ?? (Number(latestAcc) - Number(initialAcc));
      return `Penguatan Tren Positif: Akurasi pada topik "${topicName}" meningkat ${points} poin persentase (dari ${initialAcc}% menjadi ${latestAcc}%). Pertahankan pola belajar Anda pada topik ini untuk menjaga retensi pemahaman jangka panjang.`;
    },
  },
};

/**
 * Helper to build a clean question summary snippet for recommendation text (max 60 chars).
 */
export function formatQuestionSummary(questionText?: string | null, questionId?: string): string {
  if (questionText && questionText.trim().length > 0) {
    const clean = questionText.trim().replace(/\s+/g, " ");
    return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
  }
  if (questionId) {
    return `Butir #${questionId.slice(0, 8)}`;
  }
  return "Butir Soal";
}

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
 * When requireApproved is true, throws an Error if any template is still in 'draft' status.
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
