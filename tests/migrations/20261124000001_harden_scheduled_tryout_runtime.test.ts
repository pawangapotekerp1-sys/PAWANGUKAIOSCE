import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "../../supabase/migrations/20261124000001_harden_scheduled_tryout_runtime.sql",
);

const readMigrationSql = () => readFileSync(migrationPath, "utf8");
const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();

const getFunctionBody = (migrationSql: string, functionName: string) => {
  const match = migrationSql.match(
    new RegExp(
      `create or replace function public\\.${functionName}[\\s\\S]*?as (?:\\$\\$|\\$body\\$)([\\s\\S]*?)(?:\\$\\$|\\$body\\$);`,
      "i",
    ),
  );

  expect(match, `expected function ${functionName} to exist`).not.toBeNull();

  return normalizeSql(match?.[1] ?? "");
};

describe("20261124000001_harden_scheduled_tryout_runtime migration", () => {
  test("adds get_server_now RPC with locked execute privileges", () => {
    const sql = readMigrationSql();
    const normalized = normalizeSql(sql);
    const body = getFunctionBody(sql, "get_server_now");

    expect(body).toContain("select timezone('utc', now())");
    expect(normalized).toContain("revoke all on function public.get_server_now() from public, anon;");
    expect(normalized).toContain("grant execute on function public.get_server_now() to authenticated, service_role;");
  });

  test("locks the attempt row FOR UPDATE, skips terminal attempts, and honors event duration_minutes in sync_scheduled_tryout_attempt", () => {
    const sql = readMigrationSql();
    const syncBody = getFunctionBody(sql, "sync_scheduled_tryout_attempt");

    expect(syncBody).toContain("for update");
    expect(syncBody).toContain("if target_attempt.status in ('submitted', 'abandoned') then");
    expect(syncBody).toContain("coalesce(event_duration_minutes, question_count)");
  });

  test("removes per-click sync_scheduled_tryout_attempt call from save_scheduled_tryout_answer", () => {
    const sql = readMigrationSql();
    const saveBody = getFunctionBody(sql, "save_scheduled_tryout_answer");

    expect(saveBody).not.toContain("sync_scheduled_tryout_attempt");
    expect(saveBody).toContain("for share");
    expect(saveBody).toContain("if target_attempt.status <> 'in_progress' then");
  });

  test("enforces event max_attempts dynamically in start_scheduled_tryout_attempt", () => {
    const sql = readMigrationSql();
    const startBody = getFunctionBody(sql, "start_scheduled_tryout_attempt");

    expect(startBody).toContain("coalesce(event_row.max_attempts, 8)");
    expect(startBody).not.toContain("if submitted_attempt_count >= 8 then");
  });
});
