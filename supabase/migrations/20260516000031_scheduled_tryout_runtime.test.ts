import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260516000031_scheduled_tryout_runtime.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

const getFunctionBody = (functionName: string) => {
  const match = migrationSql.match(
    new RegExp(
      `create or replace function public\\.${functionName}[\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
      "i",
    ),
  );

  expect(match, `expected function ${functionName} to exist`).not.toBeNull();

  return match?.[1] ?? "";
};

describe("20260516000031_scheduled_tryout_runtime migration", () => {
  test("defines the scheduled tryout runtime tables", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_events/i);
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_event_questions/i);
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_event_question_options/i);
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_attempts/i);
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_attempt_items/i);
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_answers/i);
    expect(migrationSql).toMatch(/create table if not exists public\.scheduled_tryout_attempt_results/i);
  });

  test("defines the scheduled runtime indexes and manager helper", () => {
    expect(migrationSql).toMatch(/create or replace function public\.can_manage_scheduled_tryouts/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempts_event_id_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempts_event_cycle_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempts_user_id_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempts_submitted_at_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempt_results_event_id_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempt_results_event_cycle_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempt_results_user_id_idx/i);
    expect(migrationSql).toMatch(/create index if not exists scheduled_tryout_attempt_results_submitted_at_idx/i);
  });

  test("enables rls on the scheduled runtime tables", () => {
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_events enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_event_questions enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_event_question_options enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_attempts enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_attempt_items enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_answers enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.scheduled_tryout_attempt_results enable row level security/i);
  });

  test("keeps student runtime access read-only while writes stay behind manager boundaries", () => {
    expect(migrationSql).toMatch(/create policy "scheduled_tryout_attempts_select_own_or_manager"/i);
    expect(migrationSql).not.toMatch(/create policy "scheduled_tryout_attempts_insert_own_or_manager"/i);
    expect(migrationSql).not.toMatch(/create policy "scheduled_tryout_attempts_update_own_or_manager"/i);
    expect(migrationSql).toMatch(/create policy "scheduled_tryout_attempts_write_manager"/i);

    expect(migrationSql).toMatch(/create policy "scheduled_tryout_attempt_items_select_own_or_manager"/i);
    expect(migrationSql).toMatch(/create policy "scheduled_tryout_attempt_items_write_manager"/i);

    expect(migrationSql).toMatch(/create policy "scheduled_tryout_answers_select_own_or_manager"/i);
    expect(migrationSql).not.toMatch(/create policy "scheduled_tryout_answers_insert_own_or_manager"/i);
    expect(migrationSql).not.toMatch(/create policy "scheduled_tryout_answers_update_own_or_manager"/i);
    expect(migrationSql).toMatch(/create policy "scheduled_tryout_answers_write_manager"/i);

    expect(migrationSql).toMatch(/create policy "scheduled_tryout_attempt_results_select_own_or_manager"/i);
    expect(migrationSql).toMatch(/create policy "scheduled_tryout_attempt_results_write_manager"/i);
  });

  test("defines rpc surfaces with explicit grants", () => {
    expect(migrationSql).toMatch(/create or replace function public\.list_scheduled_tryout_catalog_entries/i);
    expect(migrationSql).toMatch(/create or replace function public\.sync_scheduled_tryout_attempt/i);
    expect(migrationSql).toMatch(/create or replace function public\.start_scheduled_tryout_attempt/i);
    expect(migrationSql).toMatch(/create or replace function public\.save_scheduled_tryout_answer/i);
    expect(migrationSql).toMatch(/create or replace function public\.pause_scheduled_tryout_attempt/i);
    expect(migrationSql).toMatch(/create or replace function public\.resume_scheduled_tryout_attempt/i);
    expect(migrationSql).toMatch(/create or replace function public\.submit_scheduled_tryout_attempt/i);
    expect(migrationSql).toMatch(/create or replace function public\.upsert_scheduled_tryout_event/i);
    expect(migrationSql).toMatch(/create or replace function public\.reactivate_scheduled_tryout_event/i);
    expect(migrationSql).toMatch(/create or replace function public\.delete_scheduled_tryout_event/i);
    expect(migrationSql).toMatch(/raise exception 'scheduled tryout catalog rpc shell is not implemented in task 1\.'/i);
    expect(migrationSql).toMatch(/raise exception 'scheduled tryout delete rpc shell is not implemented in task 1\.'/i);
    expect(migrationSql).toMatch(/grant execute on function public\.can_manage_scheduled_tryouts\(\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.can_manage_scheduled_tryouts\(\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.list_scheduled_tryout_catalog_entries\(\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.list_scheduled_tryout_catalog_entries\(\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.sync_scheduled_tryout_attempt\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.sync_scheduled_tryout_attempt\(uuid\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.start_scheduled_tryout_attempt\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.start_scheduled_tryout_attempt\(uuid\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.save_scheduled_tryout_answer\(uuid, uuid, text, boolean\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.save_scheduled_tryout_answer\(uuid, uuid, text, boolean\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.pause_scheduled_tryout_attempt\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.pause_scheduled_tryout_attempt\(uuid\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.resume_scheduled_tryout_attempt\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.resume_scheduled_tryout_attempt\(uuid\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.submit_scheduled_tryout_attempt\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.submit_scheduled_tryout_attempt\(uuid\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.upsert_scheduled_tryout_event\(uuid, jsonb\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.upsert_scheduled_tryout_event\(uuid, jsonb\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.reactivate_scheduled_tryout_event\(uuid, timestamptz, timestamptz\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.reactivate_scheduled_tryout_event\(uuid, timestamptz, timestamptz\) to service_role/i);
    expect(migrationSql).toMatch(/grant execute on function public\.delete_scheduled_tryout_event\(uuid\) to authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.delete_scheduled_tryout_event\(uuid\) to service_role/i);
  });

  test("scheduled event upsert stays transactional inside a single rpc boundary", () => {
    const upsertBody = getFunctionBody("upsert_scheduled_tryout_event");

    expect(upsertBody).toMatch(/public\.can_manage_scheduled_tryouts\(\)/i);
    expect(upsertBody).toMatch(/insert into public\.scheduled_tryout_events/i);
    expect(upsertBody).toMatch(/update public\.scheduled_tryout_events/i);
    expect(upsertBody).toMatch(/delete from public\.scheduled_tryout_event_questions/i);
    expect(upsertBody).toMatch(/insert into public\.scheduled_tryout_event_question_options/i);
    expect(upsertBody).toMatch(/jsonb_array_elements/i);
  });

  test("locks scheduled start semantics to published active windows and three submitted attempts per cycle", () => {
    const startBody = getFunctionBody("start_scheduled_tryout_attempt");

    expect(startBody).toMatch(/from public\.profiles/i);
    expect(startBody).toMatch(/role::text in \('pro',\s*'mentor'\)/i);
    expect(startBody).toMatch(/editorial_status\s*=\s*'published'/i);
    expect(startBody).toMatch(/access_start_at\s*<=\s*timezone\('utc', now\(\)\)/i);
    expect(startBody).toMatch(/access_end_at\s*>\s*timezone\('utc', now\(\)\)/i);
    expect(startBody).not.toMatch(/access_end_at\s*>=\s*timezone\('utc', now\(\)\)/i);
    expect(startBody).toMatch(/event_cycle\s*=\s*event_row\.current_cycle/i);
    expect(startBody).toMatch(/status\s+in\s+\('in_progress',\s*'paused'\)/i);
    expect(startBody).toMatch(/status\s*=\s*'submitted'/i);
    expect(startBody).toMatch(
      /select count\(\*\)[\s\S]*from public\.scheduled_tryout_attempts[\s\S]*where event_id = event_row\.id[\s\S]*and event_cycle = event_row\.current_cycle[\s\S]*and user_id = auth\.uid\(\)[\s\S]*and status = 'submitted'/i,
    );
    expect(startBody).toMatch(/submitted_attempt_count\s*>=\s*3|count\(\*\)\s*>=\s*3/i);
  });

  test("tracks opened_at when answer writes touch attempt items", () => {
    const saveBody = getFunctionBody("save_scheduled_tryout_answer");

    expect(saveBody).toMatch(/target_attempt\.status\s*<>\s*'in_progress'/i);
    expect(saveBody).toMatch(/raise exception 'Attempt try out terjadwal hanya bisa dijawab saat sesi sedang berjalan\.'/i);
    expect(saveBody).not.toMatch(/target_attempt\.status\s*=\s*'submitted'/i);
    expect(saveBody).toMatch(/update public\.scheduled_tryout_attempt_items/i);
    expect(saveBody).toMatch(/set opened_at = coalesce\(opened_at,\s*answer_time\)/i);
  });

  test("allows resume after deadline while still validating ownership and event existence", () => {
    const resumeBody = getFunctionBody("resume_scheduled_tryout_attempt");

    expect(resumeBody).toMatch(/from public\.scheduled_tryout_attempts/i);
    expect(resumeBody).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
    expect(resumeBody).toMatch(/join public\.scheduled_tryout_events/i);
    expect(resumeBody).not.toMatch(/access_end_at\s*[<>]=?\s*timezone\('utc', now\(\)\)/i);
    expect(resumeBody).not.toMatch(/access_start_at\s*[<>]=?\s*timezone\('utc', now\(\)\)/i);
  });

  test("reactivation advances the cycle and hard-clears prior runtime state", () => {
    const reactivateBody = getFunctionBody("reactivate_scheduled_tryout_event");

    expect(reactivateBody).toMatch(/access_end_at\s*>\s*timezone\('utc', now\(\)\)/i);
    expect(reactivateBody).toMatch(/current_cycle\s*=\s*current_cycle\s*\+\s*1/i);
    expect(reactivateBody).toMatch(/delete from public\.scheduled_tryout_answers/i);
    expect(reactivateBody).toMatch(/delete from public\.scheduled_tryout_attempt_results/i);
    expect(reactivateBody).toMatch(/delete from public\.scheduled_tryout_attempts/i);
  });

  test("scheduled submit syncs the attempt, finalizes elapsed time, and upserts scored results", () => {
    const submitBody = getFunctionBody("submit_scheduled_tryout_attempt");

    expect(submitBody).toMatch(/perform public\.sync_scheduled_tryout_attempt\(target_attempt_id\)/i);
    expect(submitBody).toMatch(/from public\.scheduled_tryout_attempts/i);
    expect(submitBody).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
    expect(submitBody).toMatch(/status = 'submitted'/i);
    expect(submitBody).toMatch(/submitted_at = submission_time/i);
    expect(submitBody).toMatch(/elapsed_seconds = time_used_seconds_value/i);
    expect(submitBody).toMatch(/insert into public\.scheduled_tryout_attempt_results/i);
    expect(submitBody).toMatch(/question_count/i);
    expect(submitBody).toMatch(/correct_count/i);
    expect(submitBody).toMatch(/wrong_count/i);
    expect(submitBody).toMatch(/unanswered_count/i);
    expect(submitBody).toMatch(/score_percentage/i);
    expect(submitBody).toMatch(/on conflict \(attempt_id\) do update/i);
    expect(submitBody).not.toMatch(/scheduled tryout submit rpc shell is not implemented/i);
  });

  test("sync helper preserves seen removals, adds new questions, and recomputes timer state", () => {
    const syncBody = getFunctionBody("sync_scheduled_tryout_attempt");
    const deletePos = syncBody.search(/delete from public\.scheduled_tryout_attempt_items/i);
    const insertPos = syncBody.search(/insert into public\.scheduled_tryout_attempt_items/i);

    expect(migrationSql).toMatch(/create or replace function public\.sync_scheduled_tryout_attempt/i);
    expect(deletePos).toBeGreaterThan(-1);
    expect(insertPos).toBeGreaterThan(-1);
    expect(deletePos).toBeLessThan(insertPos);
    expect(syncBody).toMatch(/insert into public\.scheduled_tryout_attempt_items/i);
    expect(syncBody).toMatch(/left join public\.scheduled_tryout_answers/i);
    expect(syncBody).toMatch(/opened_at is null/i);
    expect(syncBody).toMatch(/existing_answer\.id is null|scheduled_tryout_answers\.id is null/i);
    expect(syncBody).not.toMatch(/sort_order = current_question\.next_sort_order/i);
    expect(syncBody).not.toMatch(/question_snapshot = current_question\.stem[\s\S]*sort_order = current_question\.next_sort_order/i);
    expect(syncBody).toMatch(/max_sort_order \+ current_question\.insert_rank|max_sort_order \+ row_number\(\)/i);
    expect(syncBody).toMatch(/set\s+sort_order\s*=\s*rerank_shift\.temp_sort_order/i);
    expect(syncBody).toMatch(/set\s+sort_order\s*=\s*ranked_attempt_item\.next_sort_order/i);
    expect(syncBody).toMatch(/set\s+total_questions\s*=/i);
    expect(syncBody).toMatch(/time_limit_seconds\s*=\s*.*total_questions.*\*\s*60|time_limit_seconds\s*=\s*.*question_count.*\*\s*60/i);
  });
});
