import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260531000033_move_bahan_alam_to_pharmaceutical_science.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260531000033_move_bahan_alam_to_pharmaceutical_science migration", () => {
  test("moves Bahan Alam Farmasi into Pharmaceutical Science", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("where topic.slug = 'bahan-alam-farmasi'");
    expect(normalizedSql).toContain("'44444444-4444-4444-4444-444444444442'::uuid");
  });

  test("realigns dependent rows that still carry the topic block", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("update public.questions");
    expect(normalizedSql).toContain("update public.question_upload_items");
    expect(normalizedSql).toContain("update public.exam_templates");
    expect(normalizedSql).toContain("update public.attempt_diagnostic_topic_snapshots");
    expect(normalizedSql).toContain("update public.scheduled_tryout_event_questions");
    expect(normalizedSql).toContain("update public.scheduled_tryout_attempt_items");
  });
});
