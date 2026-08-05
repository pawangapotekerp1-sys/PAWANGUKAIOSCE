import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260506000014_tryout_session_timer_ragu_ragu.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260506000014_tryout_session_timer_ragu_ragu migration", () => {
  test("adds persisted doubtful state to answers", () => {
    expect(migrationSql).toMatch(
      /alter table public\.answers[\s\S]*add column if not exists is_doubtful boolean not null default false/i,
    );
  });

  test("switches new attempt timing to question-count based seconds", () => {
    expect(migrationSql).toMatch(/create or replace function public\.start_attempt_from_template/i);
    expect(migrationSql).toMatch(/required_question_count \* 60/i);
  });

  test("keeps submit_attempt as the scoring entry point", () => {
    expect(migrationSql).toMatch(/create or replace function public\.submit_attempt/i);
  });
});
