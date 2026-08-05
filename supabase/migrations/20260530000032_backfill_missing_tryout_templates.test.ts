import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260530000032_backfill_missing_tryout_templates.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260530000032_backfill_missing_tryout_templates migration", () => {
  test("promotes existing tryout templates to published and keeps their scope metadata in sync", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("update public.exam_templates");
    expect(normalizedSql).toContain("where template.mode = 'block'");
    expect(normalizedSql).toContain("where template.mode = 'topic'");
    expect(normalizedSql).toContain("set slug = 'tryout-besar'");
    expect(normalizedSql).toContain("status = 'published'");
  });

  test("backfills missing published templates for full, active blocks, and active topics", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("insert into public.exam_templates");
    expect(normalizedSql).toContain("where block.is_active = true");
    expect(normalizedSql).toContain("and topic.is_active = true");
    expect(normalizedSql).toContain("not exists ( select 1 from public.exam_templates as template where template.mode = 'full' )");
    expect(normalizedSql).toContain("template.mode = 'block' and template.block_id = block.id");
    expect(normalizedSql).toContain("template.mode = 'topic' and template.topic_id = topic.id");
    expect(normalizedSql).toContain("format('materi-%s', topic.slug)");
  });
});
