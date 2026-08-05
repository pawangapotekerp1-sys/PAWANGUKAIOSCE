import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260510000023_mentor_role_upload_batch_access.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260510000023 mentor role upload batch access migration", () => {
  test("rebinds upload batch tables to the shared question bank manager helper", () => {
    expect(normalizedSql).toContain('create policy "question_upload_batches_select_question_bank_manager"');
    expect(normalizedSql).toContain('create policy "question_upload_items_write_question_bank_manager"');
    expect(normalizedSql).toContain("public.can_manage_question_bank()");
  });

  test("opens draft reference and review tables to the same shared helper", () => {
    expect(normalizedSql).toContain('create policy "question_draft_references_select_question_bank_manager"');
    expect(normalizedSql).toContain('create policy "question_draft_reviews_write_question_bank_manager"');
    expect(normalizedSql).toContain("public.can_manage_question_bank()");
  });
});
