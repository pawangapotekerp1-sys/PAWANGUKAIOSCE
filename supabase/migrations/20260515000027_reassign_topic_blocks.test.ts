import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260515000027_reassign_topic_blocks.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260515000027_reassign_topic_blocks migration", () => {
  test("moves Biologi Sel and Bahan Alam Farmasi into their corrected blocks", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("where slug in ('biologi-sel', 'bahan-alam-farmasi')");
    expect(normalizedSql).toContain("when slug = 'biologi-sel' then '44444444-4444-4444-4444-444444444441'::uuid");
    expect(normalizedSql).toContain("when slug = 'bahan-alam-farmasi' then '44444444-4444-4444-4444-444444444443'::uuid");
  });

  test("realigns dependent question bank rows and topic templates with the new block ids", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("update public.questions");
    expect(normalizedSql).toContain("update public.question_upload_items");
    expect(normalizedSql).toContain("update public.exam_templates");
    expect(normalizedSql).toContain("where exam_templates.mode = 'topic'");
  });
});
