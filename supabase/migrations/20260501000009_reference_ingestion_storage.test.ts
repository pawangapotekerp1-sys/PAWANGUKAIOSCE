import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000009_reference_ingestion_storage.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260501000009_reference_ingestion_storage migration", () => {
  test("creates the reference library bucket for PDF ingestion", () => {
    expect(normalizedSql).toContain("insert into storage.buckets");
    expect(normalizedSql).toContain("'reference-library'");
    expect(normalizedSql).toContain("array['application/pdf']");
  });

  test("limits reference library storage access to admin users", () => {
    expect(normalizedSql).toContain('create policy "reference_library_select_admin"');
    expect(normalizedSql).toContain('create policy "reference_library_insert_admin"');
    expect(normalizedSql).toContain('create policy "reference_library_update_admin"');
    expect(normalizedSql).toContain('create policy "reference_library_delete_admin"');
    expect(normalizedSql).toContain("public.is_admin()");
  });

  test("guards storage bootstrap so reference ingestion migrations can run before local storage tables exist", () => {
    expect(normalizedSql).toContain("to_regclass('storage.buckets')");
    expect(normalizedSql).toContain("to_regclass('storage.objects')");
  });
});
