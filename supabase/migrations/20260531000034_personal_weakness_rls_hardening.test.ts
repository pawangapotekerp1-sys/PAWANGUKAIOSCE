import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260531000034_personal_weakness_rls_hardening.sql",
);

describe("20260531000034 personal weakness RLS hardening migration", () => {
  test("exists and enables RLS on diagnosis and behavior tables", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const normalizedSql = readFileSync(migrationPath, "utf8")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    expect(normalizedSql).toContain(
      "alter table public.attempt_item_behavior_metrics enable row level security",
    );
    expect(normalizedSql).toContain(
      "alter table public.attempt_answer_change_events enable row level security",
    );
    expect(normalizedSql).toContain(
      "alter table public.attempt_diagnostic_snapshots enable row level security",
    );
    expect(normalizedSql).toContain(
      "alter table public.attempt_diagnostic_topic_snapshots enable row level security",
    );
  });

  test("allows users to read only their own behavior and diagnosis rows", () => {
    const normalizedSql = readFileSync(migrationPath, "utf8")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    expect(normalizedSql).toContain(
      'create policy "attempt_item_behavior_metrics_select_own_or_admin" on public.attempt_item_behavior_metrics for select using ( exists ( select 1 from public.attempts where attempts.id = attempt_item_behavior_metrics.attempt_id and ( attempts.user_id = auth.uid() or public.is_admin() ) ) )',
    );
    expect(normalizedSql).toContain(
      'create policy "attempt_answer_change_events_select_own_or_admin" on public.attempt_answer_change_events for select using ( exists ( select 1 from public.attempts where attempts.id = attempt_answer_change_events.attempt_id and ( attempts.user_id = auth.uid() or public.is_admin() ) ) )',
    );
    expect(normalizedSql).toContain(
      'create policy "attempt_diagnostic_snapshots_select_own_or_admin" on public.attempt_diagnostic_snapshots for select using ( user_id = auth.uid() or public.is_admin() )',
    );
    expect(normalizedSql).toContain(
      'create policy "attempt_diagnostic_topic_snapshots_select_own_or_admin" on public.attempt_diagnostic_topic_snapshots for select using ( exists ( select 1 from public.attempts where attempts.id = attempt_diagnostic_topic_snapshots.attempt_id and ( attempts.user_id = auth.uid() or public.is_admin() ) ) )',
    );
  });

  test("keeps direct writes restricted to admins", () => {
    const normalizedSql = readFileSync(migrationPath, "utf8")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    expect(normalizedSql).toContain(
      'create policy "attempt_item_behavior_metrics_write_admin" on public.attempt_item_behavior_metrics for all using ( public.is_admin() ) with check ( public.is_admin() )',
    );
    expect(normalizedSql).toContain(
      'create policy "attempt_answer_change_events_write_admin" on public.attempt_answer_change_events for all using ( public.is_admin() ) with check ( public.is_admin() )',
    );
    expect(normalizedSql).toContain(
      'create policy "attempt_diagnostic_snapshots_write_admin" on public.attempt_diagnostic_snapshots for all using ( public.is_admin() ) with check ( public.is_admin() )',
    );
    expect(normalizedSql).toContain(
      'create policy "attempt_diagnostic_topic_snapshots_write_admin" on public.attempt_diagnostic_topic_snapshots for all using ( public.is_admin() ) with check ( public.is_admin() )',
    );
  });
});
