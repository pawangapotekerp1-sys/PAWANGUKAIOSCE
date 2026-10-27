import { classifyAllEvidenceRows } from "./classify.ts";
import type { DiagnosisConfig } from "./config.ts";
import { DIAGNOSIS_CONFIG, ENGINE_VERSION } from "./config.ts";
import { detectFindings } from "./findings.ts";
import { prioritizeFindings } from "./prioritize.ts";
import { validateTemplateApproval } from "./recommend.ts";
import { renderFallbackMarkdown } from "./render.ts";
import type { DiagnosisReport, EvidenceRow } from "./types.ts";

export interface RunEngineOptions {
  config?: DiagnosisConfig;
  unreleasedScheduledAttemptsCount?: number;
}

/**
 * Pure, deterministic Diagnosis Engine.
 * Takes raw evidence rows from get_attempt_evidence and generates a comprehensive,
 * structured, prioritized diagnosis report.
 * 0 I/O, 0 network, 100% deterministic.
 */
export function runDiagnosisEngine(
  rows: EvidenceRow[],
  optionsOrConfig: DiagnosisConfig | RunEngineOptions = DIAGNOSIS_CONFIG,
): DiagnosisReport {
  const options: RunEngineOptions =
    "sampleThresholds" in optionsOrConfig
      ? { config: optionsOrConfig as DiagnosisConfig }
      : (optionsOrConfig as RunEngineOptions);

  const config = options.config || DIAGNOSIS_CONFIG;

  // Validate production template approval gate if enabled
  if (config.flags?.requireApprovedTemplates) {
    validateTemplateApproval(true);
  }

  const unreleasedCount =
    options.unreleasedScheduledAttemptsCount ??
    (rows && rows.length > 0 && typeof rows[0]?.unreleased_scheduled_attempts === "number"
      ? rows[0].unreleased_scheduled_attempts
      : 0);

  if (!rows || rows.length === 0) {
    const emptyPreliminary: Omit<DiagnosisReport, "fallbackMarkdown"> = {
      version: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      mode: "empty",
      totalAttempts: 0,
      totalQuestions: 0,
      overallAccuracy: 0,
      unreleasedScheduledAttemptsCount: unreleasedCount,
      classifiedErrorCounts: {
        kehabisan_waktu: 0,
        ceroboh: 0,
        miskonsepsi: 0,
        celah_pengetahuan: 0,
      },
      findings: [],
      topFindings: [],
    };

    const emptyMarkdown = renderFallbackMarkdown({
      ...emptyPreliminary,
      fallbackMarkdown: "",
    });

    return {
      ...emptyPreliminary,
      fallbackMarkdown: emptyMarkdown,
    };
  }

  // 1. Classify all rows with error tags
  const { tagCounts } = classifyAllEvidenceRows(rows, config);

  // 2. Detect all structured patterns
  const allFindings = detectFindings(rows, config);

  // 3. Prioritize top findings (top 3 to 5)
  const topFindings = prioritizeFindings(allFindings, 3, 5);

  // 4. Calculate aggregates
  const attemptIds = new Set(rows.map((r) => r.attempt_id));
  const totalQuestions = rows.length;
  const correctCount = rows.filter((r) => r.is_correct).length;
  const overallAccuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  // Determine mode based on subtopic question count threshold (>= 1 subtopic with >= 10 questions)
  const topicCounts = new Map<string, number>();
  for (const row of rows) {
    const key = row.topic_id || row.topic_name;
    topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
  }
  const hasEligibleSubtopic = Array.from(topicCounts.values()).some(
    (count) => count >= config.sampleThresholds.subtopicDropBelow,
  );
  const mode = hasEligibleSubtopic ? "full" : "basic";

  const preliminaryReport: Omit<DiagnosisReport, "fallbackMarkdown"> = {
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    mode,
    totalAttempts: attemptIds.size,
    totalQuestions,
    overallAccuracy: Math.round(overallAccuracy * 100) / 100,
    unreleasedScheduledAttemptsCount: unreleasedCount,
    classifiedErrorCounts: tagCounts,
    findings: allFindings,
    topFindings,
  };

  const fallbackMarkdown = renderFallbackMarkdown({
    ...preliminaryReport,
    fallbackMarkdown: "",
  });

  return {
    ...preliminaryReport,
    fallbackMarkdown,
  };
}
