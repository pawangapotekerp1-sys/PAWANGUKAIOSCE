import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260507000016_admin_users_and_leaderboard_alias.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260507000016_admin_users_and_leaderboard_alias migration", () => {
  test("adds leaderboard_alias and admin user helpers", () => {
    expect(normalizedSql).toContain(
      "alter table public.profiles add column if not exists leaderboard_alias text",
    );
    expect(normalizedSql).toContain("create or replace function public.list_admin_users");
    expect(normalizedSql).toContain("create or replace function public.admin_update_user_role");
  });

  test("guards privileged helpers behind admin checks", () => {
    expect(normalizedSql).toContain("if not public.is_admin()");
    expect(normalizedSql).toContain("raise exception 'aksi ini hanya tersedia untuk admin.'");
  });
});
