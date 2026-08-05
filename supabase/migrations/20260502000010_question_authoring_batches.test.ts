import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260502000010_question_authoring_batches.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260502000010_question_authoring_batches migration", () => {
  test("defines question-first upload batch tables", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.question_upload_batches/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_upload_items/i);
  });

  test("stores format, batch status, parse diagnostics, and topic suggestion metadata", () => {
    expect(migrationSql).toMatch(/question_upload_batches[\s\S]*input_format text not null/i);
    expect(migrationSql).toMatch(/question_upload_batches[\s\S]*status text not null default 'processing'/i);
    expect(migrationSql).toMatch(/question_upload_items[\s\S]*text_extraction_mode text/i);
    expect(migrationSql).toMatch(/question_upload_items[\s\S]*ocr_confidence numeric/i);
    expect(migrationSql).toMatch(/question_upload_items[\s\S]*parse_confidence numeric/i);
    expect(migrationSql).toMatch(/question_upload_items[\s\S]*suggested_topic_id uuid references public\.topics/i);
    expect(migrationSql).toMatch(/question_upload_items[\s\S]*topic_suggestion_confidence numeric/i);
  });

  test("expands question workflow states for authoring and review", () => {
    expect(normalizedSql).toContain("draft_ready");
    expect(normalizedSql).toContain("needs_enrichment");
    expect(normalizedSql).toContain("needs_review");
    expect(normalizedSql).toContain("approved");
    expect(normalizedSql).toContain("published");
    expect(normalizedSql).toContain("rejected");
    expect(normalizedSql).toContain("enrichment_failed");
  });

  test("adds admin-only policies for batch and item tables", () => {
    expect(normalizedSql).toContain('create policy "question_upload_batches_select_admin"');
    expect(normalizedSql).toContain('create policy "question_upload_items_select_admin"');
    expect(normalizedSql).toContain("public.is_admin()");
  });
});
