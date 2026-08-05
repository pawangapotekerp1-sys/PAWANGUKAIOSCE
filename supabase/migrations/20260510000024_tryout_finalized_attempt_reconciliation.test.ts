import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260510000024_tryout_finalized_attempt_reconciliation.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260510000024 tryout finalized attempt reconciliation migration", () => {
  test("reconciles stale active attempts that already have final results", () => {
    expect(migrationSql).toMatch(/update public\.attempts as attempt/i);
    expect(migrationSql).toMatch(/set\s+status = 'submitted'/i);
    expect(migrationSql).toMatch(/from public\.attempt_results as result/i);
    expect(migrationSql).toMatch(/where attempt\.id = result\.attempt_id/i);
    expect(migrationSql).toMatch(/attempt\.status in \('in_progress', 'paused'\)/i);
  });

  test("lets start_attempt_from_template ignore finalized active rows", () => {
    expect(migrationSql).toMatch(/create or replace function public\.start_attempt_from_template/i);
    expect(migrationSql).toMatch(/and attempt\.submitted_at is null/i);
    expect(migrationSql).toMatch(/not exists\s*\(\s*select 1\s+from public\.attempt_results as result\s+where result\.attempt_id = attempt\.id\s*\)/i);
  });

  test("prevents resume_attempt from reopening finalized rows", () => {
    expect(migrationSql).toMatch(/create or replace function public\.resume_attempt/i);
    expect(migrationSql).toMatch(/finalized_generated_at timestamptz/i);
    expect(migrationSql).toMatch(/select result\.generated_at\s+into finalized_generated_at/i);
    expect(migrationSql).toMatch(/if target_attempt\.submitted_at is not null or finalized_generated_at is not null then/i);
    expect(migrationSql).toMatch(/status = 'submitted'/i);
  });
});
