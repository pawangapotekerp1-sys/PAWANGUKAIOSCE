import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "../../supabase/migrations/20261125000001_fix_scheduled_tryout_statement_timeout.sql",
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

describe("20261125000001_fix_scheduled_tryout_statement_timeout migration", () => {
  test("restores can_manage_scheduled_tryouts to SECURITY DEFINER with empty search_path and InitPlan auth.uid()", () => {
    const sql = readMigrationSql();
    const normalized = normalizeSql(sql);
    const body = getFunctionBody(sql, "can_manage_scheduled_tryouts");

    expect(normalized).toMatch(
      /create or replace function public\.can_manage_scheduled_tryouts\(\)[\s\S]*?security definer set search_path = ''/,
    );
    expect(body).toContain("where id = (select auth.uid())");
    expect(normalized).toContain(
      "revoke all on function public.can_manage_scheduled_tryouts() from public, anon;",
    );
    expect(normalized).toContain(
      "grant execute on function public.can_manage_scheduled_tryouts() to authenticated, service_role;",
    );
  });

  test("denormalizes user_id and block_name_snapshot and replaces FOR ALL RLS policies with InitPlan-wrapped policies", () => {
    const normalized = normalizeSql(readMigrationSql());

    expect(normalized).toContain(
      "alter table public.scheduled_tryout_attempt_items add column if not exists user_id uuid",
    );
    expect(normalized).toContain(
      "alter table public.scheduled_tryout_attempt_items add column if not exists block_name_snapshot text",
    );
    expect(normalized).toContain(
      "alter table public.scheduled_tryout_answers add column if not exists user_id uuid",
    );

    // Must not introduce any permissive FOR ALL policy that ORs into SELECTs
    expect(normalized).not.toMatch(/create policy [^\n;]+ for all/);

    // Direct InitPlan ownership check on items and answers (no correlated EXISTS on attempts)
    expect(normalized).toContain(
      'create policy "scheduled_tryout_attempt_items_select_own_or_manager" on public.scheduled_tryout_attempt_items for select using ( user_id = (select auth.uid()) or (select public.can_manage_scheduled_tryouts()) );',
    );
    expect(normalized).toContain(
      'create policy "scheduled_tryout_answers_select_own_or_manager" on public.scheduled_tryout_answers for select using ( user_id = (select auth.uid()) or (select public.can_manage_scheduled_tryouts()) );',
    );
  });

  test("adds composite indexes on attempts, attempt_items, and answers", () => {
    const normalized = normalizeSql(readMigrationSql());

    expect(normalized).toContain("scheduled_tryout_attempts_user_status_started_idx");
    expect(normalized).toContain("scheduled_tryout_attempts_user_status_submitted_idx");
    expect(normalized).toContain("scheduled_tryout_attempts_event_cycle_user_status_idx");
    expect(normalized).toContain("scheduled_tryout_attempt_items_attempt_event_question_idx");
    expect(normalized).toContain("scheduled_tryout_answers_attempt_answered_at_idx");
  });

  test("gates sync_scheduled_tryout_attempt on questions_updated_at watermark and avoids unconditional row rewrites", () => {
    const sql = readMigrationSql();
    const syncBody = getFunctionBody(sql, "sync_scheduled_tryout_attempt");
    const resumeBody = getFunctionBody(sql, "resume_scheduled_tryout_attempt");
    const submitBody = getFunctionBody(sql, "submit_scheduled_tryout_attempt");
    const startBody = getFunctionBody(sql, "start_scheduled_tryout_attempt");
    const saveBody = getFunctionBody(sql, "save_scheduled_tryout_answer");
    const reactivateBody = getFunctionBody(sql, "reactivate_scheduled_tryout_event");

    expect(syncBody).toContain("synced_questions_at is not distinct from event_row.questions_updated_at");
    expect(syncBody).toContain("is distinct from");

    // Resume locks FOR UPDATE first and does not run heavy sync
    expect(resumeBody).toContain("for update");
    expect(resumeBody).not.toContain("sync_scheduled_tryout_attempt");

    // Submit locks FOR UPDATE and does not run heavy sync
    expect(submitBody).toContain("for update");
    expect(submitBody).not.toContain("sync_scheduled_tryout_attempt");

    // Start auto-finalizes expired attempts and inserts items directly in one pass
    expect(startBody).toContain("insert into public.scheduled_tryout_attempt_items");
    expect(startBody).toContain("'admin'");

    // Save populates user_id and only updates opened_at when null
    expect(saveBody).toContain("and opened_at is null");
    expect(saveBody).toContain("target_attempt.user_id");

    // Reactivate preserves historical cycle attempts so past review URLs never break
    expect(reactivateBody).not.toContain("delete from public.scheduled_tryout_attempts");
  });
});
