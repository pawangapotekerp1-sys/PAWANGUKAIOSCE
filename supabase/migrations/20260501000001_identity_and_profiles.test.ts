import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000001_identity_and_profiles.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260501000001_identity_and_profiles migration", () => {
  test("stays focused on identity bootstrap and does not create academic catalog tables", () => {
    expect(migrationSql).not.toMatch(/create table if not exists public\.blocks/i);
    expect(migrationSql).not.toMatch(/create table if not exists public\.topics/i);
  });
});
