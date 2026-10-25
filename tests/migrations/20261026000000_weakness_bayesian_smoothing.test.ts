import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { DIAGNOSIS_CONFIG } from "../../supabase/functions/_shared/diagnosis-engine/config";

describe("20261026000000_weakness_bayesian_smoothing migration", () => {
  const sql = readFileSync(
    resolve(import.meta.dirname, "../../supabase/migrations", "20261026000000_weakness_bayesian_smoothing.sql"),
    "utf8"
  );

  test("contains get_personal_weakness_diagnosis definition with Bayesian smoothing k from config", () => {
    expect(sql).toContain("create or replace function public.get_personal_weakness_diagnosis");
    const k = DIAGNOSIS_CONFIG.bayesianSmoothingK;
    // Formula in SQL: + k.0 * (overall_accuracy / 100.0)) / (topic_totals.question_count::numeric + k.0)
    expect(sql).toContain(`+ ${k}.0 *`);
    expect(sql).toContain(`+ ${k}.0)`);
    expect(sql).toContain("smoothed_accuracy");
  });

  test("enforces single source of truth for sample thresholds matching config.ts", () => {
    const { subtopicDropBelow, subtopicPrimaryMin, globalBehaviorMinQuestions } = DIAGNOSIS_CONFIG.sampleThresholds;

    // Threshold for dropping subtopics (< 10) in having clause
    expect(sql).toContain(`having coalesce(sum(topic_snapshot.question_count), 0) >= ${subtopicDropBelow}`);

    // Threshold for indicative vs primary (10-19 indicative, >= 20 primary)
    expect(sql).toContain(`when topic_totals.question_count < ${subtopicPrimaryMin} then true`);
    expect(sql).toContain("is_indicative");

    // Threshold for full mode gating (at least 1 subtopic with >= subtopicDropBelow)
    expect(sql).toContain("has_eligible_subtopic");
    expect(sql).toContain(`having coalesce(sum(topic_snapshot.question_count), 0) >= ${subtopicDropBelow}`);

    // Global behavior patterns threshold (>= 100 questions)
    expect(sql).toContain(`overall_question_count >= ${globalBehaviorMinQuestions}`);
  });

  test("supports limit_attempts optional parameter for last 3/5 tryouts", () => {
    expect(sql).toContain("limit_attempts");
  });

  test("returns diagnosisMode = 'empty' when eligible_attempt_count = 0 or overall_question_count = 0", () => {
    expect(sql).toContain("when eligible_attempt_count = 0 or overall_question_count = 0 then 'empty'");
    expect(sql).toContain("drop function if exists public.get_personal_weakness_diagnosis(date, date, text);");
  });
});
