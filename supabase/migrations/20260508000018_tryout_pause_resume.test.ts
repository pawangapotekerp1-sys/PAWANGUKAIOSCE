import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260508000018_tryout_pause_resume.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260508000018_tryout_pause_resume migration", () => {
  test("adds pause-aware runtime fields to attempts", () => {
    expect(migrationSql).toMatch(/alter table public\.attempts/i);
    expect(migrationSql).toMatch(/add column if not exists elapsed_seconds integer not null default 0/i);
    expect(migrationSql).toMatch(/add column if not exists last_resumed_at timestamptz/i);
    expect(migrationSql).toMatch(/add column if not exists paused_at timestamptz/i);
    expect(migrationSql).toMatch(/alter type public\.attempt_status add value if not exists 'paused'/i);
  });

  test("keeps enum bootstrap separate from pause-aware business logic", () => {
    expect(migrationSql).not.toMatch(/create or replace function public\.start_attempt_from_template/i);
    expect(migrationSql).not.toMatch(/create unique index if not exists attempts_one_active_or_paused_per_user_idx/i);
    expect(migrationSql).not.toMatch(/create or replace function public\.pause_attempt/i);
    expect(migrationSql).not.toMatch(/create or replace function public\.resume_attempt/i);
    expect(migrationSql).not.toMatch(/status = 'paused'/i);
  });
});
