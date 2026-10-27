import { z } from "npm:zod@4.4.1";

export const ErrorTagSchema = z.enum([
  "miskonsepsi",
  "celah_pengetahuan",
  "ceroboh",
  "kehabisan_waktu",
]);

export const FindingCodeSchema = z.enum([
  "RECURRING_DISTRACTOR",
  "CONFIDENT_ERRORS_TOPIC",
  "PERSISTENT_WEAKNESS",
  "RUSHED_WRONG",
  "LATE_SESSION_DROP",
  "NET_ANSWER_CHANGE",
  "FRAGILE_KNOWLEDGE",
  "IMPROVING",
]);

export const EvidenceRowSchema = z.object({
  attempt_id: z.string(),
  submitted_at: z.string(),
  question_id: z.string(),
  topic_id: z.string().nullable(),
  topic_name: z.string(),
  selected_option_key: z.string().nullable(),
  correct_option_key: z.string(),
  is_correct: z.boolean(),
  explanation: z.string().nullable(),
  was_ever_flagged_ragu: z.boolean(),
  time_spent_seconds: z.number(),
  time_spent_z_score: z.number(),
  answer_change_count: z.number(),
  changed_correct_to_wrong_count: z.number(),
  changed_wrong_to_correct_count: z.number(),
  session_position_ratio: z.number(),
});

export const FindingSchema = z.object({
  id: z.string(),
  code: FindingCodeSchema,
  title: z.string(),
  topicId: z.string().optional(),
  topicName: z.string().optional(),
  severity: z.number().min(1).max(5),
  persistence: z.number().min(1).max(5),
  confidence: z.number().min(1).max(5),
  topicWeight: z.number().default(1.0),
  urgencyScore: z.number(),
  evidenceSummary: z.string(),
  recommendationTemplateId: z.string(),
  recommendationDraft: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export const DiagnosisReportSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  mode: z.enum(["empty", "basic", "full"]),
  totalAttempts: z.number(),
  totalQuestions: z.number(),
  overallAccuracy: z.number(),
  classifiedErrorCounts: z.object({
    miskonsepsi: z.number(),
    celah_pengetahuan: z.number(),
    ceroboh: z.number(),
    kehabisan_waktu: z.number(),
  }),
  findings: z.array(FindingSchema),
  topFindings: z.array(FindingSchema),
  fallbackMarkdown: z.string(),
});
