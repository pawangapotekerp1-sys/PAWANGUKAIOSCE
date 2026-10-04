import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20261004000000_scheduled_tryout_manager_redesign.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();
const normalizedMigrationSql = normalizeSql(migrationSql);

describe("20261004000000_scheduled_tryout_manager_redesign migration", () => {
  test("adds new columns to scheduled_tryout_events", () => {
    expect(normalizedMigrationSql).toContain("alter table public.scheduled_tryout_events");
    expect(normalizedMigrationSql).toContain("add column total_questions integer not null default 100");
    expect(normalizedMigrationSql).toContain("add column duration_minutes integer not null default 100");
    expect(normalizedMigrationSql).toContain("add column max_attempts integer not null default 1");
  });

  test("defines upsert_scheduled_tryout_event function with correct search path", () => {
    expect(normalizedMigrationSql).toContain("create or replace function public.upsert_scheduled_tryout_event");
    expect(normalizedMigrationSql).toContain("set search_path = public");
  });
});
