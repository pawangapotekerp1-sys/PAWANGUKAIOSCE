import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000003_academic_content.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260501000003_academic_content migration", () => {
  test("defines the academic content tables required by the tryout engine", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.blocks/i);
    expect(migrationSql).toMatch(/create table if not exists public\.topics/i);
    expect(migrationSql).toMatch(/create table if not exists public\.questions/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_options/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_explanations/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_sources/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_tags/i);
  });

  test("enforces question status and answer option uniqueness basics", () => {
    expect(migrationSql).toMatch(/questions_status_check/i);
    expect(migrationSql).toMatch(/question_options_question_key_idx/i);
    expect(migrationSql).toMatch(/question_options_question_sort_idx/i);
  });

  test("includes ordering fields used by seed and admin surfaces", () => {
    expect(migrationSql).toMatch(/public\.blocks[\s\S]*sort_order integer not null default 0/i);
    expect(migrationSql).toMatch(/public\.topics[\s\S]*sort_order integer not null default 0/i);
    expect(migrationSql).toMatch(/topics_block_sort_order_idx/i);
  });
});
