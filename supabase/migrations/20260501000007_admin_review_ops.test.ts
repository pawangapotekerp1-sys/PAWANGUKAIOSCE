import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000007_admin_review_ops.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260501000007_admin_review_ops migration", () => {
  test("defines admin operational tables for references, ingestion jobs, and candidates", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.reference_documents/i);
    expect(migrationSql).toMatch(/create table if not exists public\.reference_document_versions/i);
    expect(migrationSql).toMatch(/create table if not exists public\.ingestion_jobs/i);
    expect(migrationSql).toMatch(/create table if not exists public\.ingested_question_candidates/i);
    expect(migrationSql).toMatch(/create table if not exists public\.candidate_verifications/i);
  });

  test("defines the review queue view and admin-only access policies", () => {
    expect(migrationSql).toMatch(/create or replace view public\.review_queue/i);
    expect(normalizedSql).toContain('create policy "reference_documents_select_admin"');
    expect(normalizedSql).toContain('create policy "ingestion_jobs_select_admin"');
    expect(normalizedSql).toContain('create policy "ingested_question_candidates_select_admin"');
    expect(normalizedSql).toContain("public.is_admin()");
  });
});
