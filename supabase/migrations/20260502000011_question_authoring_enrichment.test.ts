import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260502000011_question_authoring_enrichment.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260502000011_question_authoring_enrichment migration", () => {
  test("defines enrichment and review tables for question drafts", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.question_draft_references/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_draft_reviews/i);
  });

  test("tracks provenance and editorial decisions", () => {
    expect(migrationSql).toMatch(/question_draft_references[\s\S]*reference_origin text not null/i);
    expect(migrationSql).toMatch(/question_draft_references[\s\S]*reference_label text not null/i);
    expect(migrationSql).toMatch(/question_draft_reviews[\s\S]*decision text not null/i);
    expect(migrationSql).toMatch(/question_draft_reviews[\s\S]*reviewer_id uuid references public\.profiles/i);
  });

  test("defines admin-facing overview views", () => {
    expect(migrationSql).toMatch(/create or replace view public\.admin_question_batch_overview/i);
    expect(migrationSql).toMatch(/create or replace view public\.admin_question_enrichment_queue/i);
  });

  test("adds admin-only policies for enrichment and review tables", () => {
    expect(normalizedSql).toContain('create policy "question_draft_references_select_admin"');
    expect(normalizedSql).toContain('create policy "question_draft_reviews_select_admin"');
    expect(normalizedSql).toContain("public.is_admin()");
  });
});
