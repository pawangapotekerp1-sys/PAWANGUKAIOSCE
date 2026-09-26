import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260926221200_increase_scheduled_tryout_attempts_to_8.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();
const normalizedMigrationSql = normalizeSql(migrationSql);

const getFunctionBody = (functionName: string) => {
  const match = migrationSql.match(
    new RegExp(
      "create or replace function public\\.${functionName}[\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;",
      "i",
    ),
  );

  expect(match, "expected function ${functionName} to exist").not.toBeNull();

  return normalizeSql(match?.[1] ?? "");
};

describe("20260926221200_increase_scheduled_tryout_attempts_to_8 migration", () => {
  test("raises the submitted cap to eight", () => {
    const startBody = getFunctionBody("start_scheduled_tryout_attempt");

    expect(startBody).toContain("if submitted_attempt_count >= 8 then");
  });
});
