import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260510000022_mentor_role_question_bank_access.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260510000022 mentor role question bank access migration", () => {
  test("adds the mentor role to the app_role enum", () => {
    expect(normalizedSql).toContain("alter type public.app_role add value if not exists 'mentor'");
  });

  test("creates a dedicated helper for shared admin and mentor question-bank access", () => {
    expect(normalizedSql).toContain("create or replace function public.can_manage_question_bank()");
    expect(normalizedSql).toContain("role::text in ('admin', 'mentor')");
  });

  test("rebinds question bank and media policies to the shared helper", () => {
    expect(normalizedSql).toContain('create policy "questions_write_question_bank_manager"');
    expect(normalizedSql).toContain('create policy "question_options_write_question_bank_manager"');
    expect(normalizedSql).toContain('create policy "question_explanations_write_question_bank_manager"');
    expect(normalizedSql).toContain('create policy "question_media_insert_question_bank_manager"');
    expect(normalizedSql).toContain("public.can_manage_question_bank()");
  });

  test("guards question-media policy rewrites until storage objects exist", () => {
    expect(normalizedSql).toContain("to_regclass('storage.objects')");
  });
});
