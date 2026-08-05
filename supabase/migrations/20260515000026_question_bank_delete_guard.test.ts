import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260515000026_question_bank_delete_guard.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260515000026_question_bank_delete_guard migration", () => {
  test("exists and creates a guarded delete_question rpc for question bank managers", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("create or replace function public.delete_question(target_question_id uuid)");
    expect(normalizedSql).toContain("create or replace function public.delete_questions(target_question_ids uuid[])");
    expect(normalizedSql).toContain("security definer");
    expect(normalizedSql).toContain("public.can_manage_question_bank()");
    expect(normalizedSql).toContain("grant execute on function public.delete_question(uuid) to authenticated");
    expect(normalizedSql).toContain("grant execute on function public.delete_questions(uuid[]) to authenticated");
  });

  test("blocks deletion for questions already used in tryout runtime and returns media paths for cleanup", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("from public.exam_template_items");
    expect(normalizedSql).toContain("from public.attempt_items");
    expect(normalizedSql).toContain("question_image_path");
    expect(normalizedSql).toContain("explanation_image_path");
    expect(normalizedSql).toContain("delete from public.questions");
    expect(normalizedSql).toContain("where id = any (target_question_ids)");
  });
});
