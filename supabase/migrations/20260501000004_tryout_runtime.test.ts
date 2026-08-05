import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000004_tryout_runtime.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260501000004_tryout_runtime migration", () => {
  test("defines the runtime tables required for persisted attempts", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.exam_templates/i);
    expect(migrationSql).toMatch(/create table if not exists public\.exam_template_items/i);
    expect(migrationSql).toMatch(/create table if not exists public\.attempts/i);
    expect(migrationSql).toMatch(/create table if not exists public\.attempt_items/i);
    expect(migrationSql).toMatch(/create table if not exists public\.answers/i);
    expect(migrationSql).toMatch(/create table if not exists public\.attempt_results/i);
  });

  test("captures snapshot-oriented attempt item fields", () => {
    expect(migrationSql).toMatch(/block_name text not null/i);
    expect(migrationSql).toMatch(/question_stem text not null/i);
    expect(migrationSql).toMatch(/options_snapshot jsonb not null/i);
    expect(migrationSql).toMatch(/correct_option_key text not null/i);
  });

  test("adds database functions for attempt bootstrap and result generation", () => {
    expect(migrationSql).toMatch(/create or replace function public\.start_attempt_from_template/i);
    expect(migrationSql).toMatch(/returns public\.attempts/i);
    expect(migrationSql).toMatch(/create or replace function public\.submit_attempt/i);
    expect(migrationSql).toMatch(/returns public\.attempt_results/i);
  });
});
