import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000005_analytics_and_ai.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260501000005_analytics_and_ai migration", () => {
  test("defines the rules-based analytics views for blocks, topics, and recent attempts", () => {
    expect(migrationSql).toMatch(/create or replace view public\.user_block_performance/i);
    expect(migrationSql).toMatch(/create or replace view public\.user_topic_performance/i);
    expect(migrationSql).toMatch(/create or replace view public\.user_recent_attempt_summaries/i);
  });

  test("marks analytics views as security invoker and rules-based", () => {
    expect(migrationSql).toMatch(/security_invoker = true/i);
    expect(migrationSql).toMatch(/count\(\*\) filter/i);
    expect(migrationSql).toMatch(/jsonb_array_elements\(result\.block_summary\)/i);
  });
});
