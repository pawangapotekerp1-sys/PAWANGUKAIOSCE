import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000008_ai_config_and_byok.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260501000008_ai_config_and_byok migration", () => {
  test("defines platform config, student credentials, and AI usage log tables", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.ai_provider_configs/i);
    expect(migrationSql).toMatch(/create table if not exists public\.user_ai_credentials/i);
    expect(migrationSql).toMatch(/create table if not exists public\.ai_usage_logs/i);
  });

  test("enables row level security and seeds a default disabled platform config", () => {
    expect(migrationSql).toMatch(/alter table public\.ai_provider_configs enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.user_ai_credentials enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.ai_usage_logs enable row level security/i);
    expect(migrationSql).toMatch(/insert into public\.ai_provider_configs/i);
  });
});
