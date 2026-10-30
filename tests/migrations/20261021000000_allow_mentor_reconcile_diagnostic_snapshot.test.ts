import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "../../supabase/migrations", "20261021000000_allow_mentor_reconcile_diagnostic_snapshot.sql");
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";

describe("20261021000000_allow_mentor_reconcile_diagnostic_snapshot.sql", () => {
  test("exists locally so migration history matches the repo", () => {
    expect(migrationExists).toBe(true);
  });

  test("allows mentors to reconcile diagnostic snapshots via can_manage_question_bank", () => {
    expect(migrationSql).toMatch(/create or replace function public\.rebuild_attempt_diagnostic_snapshot/i);
    expect(migrationSql).toMatch(/public\.can_manage_question_bank\(\)/i);
    expect(migrationSql).toMatch(/user_id = auth\.uid\(\)\s*or public\.is_admin\(\)\s*or public\.can_manage_question_bank\(\)/i);
  });

  test("grants execute permissions to authenticated and service_role", () => {
    expect(migrationSql).toMatch(/grant execute on function public\.rebuild_attempt_diagnostic_snapshot\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.rebuild_attempt_diagnostic_snapshot\(uuid\) to service_role/i);
  });
});
