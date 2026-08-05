import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260506000015_profile_avatar_management.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260506000015_profile_avatar_management migration", () => {
  test("adds avatar_url to profiles and provisions avatar storage policies", () => {
    expect(normalizedSql).toContain(
      "alter table public.profiles add column if not exists avatar_url text",
    );
    expect(normalizedSql).toContain("insert into storage.buckets");
    expect(normalizedSql).toContain("'profile-avatars'");
    expect(normalizedSql).toContain(
      'create policy "profile_avatars_insert_own" on storage.objects',
    );
  });

  test("limits avatar objects to the authenticated user's own folder", () => {
    expect(normalizedSql).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(normalizedSql).toContain(
      'create policy "profile_avatars_select_own" on storage.objects',
    );
    expect(normalizedSql).toContain(
      'create policy "profile_avatars_delete_own" on storage.objects',
    );
  });

  test("guards avatar bucket bootstrap for cold local databases", () => {
    expect(normalizedSql).toContain("to_regclass('storage.buckets')");
    expect(normalizedSql).toContain("to_regclass('storage.objects')");
  });
});
