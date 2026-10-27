export const ENGINE_VERSION = "1.1.0";

export const DIAGNOSIS_CONFIG = {
  version: ENGINE_VERSION,
  bayesianSmoothingK: 5,
  sampleThresholds: {
    subtopicDropBelow: 10,
    subtopicIndicativeMin: 10,       // Minimal 10 soal untuk status indikatif
    subtopicPrimaryMin: 20,          // Minimal 20 soal untuk status utama
    globalBehaviorMinQuestions: 100, // Minimal 100 soal terjawab global untuk temuan perilaku global
    recurringDistractorMinAttempts: 2, // Minimal 2 attempt memilih pengecoh sama pada butir soal yang sama
    trendMinQuestionsPerPeriod: 10,  // Minimal 10 soal per periode (awal & akhir) untuk tren IMPROVING
    fragileKnowledgeMinQuestions: 10,// Minimal 10 soal pada subtopik untuk FRAGILE_KNOWLEDGE
  },
  behaviorThresholds: {
    slowZScore: 1.0,                 // Z-score waktu lambat (celah_pengetahuan)
    rushedZScore: -0.8,              // Z-score waktu terburu-buru (ceroboh & RUSHED_WRONG)
    lateSessionPositionRatio: 0.85,  // Posisi sesi akhir (kehabisan_waktu: 15% terakhir)
    timeTroubleMaxSeconds: 30,       // Batas durasi kehabisan waktu (< 30 detik)
    lateSessionDropRatio: 0.75,      // Batas kuartil akhir sesi (LATE_SESSION_DROP: 25% terakhir)
    lateSessionDropThresholdPoints: 20, // Penurunan akurasi minimal 20 poin persentase pada kuartil akhir
    lateSessionDropMetric: "percentage_points" as const,
    rushedWrongMinRatio: 0.05,       // Proporsi butir salah-cepat terhadap total jawaban (>= 5%)
    fragileKnowledgeDoubtfulCorrectRatio: 0.30, // Proporsi jawaban BENAR yang ditandai ragu pada topik (>= 30%)
    confidentErrorsTopicMinCount: 3, // Minimal salah tanpa ragu pada topik
    persistentWeaknessMaxAccuracy: 60, // Batas akurasi kelemahan persisten (< 60%)
  },
  rateLimits: {
    cooldownSeconds: 30,
  },
  ai: {
    defaultModel: "gemini-3.8-flash",
    maxOutputTokens: 1800,
    temperature: 0.2,
  },
  flags: {
    requireApprovedTemplates: false, // Flag produksi: jika true, gagal bila ada template berstatus draft
  },
} as const;

export type DiagnosisConfig = typeof DIAGNOSIS_CONFIG;
