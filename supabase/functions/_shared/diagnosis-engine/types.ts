import type { DiagnosisConfig } from "./config.ts";

export type ErrorTag =
  | "miskonsepsi"
  | "celah_pengetahuan"
  | "ceroboh"
  | "kehabisan_waktu";

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
  selected_option_key: string | null;
  correct_option_key: string;
  is_correct: boolean;
  explanation: string | null;
  was_ever_flagged_ragu: boolean;
  time_spent_seconds: number;
  time_spent_z_score: number;
  answer_change_count: number;
  changed_correct_to_wrong_count: number;
  changed_wrong_to_correct_count: number;
  session_position_ratio: number;
}

export interface ClassifiedEvidenceRow extends EvidenceRow {
  error_tags: ErrorTag[];
}

export interface Finding {
  id: string;
  code: FindingCode;
  title: string;
  topicId?: string;
  topicName?: string;
  severity: number;      // Scale 1 to 5
  persistence: number;   // Scale 1 to 5
  confidence: number;    // Scale 1 to 5
  topicWeight: number;   // Default 1.0
  urgencyScore: number;  // severity * persistence * confidence * topicWeight
  evidenceSummary: string;
  recommendationTemplateId: string;
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
  classifiedErrorCounts: Record<ErrorTag, number>;
  findings: Finding[];
  topFindings: Finding[];
  fallbackMarkdown: string;
}
