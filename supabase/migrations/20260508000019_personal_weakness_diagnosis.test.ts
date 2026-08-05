import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260508000019_personal_weakness_diagnosis.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260508000019_personal_weakness_diagnosis migration", () => {
  test("adds diagnosis-source support to exam templates", () => {
    expect(migrationSql).toMatch(/alter table public\.exam_templates/i);
    expect(migrationSql).toMatch(/add column if not exists diagnostic_source boolean not null default false/i);
    expect(migrationSql).not.toMatch(/question_count\s*=\s*50[\s\S]*diagnostic_source/i);
  });

  test("creates runtime behavior capture tables", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.attempt_item_behavior_metrics/i);
    expect(migrationSql).toMatch(/create table if not exists public\.attempt_answer_change_events/i);
    expect(migrationSql).toMatch(/time_spent_seconds integer not null default 0/i);
    expect(migrationSql).toMatch(/changed_correct_to_wrong_count integer not null default 0/i);
  });

  test("creates a behavior-aware answer save rpc", () => {
    expect(migrationSql).toMatch(/create or replace function public\.save_attempt_answer/i);
    expect(migrationSql).toMatch(/time_spent_delta_seconds integer/i);
    expect(migrationSql).toMatch(/attempt_answer_change_events/i);
    expect(migrationSql).toMatch(/attempt_item_behavior_metrics/i);
  });

  test("only allows answer saves while the attempt is actively running", () => {
    expect(migrationSql).toMatch(/if target_attempt\.status <> 'in_progress' then/i);
    expect(migrationSql).toMatch(/Attempt try out belum aktif untuk menerima jawaban\./i);
  });

  test("creates per-attempt diagnosis snapshot tables", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.attempt_diagnostic_snapshots/i);
    expect(migrationSql).toMatch(/create table if not exists public\.attempt_diagnostic_topic_snapshots/i);
    expect(migrationSql).toMatch(/weakness_score_base numeric\(8,4\) not null/i);
  });

  test("adds snapshot query indexes", () => {
    expect(migrationSql).toMatch(/attempt_diagnostic_snapshots_user_submitted_idx/i);
    expect(migrationSql).toMatch(/attempt_diagnostic_topic_snapshots_attempt_topic_idx/i);
  });

  test("rebuilds diagnosis snapshots during submit for approved templates", () => {
    expect(migrationSql).toMatch(/create or replace function public\.rebuild_attempt_diagnostic_snapshot/i);
    expect(migrationSql).toMatch(/insert into public\.attempt_diagnostic_snapshots/i);
    expect(migrationSql).toMatch(/insert into public\.attempt_diagnostic_topic_snapshots/i);
    expect(migrationSql).toMatch(/create or replace function public\.submit_attempt/i);
    expect(migrationSql).toMatch(/diagnostic_source = true/i);
    expect(migrationSql).toMatch(/perform public\.rebuild_attempt_diagnostic_snapshot\(target_attempt\.id\)/i);
  });

  test("adds the personal weakness diagnosis range rpc", () => {
    expect(migrationSql).toMatch(/create or replace function public\.get_personal_weakness_diagnosis/i);
    expect(migrationSql).toMatch(/date_from date/i);
    expect(migrationSql).toMatch(/date_to date/i);
    expect(migrationSql).toMatch(/user_timezone text/i);
    expect(migrationSql).toMatch(/diagnosisMode/i);
    expect(migrationSql).toMatch(/globalBehaviorPatterns/i);
    expect(migrationSql).toMatch(/subtopicRankings/i);
    expect(migrationSql).toMatch(/submitted_at >= range_start_utc/i);
    expect(migrationSql).toMatch(/submitted_at < range_end_utc/i);
    expect(migrationSql).toMatch(/diagnostic_source = true/i);
  });

  test("uses postgres-compatible number formatting for diagnosis evidence text", () => {
    expect(migrationSql).not.toMatch(/format\('\%\.0f/i);
  });

  test("does not aggregate uuid values with unsupported max uuid calls", () => {
    expect(migrationSql).not.toMatch(/max\(topic_snapshot\.block_id\)/i);
  });
});
