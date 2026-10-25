export const ENGINE_VERSION = "1.0.0";

export const DIAGNOSIS_CONFIG = {
  version: ENGINE_VERSION,
  bayesianSmoothingK: 5,
  sampleThresholds: {
    subtopicDropBelow: 10,
    subtopicIndicativeMin: 10,
    subtopicPrimaryMin: 20,
    globalBehaviorMinQuestions: 100,
    recurringDistractorMinCount: 3,
    recurringDistractorMinTryouts: 2,
    trendMinQuestionsPerPeriod: 10,
  },
  behaviorThresholds: {
    rushedZScore: -1.0,
    lateSessionPosition: 0.66,
  },
  rateLimits: {
    cooldownSeconds: 30,
  },
  ai: {
    defaultModel: "gemini-3.8-flash",
    maxOutputTokens: 1800,
    temperature: 0.2,
  },
} as const;

export type DiagnosisConfig = typeof DIAGNOSIS_CONFIG;
