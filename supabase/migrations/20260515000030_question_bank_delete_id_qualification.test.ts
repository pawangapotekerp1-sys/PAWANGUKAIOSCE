import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260515000030_question_bank_delete_id_qualification.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260515000030_question_bank_delete_id_qualification migration", () => {
  test("recreates single and bulk delete RPCs with qualified question ids", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("create or replace function public.delete_question(target_question_id uuid)");
    expect(normalizedSql).toContain("create or replace function public.delete_questions(target_question_ids uuid[])");
    expect(normalizedSql).toContain("from public.questions as question");
    expect(normalizedSql).toContain("where question.id = target_question_id");
    expect(normalizedSql).toContain("where question.id = any (target_question_ids)");
    expect(normalizedSql).toContain("delete from public.questions as question");
    expect(normalizedSql).toContain("returning question.id");
    expect(normalizedSql).not.toContain("where id = target_question_id");
    expect(normalizedSql).not.toContain("where id = any (target_question_ids)");
  });
});
