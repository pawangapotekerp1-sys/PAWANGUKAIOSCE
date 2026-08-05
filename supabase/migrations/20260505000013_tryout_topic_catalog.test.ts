import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260505000013_tryout_topic_catalog.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260505000013_tryout_topic_catalog migration", () => {
  test("exists and extends exam templates for topic-scoped tryouts", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain(
      "alter table public.exam_templates add column if not exists topic_id uuid references public.topics (id) on delete set null",
    );
    expect(normalizedSql).toContain(
      "add constraint exam_templates_mode_check check (mode in ('full', 'block', 'topic'))",
    );
  });

  test("rebuilds the attempt bootstrap function around random published-question selection", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("create or replace function public.start_attempt_from_template");
    expect(normalizedSql).toContain("required_question_count integer");
    expect(normalizedSql).toContain("template_row.mode = 'topic'");
    expect(normalizedSql).toContain("order by random()");
    expect(normalizedSql).toContain("limit required_question_count");
  });

  test("enforces exact availability checks for full, block, and topic scopes", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("when template_row.mode = 'full' then 50");
    expect(normalizedSql).toContain("when template_row.mode = 'block' then 30");
    expect(normalizedSql).toContain("when template_row.mode = 'topic' then 20");
    expect(normalizedSql).toContain("template try out ini belum memiliki cukup soal published.");
  });

  test("counts availability from the same eligible question pool used to build attempt items", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("with eligible_questions as (");
    expect(normalizedSql).toContain("having count(*) >= 2");
    expect(normalizedSql).toContain("bool_or(option.is_correct)");
    expect(normalizedSql).toContain("from eligible_questions");
    expect(normalizedSql).toContain("from ranked_questions as ranked_question");
  });
});
