import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260510000021_invited_users_default_pro.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260510000021_invited_users_default_pro migration", () => {
  test("defaults invited users to pro while preserving regular signups as pendaftar_baru", () => {
    expect(migrationSql).toMatch(/create or replace function public\.handle_new_user\(\)/i);
    expect(migrationSql).toMatch(/when new\.invited_at is not null then 'pro'::public\.app_role/i);
    expect(migrationSql).toMatch(/else 'pendaftar_baru'::public\.app_role/i);
    expect(migrationSql).toMatch(/insert into public\.profiles[\s\S]*role/i);
  });

  test("does not overwrite an existing profile role during conflict updates", () => {
    expect(migrationSql).not.toMatch(/on conflict \(id\) do update[\s\S]*role\s*=/i);
  });
});
