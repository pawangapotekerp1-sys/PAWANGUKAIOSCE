import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260617000044_fix_leaderboard_rpc_contracts.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260617000044 fix leaderboard rpc contracts migration", () => {
  test("replaces the scheduled leaderboard rpc with the declared integer attempt-number contract", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("create or replace function public.get_scheduled_event_leaderboard");
    expect(normalizedSql).toContain("best_score_attempt_number integer");
    expect(normalizedSql).toContain("attempt.attempt_number::integer as best_score_attempt_number");
  });

  test("keeps signed-in app access and asks postgrest to reload the function schema", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain("grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to authenticated");
    expect(normalizedSql).toContain("grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to service_role");
    expect(normalizedSql).toContain("notify pgrst, 'reload schema'");
  });
});
