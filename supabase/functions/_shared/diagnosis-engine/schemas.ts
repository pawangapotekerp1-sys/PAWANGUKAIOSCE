import { z } from "npm:zod@4.4.1";

export const DiagnosisBehaviorCodeSchema = z.enum([
  "frequent_ragu",
  "slow_pacing",
  "frequent_answer_changes",
  "correct_to_wrong_switches",
]);
export type DiagnosisBehaviorCode = z.infer<typeof DiagnosisBehaviorCodeSchema>;

export const DiagnosisSeveritySchema = z.enum(["low", "medium", "high"]);
export type DiagnosisSeverity = z.infer<typeof DiagnosisSeveritySchema>;

export const DiagnosisConfidenceSchema = z.enum(["low", "medium", "high"]);
export type DiagnosisConfidence = z.infer<typeof DiagnosisConfidenceSchema>;

export const DiagnosisModeSchema = z.enum(["empty", "basic", "full"]);
export type DiagnosisMode = z.infer<typeof DiagnosisModeSchema>;

export const DiagnosisBehaviorPatternSchema = z.object({
  code: DiagnosisBehaviorCodeSchema,
  label: z.string(),
  severity: DiagnosisSeveritySchema,
  evidence: z.string(),
  description: z.string(),
});
export type DiagnosisBehaviorPattern = z.infer<typeof DiagnosisBehaviorPatternSchema>;

export const DiagnosisSubtopicRankingSchema = z.object({
  topicId: z.string(),
  topicName: z.string(),
  blockId: z.string().nullable().optional(),
  blockName: z.string(),
  rank: z.number(),
  weaknessScore: z.number(),
  confidence: DiagnosisConfidenceSchema,
  questionCount: z.number(),
  attemptCoverageCount: z.number(),
  accuracy: z.number(),
  smoothedAccuracy: z.number().optional(),
  averageTimePerQuestion: z.number(),
  behaviorFlags: z.array(DiagnosisBehaviorCodeSchema),
  summary: z.string(),
  isIndicative: z.boolean().default(false),
});
export type DiagnosisSubtopicRanking = z.infer<typeof DiagnosisSubtopicRankingSchema>;

export const DiagnosisSummarySchema = z.object({
  rangeStart: z.string().nullable(),
  rangeEnd: z.string().nullable(),
  timezone: z.string(),
  eligibleAttemptCount: z.number(),
  minimumAttemptsMet: z.boolean(),
  diagnosisMode: DiagnosisModeSchema,
  overallAccuracy: z.number(),
  overallAverageTimePerQuestion: z.number(),
  overallQuestionCount: z.number(),
});
export type DiagnosisSummary = z.infer<typeof DiagnosisSummarySchema>;

export const DiagnosisBasicSummarySchema = z.object({
  message: z.string(),
  eligibleAttemptCount: z.number(),
  overallAccuracy: z.number(),
  observedTopics: z.array(z.string()),
  globalBehaviorPatterns: z.array(DiagnosisBehaviorPatternSchema),
});
export type DiagnosisBasicSummary = z.infer<typeof DiagnosisBasicSummarySchema>;

export const DiagnosisNarrativeSchema = z.object({
  headline: z.string(),
  body: z.string(),
  nextReadiness: z.string(),
});
export type DiagnosisNarrative = z.infer<typeof DiagnosisNarrativeSchema>;

export const PersonalWeaknessDiagnosisDataSchema = z.object({
  summary: DiagnosisSummarySchema,
  globalBehaviorPatterns: z.array(DiagnosisBehaviorPatternSchema),
  subtopicRankings: z.array(DiagnosisSubtopicRankingSchema),
  basicSummary: DiagnosisBasicSummarySchema.nullable(),
  narrative: DiagnosisNarrativeSchema,
});
export type PersonalWeaknessDiagnosisData = z.infer<typeof PersonalWeaknessDiagnosisDataSchema>;

export const StudentAiRangeInsightPayloadSchema = z.object({
  source: z.enum(["ai", "rules"]),
  generatedAt: z.string(),
  summary: z.string(),
  model: z.string().default("gemini-3.8-flash"),
  engineVersion: z.string().default("1.0.0"),
});
export type StudentAiRangeInsightPayload = z.infer<typeof StudentAiRangeInsightPayloadSchema>;
