import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260503000012_manual_question_media.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260503000012_manual_question_media migration", () => {
  test("exists and adds media fields to final question tables", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("alter table public.questions add column if not exists question_image_path text");
    expect(normalizedSql).toContain("alter table public.question_explanations add column if not exists explanation_image_path text");
    expect(normalizedSql).toContain("alter table public.attempt_items add column if not exists question_image_path text");
  });

  test("allows image-only explanations and creates protected question media storage", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("alter table public.question_explanations alter column explanation drop not null");
    expect(normalizedSql).toContain("insert into storage.buckets");
    expect(normalizedSql).toContain("'question-media'");
    expect(normalizedSql).toContain("image/png");
    expect(normalizedSql).toContain("image/jpeg");
    expect(normalizedSql).toContain("image/webp");
  });

  test("guards question media storage bootstrap for cold local databases", () => {
    expect(normalizedSql).toContain("to_regclass('storage.buckets')");
    expect(normalizedSql).toContain("to_regclass('storage.objects')");
  });
});
