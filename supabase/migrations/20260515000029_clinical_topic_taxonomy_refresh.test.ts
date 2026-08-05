import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260515000029_clinical_topic_taxonomy_refresh.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260515000029_clinical_topic_taxonomy_refresh migration", () => {
  test("renames the respiratory topic, inserts the new Clinical Science topic, and resets alphabetical sort order", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("update public.topics");
    expect(normalizedSql).toContain("set slug = 'pernafasan-dan-pencernaan'");
    expect(normalizedSql).toContain("name = 'pernafasan dan pencernaan'");
    expect(normalizedSql).toContain("set sort_order = topic.sort_order + 100");
    expect(normalizedSql).toContain("insert into public.topics");
    expect(normalizedSql).toContain("'farmakokinetik-interaksi-obat-dan-antidotum'");
    expect(normalizedSql).toContain("'farmakokinetik, interaksi obat dan antidotum'");
    expect(normalizedSql).toContain("where block_id in (select id from clinical_science_block)");
    expect(normalizedSql).toContain("when slug = 'antiinfeksi-antivirus-antiparasit' then 1");
    expect(normalizedSql).toContain("when slug = 'biologi-sel' then 2");
    expect(normalizedSql).toContain("when slug = 'endokrin-dan-tiroid' then 3");
    expect(normalizedSql).toContain("when slug = 'farmakokinetik-interaksi-obat-dan-antidotum' then 4");
    expect(normalizedSql).toContain("when slug = 'kardiologi' then 5");
    expect(normalizedSql).toContain("when slug = 'mata-kulit-tulang-dan-sendi' then 6");
    expect(normalizedSql).toContain("when slug = 'pernafasan-dan-pencernaan' then 7");
  });

  test("stays safe on a clean database reset by deriving the Clinical Science block from live taxonomy rows", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("with clinical_science_block as");
    expect(normalizedSql).toContain("from public.blocks");
    expect(normalizedSql).toContain("where block.slug = 'clinical-science'");
    expect(normalizedSql).toContain("insert into public.topics (");
    expect(normalizedSql).toContain("select");
    expect(normalizedSql).not.toContain("values ( '55555555-5555-5555-5555-555555555566'::uuid, '44444444-4444-4444-4444-444444444441'::uuid");
  });

  test("updates existing topic templates and diagnosis snapshots without forcing duplicate template slugs", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("update public.exam_templates");
    expect(normalizedSql).toContain("title = 'pernafasan dan pencernaan'");
    expect(normalizedSql).toContain("description = 'latihan fokus pernafasan dan pencernaan dengan 20 soal acak dari materi ini.'");
    expect(normalizedSql).not.toContain("slug = 'materi-pernafasan-dan-pencernaan'");
    expect(normalizedSql).toContain("update public.attempt_diagnostic_topic_snapshots");
    expect(normalizedSql).toContain("topic_name = 'pernafasan dan pencernaan'");
    expect(normalizedSql).toContain("where topic_id = '55555555-5555-5555-5555-555555555555'::uuid");
  });
});
