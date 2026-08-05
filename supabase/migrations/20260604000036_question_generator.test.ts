import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260604000036_question_generator.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const authoritativeBootstrapPath = resolve(
  dirname(currentFilePath),
  "20260605000039_question_generator_atomic_ops.sql",
);
const authoritativeBootstrapSql = readFileSync(authoritativeBootstrapPath, "utf8");

describe("20260604000036_question_generator migration", () => {
  test("acts as a no-op backfill marker instead of redefining generator schema", () => {
    expect(migrationSql).not.toMatch(/create table if not exists public\.generator_user_settings/i);
    expect(migrationSql).not.toMatch(/create table if not exists public\.question_generation_batches/i);
    expect(migrationSql).not.toMatch(/create table if not exists public\.question_generation_references/i);
    expect(migrationSql).not.toMatch(/create table if not exists public\.question_generation_items/i);
    expect(migrationSql).not.toMatch(/create table if not exists public\.question_generation_deliveries/i);
  });

  test("does not add permissive owner-only generator policies", () => {
    expect(migrationSql).not.toMatch(/generator_user_settings_select_own/i);
    expect(migrationSql).not.toMatch(/generator_user_settings_write_own/i);
    expect(migrationSql).not.toMatch(/question_generation_batches_select_own/i);
    expect(migrationSql).not.toMatch(/question_generation_batches_write_own/i);
    expect(migrationSql).not.toMatch(/question_generation_references_select_own/i);
    expect(migrationSql).not.toMatch(/question_generation_references_write_own/i);
    expect(migrationSql).not.toMatch(/question_generation_items_select_own/i);
    expect(migrationSql).not.toMatch(/question_generation_items_write_own/i);
    expect(migrationSql).not.toMatch(/question_generation_deliveries_select_own/i);
    expect(migrationSql).not.toMatch(/question_generation_deliveries_write_own/i);
  });

  test("documents that the real bootstrap lives in the newer atomic migration", () => {
    expect(migrationSql).toMatch(/no-op/i);
    expect(migrationSql).toMatch(/20260605000039_question_generator_atomic_ops/i);
  });

  test("leaves the fresh-install bootstrap contract to 20260605000039", () => {
    expect(migrationSql).not.toMatch(/create table if not exists public\.question_generation_batches/i);
    expect(authoritativeBootstrapSql).toMatch(/create table if not exists public\.generator_user_settings/i);
    expect(authoritativeBootstrapSql).toMatch(/create table if not exists public\.question_generation_batches/i);
    expect(authoritativeBootstrapSql).toMatch(/create table if not exists public\.question_generation_references/i);
    expect(authoritativeBootstrapSql).toMatch(/create table if not exists public\.question_generation_items/i);
    expect(authoritativeBootstrapSql).toMatch(/create table if not exists public\.question_generation_deliveries/i);
    expect(authoritativeBootstrapSql).toMatch(/public\.can_manage_question_bank\(\)/i);
  });
});
