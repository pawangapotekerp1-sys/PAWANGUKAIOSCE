export const ENGINE_VERSION = "1.1.0";

export const DIAGNOSIS_CONFIG = {
  version: ENGINE_VERSION,
  bayesianSmoothingK: 5,
  sampleThresholds: {
    subtopicDropBelow: 10,
    subtopicIndicativeMin: 10,
    subtopicPrimaryMin: 20,
    globalBehaviorMinQuestions: 100, // Minimal 100 soal terjawab global untuk temuan perilaku global
    recurringDistractorMinCount: 3,  // Minimal 3 kali kemunculan untuk RECURRING_DISTRACTOR
    recurringDistractorMinTryouts: 2,// Minimal 2 try out berbeda untuk RECURRING_DISTRACTOR
    trendMinQuestionsPerPeriod: 10,  // Minimal 10 soal per periode (awal & akhir) untuk tren IMPROVING
    recurringDistractorInTopicThreshold: 2, // Minimal 2 kali untuk tag miskonsepsi dalam subtopik
  },
  behaviorThresholds: {
    slowZScore: 1.0,                 // Z-score waktu lambat (celah_pengetahuan)
    rushedZScore: -0.8,              // Z-score waktu terburu-buru (ceroboh & RUSHED_WRONG)
    lateSessionPositionRatio: 0.85,  // Posisi sesi akhir (kehabisan_waktu: 15% terakhir)
    timeTroubleMaxSeconds: 30,       // Batas durasi kehabisan waktu (< 30 detik)
    lateSessionDropRatio: 0.75,      // Batas kuartil akhir sesi (LATE_SESSION_DROP: 25% terakhir)
    lateSessionDropMinPercentage: 20,// Penurunan akurasi minimal 20% pada kuartil akhir
    confidentErrorsTopicMinCount: 3, // Minimal salah tanpa ragu pada topik
    persistentWeaknessMaxAccuracy: 60, // Batas akurasi kelemahan persisten (< 60%)
    fragileKnowledgeConfMinAcc: 70,  // Akurasi yakin minimal 70% untuk FRAGILE_KNOWLEDGE
    fragileKnowledgeDoubtMaxAcc: 40, // Akurasi ragu maksimal 40% untuk FRAGILE_KNOWLEDGE
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
