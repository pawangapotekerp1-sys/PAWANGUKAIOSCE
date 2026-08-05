import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260605000037_enable_supabase_vault.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260605000037_enable_supabase_vault.sql", () => {
  test("creates the vault schema before installing the Supabase Vault extension", () => {
    expect(migrationSql).toMatch(/create schema if not exists vault;/i);
    expect(migrationSql).toMatch(/create extension if not exists supabase_vault with schema vault;/i);
  });
});
