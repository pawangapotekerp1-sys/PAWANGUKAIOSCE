import type { FindingCode, TemplateStatus } from "./types.ts";

export interface RecommendationTemplateDefinition {
  templateId: string;
  code: FindingCode;
  title: string;
  triggerCondition: string;
  status: TemplateStatus;
  /**
   * Slot yang WAJIB ada (bukan undefined/null) agar teks dapat dirender.
   * Tidak ada nilai cadangan: slot yang hilang membuat render gagal (throw),
   * sehingga laporan berbasis aturan tidak pernah menampilkan angka karangan.
   */
  requiredSlots: readonly string[];
  renderText: (slots: Record<string, unknown>) => string;
}

export interface RecommendationDraft {
  templateId: string;
  status: TemplateStatus;
  draftText: string;
}

/**
 * Mengambil slot wajib. Melempar error bila slot undefined/null.
 * Nilai 0, false, atau string kosong tetap dianggap valid (bukan "hilang").
 */
function requireSlot<T = unknown>(code: FindingCode, slots: Record<string, unknown>, key: string): T {
  const value = slots[key];
  if (value === undefined || value === null) {
    throw new Error(`[TEMPLATE SLOT MISSING] Template ${code} membutuhkan slot '${key}' tetapi tidak tersedia.`);
  }
  return value as T;
}

/**
 * Master Registry of Recommendation Templates.
 * Every template contains complete metadata: ID, code, trigger condition, status ('draft' | 'approved'),
 * required slots, and deterministic text generation.
 * Status 'approved' diberikan setelah peninjauan redaksi oleh user (ENGINE_VERSION 1.3.0).
 * NOTE: Never include clinical dosages, clinical claims, or invented facts outside the report object.
 */
export const RECOMMENDATION_TEMPLATES: Record<FindingCode, RecommendationTemplateDefinition> = {
  RECURRING_DISTRACTOR: {
    templateId: "TPL_RECURRING_DISTRACTOR_V1",
    code: "RECURRING_DISTRACTOR",
    title: "Pengecoh Berulang pada Butir Soal",
    triggerCondition: "Pengecoh yang sama dipilih pada butir soal yang sama (question_id) di >= 2 sesi try out berbeda.",
    status: "approved",
    requiredSlots: ["topicName", "optionKey", "count", "questionSummary"],
    renderText: (slots) => {
      const code = "RECURRING_DISTRACTOR";
      const topicName = requireSlot<string>(code, slots, "topicName");
      const optionKey = requireSlot<string>(code, slots, "optionKey");
      const count = requireSlot<number>(code, slots, "count");
      const questionSummary = requireSlot<string>(code, slots, "questionSummary");
      return `Pengecoh Berulang: Pada soal "${questionSummary}" (topik ${topicName}), Anda memilih opsi '${optionKey}' yang salah di ${count} sesi berbeda. Bandingkan opsi tersebut dengan kunci jawaban dan catat konsep yang membedakan keduanya.`;
    },
  },

  CONFIDENT_ERRORS_TOPIC: {
    templateId: "TPL_CONFIDENT_ERRORS_V1",
    code: "CONFIDENT_ERRORS_TOPIC",
    title: "Kesalahan Tanpa Ragu di Subtopik",
    triggerCondition: "Sampel topik >= 10 soal DAN terdapat >= 3 butir salah tanpa tanda ragu (proporsi >= 20% dari total soal topik).",
    status: "approved",
    requiredSlots: ["topicName", "count", "ratio", "totalQuestions"],
    renderText: (slots) => {
      const code = "CONFIDENT_ERRORS_TOPIC";
      const topicName = requireSlot<string>(code, slots, "topicName");
      const count = requireSlot<number>(code, slots, "count");
      const ratio = requireSlot<number>(code, slots, "ratio");
      const totalQuestions = requireSlot<number>(code, slots, "totalQuestions");
      return `Rekalibrasi Keyakinan Jawaban: Pada topik "${topicName}", terdapat ${count} butir salah (${ratio}% dari ${totalQuestions} butir soal topik) yang dijawab tanpa tanda ragu. Artinya ada konsep yang Anda yakini, padahal belum tepat. Cocokkan jawaban Anda dengan pembahasan resmi dan catat konsep yang meleset agar tidak mengulang kekeliruan serupa.`;
    },
  },

  PERSISTENT_WEAKNESS: {
    templateId: "TPL_PERSISTENT_WEAKNESS_V1",
    code: "PERSISTENT_WEAKNESS",
    title: "Kelemahan Persisten Lintas Sesi",
    triggerCondition: "Akurasi topik < 60% yang bertahan di >= 2 sesi try out dengan sampel topik memenuhi ambang (>= 10 soal indikatif, >= 20 soal utama).",
    status: "approved",
    requiredSlots: ["topicName", "accuracy", "attemptCount", "sampleStatus"],
    renderText: (slots) => {
      const code = "PERSISTENT_WEAKNESS";
      const topicName = requireSlot<string>(code, slots, "topicName");
      const accuracy = requireSlot<number>(code, slots, "accuracy");
      const attemptCount = requireSlot<number>(code, slots, "attemptCount");
      const sampleStatus = requireSlot<string>(code, slots, "sampleStatus");
      // isConsecutive opsional: bila tidak ada, kata "berurutan" tidak ditampilkan (tidak mengarang angka).
      const consecutiveText = slots.isConsecutive === true ? " berurutan" : "";
      return `Penguatan Fondasi Teori: Akurasi topik "${topicName}" sebesar ${accuracy}% (${sampleStatus}) di ${attemptCount} sesi try out${consecutiveText}. Jadwalkan pendalaman materi dari literatur acuan resmi untuk membangun pemahaman konseptual yang kokoh sebelum melanjutkan latihan berikutnya.`;
    },
  },

  RUSHED_WRONG: {
    templateId: "TPL_RUSHED_WRONG_V1",
    code: "RUSHED_WRONG",
    title: "Pengerjaan Terburu-buru pada Soal Salah",
    triggerCondition: "Sampel global >= 100 soal DAN proporsi butir salah-cepat (z < -0.8 terhadap rata-rata waktu siswa sendiri) mencapai >= 5% dari total jawaban.",
    status: "approved",
    requiredSlots: ["count", "ratio"],
    renderText: (slots) => {
      const code = "RUSHED_WRONG";
      const count = requireSlot<number>(code, slots, "count");
      const ratio = requireSlot<number>(code, slots, "ratio");
      return `Pengendalian Ritme Pengerjaan: Terdapat ${count} butir salah (${ratio}% dari total jawaban) yang dikerjakan lebih cepat dari rata-rata waktu Anda sendiri. Biasakan membaca ulang inti pertanyaan dan kata kunci dalam skenario soal sebelum menetapkan pilihan jawaban.`;
    },
  },

  LATE_SESSION_DROP: {
    templateId: "TPL_LATE_SESSION_DROP_V1",
    code: "LATE_SESSION_DROP",
    title: "Penurunan Akurasi Kuartil Akhir Sesi",
    triggerCondition: "Sampel global >= 100 soal DAN akurasi kuartil akhir sesi (posisi >= 0.75) merosot >= 20 poin persentase dibandingkan 3 kuartil awal.",
    status: "approved",
    requiredSlots: ["dropPercentage"],
    renderText: (slots) => {
      const code = "LATE_SESSION_DROP";
      const dropPercentage = requireSlot<number>(code, slots, "dropPercentage");
      return `Manajemen Performa Akhir Sesi: Akurasi mengalami penurunan sebesar ${dropPercentage} poin persentase pada kuartil akhir sesi ujian. Penurunan ini dapat terkait kelelahan kognitif, keterbatasan sisa waktu, atau tingkat kesulitan butir soal di akhir sesi. Disarankan memperbanyak latihan simulasi blok penuh dan menerapkan pembagian alokasi waktu yang konsisten agar ketelitian tetap terjaga hingga butir terakhir.`;
    },
  },

  NET_ANSWER_CHANGE: {
    templateId: "TPL_NET_ANSWER_CHANGE_V1",
    code: "NET_ANSWER_CHANGE",
    title: "Perubahan Jawaban Berdampak Negatif",
    triggerCondition: "Sampel global >= 100 soal DAN pengubahan benar->salah melampaui salah->benar (minimal 2 kali).",
    status: "approved",
    requiredSlots: ["changedCorrectToWrong", "changedWrongToCorrect"],
    renderText: (slots) => {
      const code = "NET_ANSWER_CHANGE";
      const cToW = requireSlot<number>(code, slots, "changedCorrectToWrong");
      const wToC = requireSlot<number>(code, slots, "changedWrongToCorrect");
      return `Disiplin Pergantian Jawaban: Dalam data Anda, perubahan jawaban dari benar ke salah (${cToW} kali) lebih sering terjadi daripada dari salah ke benar (${wToC} kali). Biasakan untuk mengubah pilihan jawaban hanya bila Anda menemukan alasan atau data konkret yang membuktikan kekeliruan interpretasi awal.`;
    },
  },

  FRAGILE_KNOWLEDGE: {
    templateId: "TPL_FRAGILE_KNOWLEDGE_V1",
    code: "FRAGILE_KNOWLEDGE",
    title: "Pemahaman Rentan Ragu",
    triggerCondition: "Sampel topik >= 10 soal DAN proporsi jawaban benar yang ditandai ragu pada topik mencapai >= 30%.",
    status: "approved",
    requiredSlots: ["topicName", "doubtfulRatio"],
    renderText: (slots) => {
      const code = "FRAGILE_KNOWLEDGE";
      const topicName = requireSlot<string>(code, slots, "topicName");
      const doubtfulRatio = requireSlot<number>(code, slots, "doubtfulRatio");
      return `Stabilisasi Pemahaman Ragu: Pada topik "${topicName}", sebanyak ${doubtfulRatio}% jawaban benar masih dikerjakan dengan tanda ragu-ragu. Hal ini menandakan pemahaman konsep yang sudah mengarah tepat namun belum kokoh. Lakukan pemantapan materi dan ringkas poin-poin kunci untuk mengonfirmasi keyakinan konsep Anda.`;
    },
  },

  IMPROVING: {
    templateId: "TPL_IMPROVING_V1",
    code: "IMPROVING",
    title: "Tren Peningkatan Konsisten",
    triggerCondition: "Minimal 10 soal pada periode awal dan akhir, dengan kenaikan akurasi periode akhir >= 15 poin persentase (dan akurasi akhir >= 50%).",
    status: "approved",
    requiredSlots: ["topicName", "initialAccuracy", "latestAccuracy", "pointsIncrease"],
    renderText: (slots) => {
      const code = "IMPROVING";
      const topicName = requireSlot<string>(code, slots, "topicName");
      const initialAcc = requireSlot<number>(code, slots, "initialAccuracy");
      const latestAcc = requireSlot<number>(code, slots, "latestAccuracy");
      const points = requireSlot<number>(code, slots, "pointsIncrease");
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
 * Throws [TEMPLATE SLOT MISSING] when a required slot is undefined/null.
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
 * When requireApproved is true, throws an Error if any template in the registry is still in 'draft' status.
 */
export function validateTemplateApproval(
  requireApproved = false,
  templates: Record<string, RecommendationTemplateDefinition> = RECOMMENDATION_TEMPLATES,
): void {
  if (!requireApproved) return;

  const draftTemplates = Object.values(templates)
    .filter((tpl) => tpl.status === "draft")
    .map((tpl) => `${tpl.templateId} (${tpl.code})`);

  if (draftTemplates.length > 0) {
    throw new Error(
      `[PRODUCTION CHECK FAILED] Terdapat ${draftTemplates.length} template rekomendasi yang masih berstatus DRAFT: ${draftTemplates.join(", ")}. Semua template harus disetujui ('approved') sebelum masuk produksi.`,
    );
  }
}
