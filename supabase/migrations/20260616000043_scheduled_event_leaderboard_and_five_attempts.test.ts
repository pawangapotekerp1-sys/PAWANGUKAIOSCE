import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260616000043_scheduled_event_leaderboard_and_five_attempts.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();
const normalizedMigrationSql = normalizeSql(migrationSql);

const getFunctionBody = (functionName: string) => {
  const match = migrationSql.match(
    new RegExp(
      `create or replace function public\\.${functionName}[\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
      "i",
    ),
  );

  expect(match, `expected function ${functionName} to exist`).not.toBeNull();

  return normalizeSql(match?.[1] ?? "");
};

describe("20260616000043 scheduled event leaderboard and five attempts migration", () => {
  test("keeps scheduled start logic scoped to the active cycle while raising the submitted cap to five", () => {
    const startBody = getFunctionBody("start_scheduled_tryout_attempt");

    expect(startBody).toContain("event_cycle = event_row.current_cycle");
    expect(startBody).toContain("status in ('in_progress', 'paused')");
    expect(startBody).toContain("select count(*) into submitted_attempt_count from public.scheduled_tryout_attempts");
    expect(startBody).toContain("where event_id = event_row.id and event_cycle = event_row.current_cycle and user_id = auth.uid() and status = 'submitted'");
    expect(startBody).toContain("if submitted_attempt_count >= 5 then");
    expect(startBody).toContain("batas attempt untuk event try out terjadwal ini sudah habis");
  });

  test("defines a dedicated leaderboard rpc with an optional historical cycle selector", () => {
    const leaderboardBody = getFunctionBody("get_scheduled_event_leaderboard");

    expect(normalizedMigrationSql).toContain("create or replace function public.get_scheduled_event_leaderboard");
    expect(normalizedMigrationSql).toContain("target_event_id uuid");
    expect(normalizedMigrationSql).toContain("target_event_cycle integer default null");
    expect(leaderboardBody).toContain("from public.scheduled_tryout_events where id = target_event_id and editorial_status = 'published'");
    expect(leaderboardBody).toContain("select current_cycle into resolved_event_cycle from public.scheduled_tryout_events where id = target_event_id");
    expect(leaderboardBody).toContain("resolved_event_cycle := coalesce(target_event_cycle, resolved_event_cycle)");
  });

  test("ranks only submitted pro users by best score, then by the earliest attempt that achieved it", () => {
    const leaderboardBody = getFunctionBody("get_scheduled_event_leaderboard");

    expect(leaderboardBody).toContain("where attempt.status = 'submitted' and attempt.submitted_at is not null and profiles.role = 'pro'");
    expect(leaderboardBody).toContain("join event_context on event_context.id = attempt.event_id and event_context.event_cycle = attempt.event_cycle");
    expect(leaderboardBody).toContain("row_number() over ( partition by attempt.user_id order by attempt.submitted_at asc, attempt.id asc ) as attempt_number");
    expect(leaderboardBody).toContain("max(attempt.score_percentage)::numeric(5,2) as best_score");
    expect(leaderboardBody).toContain("attempt.attempt_number as best_score_attempt_number");
    expect(leaderboardBody).toContain("row_number() over ( partition by attempt.user_id order by attempt.attempt_number asc, attempt.submitted_at asc, attempt.id asc ) as best_row");
    expect(leaderboardBody).toContain("dense_rank() over ( order by first_best_score_attempt.best_score desc, first_best_score_attempt.best_score_attempt_number asc ) as rank");
    expect(leaderboardBody).toContain("order by ranked_rows.rank asc, ranked_rows.best_score desc, ranked_rows.best_score_attempt_number asc, ranked_rows.submitted_at asc, ranked_rows.attempt_id asc");
  });

  test("derives leaderboard state from the current event window and exposes the rpc to app callers", () => {
    const leaderboardBody = getFunctionBody("get_scheduled_event_leaderboard");

    expect(leaderboardBody).toContain("case when timezone('utc', now()) < event.access_end_at then 'live' else 'final' end as leaderboard_state");
    expect(normalizedMigrationSql).toContain("grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to authenticated");
    expect(normalizedMigrationSql).toContain("grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to service_role");
  });
});
