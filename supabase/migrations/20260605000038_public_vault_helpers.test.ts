import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260605000038_public_vault_helpers.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260605000038_public_vault_helpers.sql", () => {
  test("defines public wrapper RPCs for writing, reading, and deleting secrets from vault", () => {
    expect(migrationSql).toMatch(/create or replace function public\.create_vault_secret/i);
    expect(migrationSql).toMatch(/vault\.create_secret/i);
    expect(migrationSql).toMatch(/create or replace function public\.read_vault_secret/i);
    expect(migrationSql).toMatch(/vault\.decrypted_secrets/i);
    expect(migrationSql).toMatch(/create or replace function public\.delete_vault_secret/i);
    expect(migrationSql).toMatch(/delete from vault\.secrets/i);
    expect(migrationSql).toMatch(/grant execute on function public\.create_vault_secret/i);
    expect(migrationSql).toMatch(/grant execute on function public\.read_vault_secret/i);
    expect(migrationSql).toMatch(/grant execute on function public\.delete_vault_secret/i);
  });
});
