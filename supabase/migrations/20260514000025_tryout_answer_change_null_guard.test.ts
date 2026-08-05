import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260514000025_tryout_answer_change_null_guard.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260514000025 tryout answer change null guard migration", () => {
  test("does not count an unanswered placeholder row as an answer-change event", () => {
    expect(migrationSql).toMatch(/create or replace function public\.save_attempt_answer/i);
    expect(migrationSql).toMatch(
      /answer_option_changed := found\s+and existing_answer\.selected_option_key is not null\s+and existing_answer\.selected_option_key is distinct from selected_option_key;/i,
    );
  });

  test("coerces previous and next correctness checks away from null booleans", () => {
    expect(migrationSql).toMatch(
      /previous_was_correct := coalesce\(existing_answer\.selected_option_key = target_item\.correct_option_key, false\);/i,
    );
    expect(migrationSql).toMatch(
      /next_is_correct := coalesce\(selected_option_key = target_item\.correct_option_key, false\);/i,
    );
  });
});
