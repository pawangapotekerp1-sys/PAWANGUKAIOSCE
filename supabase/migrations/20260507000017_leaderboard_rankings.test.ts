import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260507000017_leaderboard_rankings.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260507000017_leaderboard_rankings migration", () => {
  test("creates leaderboard ranking helpers with top 10 limit", () => {
    expect(normalizedSql).toContain("create or replace function public.get_leaderboard");
    expect(normalizedSql).toContain("dense_rank()");
    expect(normalizedSql).toContain("limit 10");
  });

  test("filters leaderboard participants to pro users only", () => {
    expect(normalizedSql).toContain("profiles.role = 'pro'");
  });

  test("includes block-specific score recomputation from attempt items", () => {
    expect(normalizedSql).toContain("from public.attempt_items");
    expect(normalizedSql).toContain("left join public.answers");
  });
});
