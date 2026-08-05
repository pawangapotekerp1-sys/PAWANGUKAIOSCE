import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260515000028_tryout_catalog_readiness_rpc.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260515000028_tryout_catalog_readiness_rpc migration", () => {
  test("creates a catalog readiness rpc that uses the same eligible-question predicate as attempt creation", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("create or replace function public.list_tryout_catalog_entries()");
    expect(normalizedSql).toContain("returns table");
    expect(normalizedSql).toContain("join public.question_options as option");
    expect(normalizedSql).toContain("where question.status = 'published'");
    expect(normalizedSql).toContain("having count(*) >= 2");
    expect(normalizedSql).toContain("bool_or(option.is_correct)");
  });

  test("keeps catalog aggregation on the server and exposes it to authenticated clients", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("grant execute on function public.list_tryout_catalog_entries() to authenticated");
    expect(normalizedSql).toContain("session_template_id");
    expect(normalizedSql).toContain("available_question_count");
    expect(normalizedSql).toContain("required_question_count");
    expect(normalizedSql).toContain("is_startable");
  });
});
