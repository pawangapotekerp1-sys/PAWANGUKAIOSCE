import type { DiagnosisConfig } from "./config.ts";

export type ErrorTag =
  | "miskonsepsi"
  | "kehabisan_waktu"
  | "ceroboh"
  | "celah_pengetahuan";

export type FindingCode =
  | "RECURRING_DISTRACTOR"
  | "CONFIDENT_ERRORS_TOPIC"
  | "PERSISTENT_WEAKNESS"
  | "RUSHED_WRONG"
  | "LATE_SESSION_DROP"
  | "NET_ANSWER_CHANGE"
  | "FRAGILE_KNOWLEDGE"
  | "IMPROVING";

export interface EvidenceRow {
  attempt_id: string;
  submitted_at: string;
  question_id: string;
  topic_id: string | null;
  topic_name: string;
  question_text?: string | null;
  selected_option_key: string | null;
  correct_option_key: string;
  is_correct: boolean;
  explanation: string | null;
  was_ever_flagged_ragu: boolean | null;
  flagged_ragu_at_submit?: boolean | null;
  time_spent_seconds: number | null;
  time_spent_z_score: number | null;
  answer_change_count: number | null;
  changed_correct_to_wrong_count: number | null;
  changed_wrong_to_correct_count: number | null;
  session_position_ratio: number | null;
  unreleased_scheduled_attempts?: number | null;
}

export interface ClassifiedEvidenceRow extends EvidenceRow {
  error_tags: ErrorTag[];
  primary_error_tag: ErrorTag | null;
}

export type TemplateStatus = "draft" | "approved";

export interface Finding {
  id: string;
  code: FindingCode;
  title: string;
  topicId?: string;
  topicName?: string;
  severity: number;      // Skala 1 - 5
  persistence: number;   // Skala 1 - 5
  confidence: number;    // Skala 1 - 5
  topicWeight: number;   // Default 1.0
  urgencyScore: number;  // severity * persistence * confidence * topicWeight
  evidenceSummary: string;
  recommendationTemplateId: string;
  recommendationTemplateStatus: TemplateStatus;
  recommendationDraft: string;
  metadata: Record<string, unknown>;
}

export interface DiagnosisReport {
  version: string;
  generatedAt: string;
  mode: "empty" | "basic" | "full";
  totalAttempts: number;
  totalQuestions: number;
  overallAccuracy: number;
  unreleasedScheduledAttemptsCount: number;
  classifiedErrorCounts: Record<ErrorTag, number>;
  findings: Finding[];
  topFindings: Finding[];
  fallbackMarkdown: string;
}
