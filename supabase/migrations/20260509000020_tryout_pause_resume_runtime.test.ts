import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260509000020_tryout_pause_resume_runtime.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260509000020_tryout_pause_resume_runtime migration", () => {
  test("guards new attempt creation when another active or paused attempt exists", () => {
    expect(migrationSql).toMatch(/create or replace function public\.start_attempt_from_template/i);
    expect(migrationSql).toMatch(/where user_id = auth\.uid\(\)\s+and status in \('in_progress', 'paused'\)/i);
    expect(migrationSql).toMatch(/silakan lanjutkan try out yang masih aktif sebelum memulai sesi baru/i);
    expect(migrationSql).toMatch(/elapsed_seconds,\s+last_resumed_at,\s+paused_at/i);
  });

  test("enforces one active or paused attempt per user at the database boundary", () => {
    expect(migrationSql).toMatch(/create unique index if not exists attempts_one_active_or_paused_per_user_idx/i);
    expect(migrationSql).toMatch(/on public\.attempts \(user_id\)/i);
    expect(migrationSql).toMatch(/where status in \('in_progress', 'paused'\)/i);
    expect(migrationSql).toMatch(/when unique_violation then/i);
  });

  test("reconciles legacy duplicate active attempts before creating the unique index", () => {
    expect(migrationSql).toMatch(/row_number\(\) over \(\s*partition by user_id/i);
    expect(migrationSql).toMatch(/where status in \('in_progress', 'paused'\)/i);
    expect(migrationSql).toMatch(/update public\.attempts\s+set\s+status = 'abandoned'/i);
  });

  test("adds pause and resume rpc entry points", () => {
    expect(migrationSql).toMatch(/create or replace function public\.pause_attempt/i);
    expect(migrationSql).toMatch(/create or replace function public\.resume_attempt/i);
    expect(migrationSql).toMatch(/status = 'paused'/i);
    expect(migrationSql).toMatch(/status = 'in_progress'/i);
  });

  test("calculates submitted runtime from accumulated active time", () => {
    expect(migrationSql).toMatch(/create or replace function public\.submit_attempt/i);
    expect(migrationSql).toMatch(/target_attempt\.elapsed_seconds/i);
    expect(migrationSql).toMatch(/target_attempt\.last_resumed_at/i);
    expect(migrationSql).toMatch(/submission_time - target_attempt\.last_resumed_at/i);
    expect(migrationSql).not.toMatch(/coalesce\(target_attempt\.submitted_at, submission_time\) - target_attempt\.started_at/i);
  });
});
