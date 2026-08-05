import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260614000042_question_generator_trusted_reference_metadata.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260614000042_question_generator_trusted_reference_metadata.sql", () => {
  test("adds storage columns for trusted reference metadata", () => {
    expect(migrationSql).toMatch(/add column if not exists reference_label text/i);
    expect(migrationSql).toMatch(/add column if not exists reference_url text/i);
    expect(migrationSql).toMatch(/reference_url is null or reference_url ~ '\^https:\/\//i);
  });

  test("migrates generation mode constraints to the three new variation modes", () => {
    expect(migrationSql).toMatch(/set generation_mode = 'new_case_same_concept'/i);
    expect(migrationSql).toMatch(/generation_mode in \(\s*'new_case_same_concept',\s*'different_trap_same_objective',\s*'reverse_reasoning'/i);
  });

  test("updates the atomic persistence rpc to save variationMode and trusted reference metadata", () => {
    expect(migrationSql).toMatch(/create or replace function public\.persist_generated_question_batch/i);
    expect(migrationSql).toMatch(/'variationMode', generated_input\.payload->>'variationMode'/i);
    expect(migrationSql).toMatch(/'reference', generated_input\.payload->'reference'/i);
    expect(migrationSql).toMatch(/reference_label,\s*reference_url,/i);
    expect(migrationSql).toMatch(/generated_input\.payload->'reference'->>'label'/i);
    expect(migrationSql).toMatch(/generated_input\.payload->'reference'->>'url'/i);
  });
});
