import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260617000045_question_key_reconciliation.sql");
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";

describe("20260617000045_question_key_reconciliation.sql", () => {
  test("exists locally so production migration history matches the repo", () => {
    expect(migrationExists).toBe(true);
  });

  test("rebuilds attempt results from the current live answer key", () => {
    expect(migrationSql).toMatch(/create or replace function public\.rebuild_attempt_result/i);
    expect(migrationSql).toMatch(/on conflict \(attempt_id\) do update/i);
    expect(migrationSql).toMatch(/perform public\.rebuild_attempt_diagnostic_snapshot\(target_attempt\.id\)/i);
  });

  test("syncs stale answer keys and wires a question_options trigger for reconciliation", () => {
    expect(migrationSql).toMatch(/create or replace function public\.sync_question_bank_answer_key/i);
    expect(migrationSql).toMatch(/update public\.attempt_items as attempt_item/i);
    expect(migrationSql).toMatch(/update public\.attempt_answer_change_events as change_event/i);
    expect(migrationSql).toMatch(/update public\.attempt_item_behavior_metrics as metric/i);
    expect(migrationSql).toMatch(/create or replace function public\.handle_question_option_answer_key_change/i);
    expect(migrationSql).toMatch(/create trigger sync_question_bank_answer_key_on_question_options/i);
    expect(migrationSql).toMatch(/perform public\.sync_question_bank_answer_key\(stale_question\.question_id\)/i);
  });
});
