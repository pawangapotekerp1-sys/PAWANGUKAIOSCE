-- Migration: 20261125000001_fix_scheduled_tryout_statement_timeout.sql
-- Purpose: Eliminate SQLSTATE 57014 (canceling statement due to statement timeout) on
--          Scheduled Tryout Session and Scheduled Tryout Review by:
--          1. Restoring can_manage_scheduled_tryouts() to SECURITY DEFINER with empty search_path
--             and InitPlan (select auth.uid()) so RLS never triggers nested profiles RLS scans.
--          2. Denormalizing user_id & block_name_snapshot onto scheduled_tryout_attempt_items
--             and user_id onto scheduled_tryout_answers, replacing all FOR ALL policies and
--             correlated EXISTS SubPlans with O(1) InitPlan ownership checks.
--          3. Adding missing composite & FK indexes and refreshing planner statistics.
--          4. Adding questions_updated_at / synced_questions_at watermarks, removing 300-row
--             non-HOT sync rewrites from start/resume/submit, auto-finalizing expired active
--             attempts on start, and preserving submitted review history across reactivations.

-- ============================================================================
-- 1. Helper Function: O(1) SECURITY DEFINER manager check (safe empty search_path)
-- ============================================================================

create or replace function public.can_manage_scheduled_tryouts()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role::text in ('admin', 'mentor')
  );
$$;

revoke all on function public.can_manage_scheduled_tryouts() from public, anon;
grant execute on function public.can_manage_scheduled_tryouts() to authenticated, service_role;

-- ============================================================================
-- 2. Schema Additions & Backfills (Zero-Downtime Safe)
-- ============================================================================

alter table public.scheduled_tryout_events
  add column if not exists questions_updated_at timestamptz;

update public.scheduled_tryout_events
set questions_updated_at = coalesce(updated_at, created_at, timezone('utc', now()))
where questions_updated_at is null;

alter table public.scheduled_tryout_events
  alter column questions_updated_at set default timezone('utc', now()),
  alter column questions_updated_at set not null;

alter table public.scheduled_tryout_attempts
  add column if not exists synced_questions_at timestamptz;

alter table public.scheduled_tryout_attempt_items
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

alter table public.scheduled_tryout_attempt_items
  add column if not exists block_name_snapshot text;

alter table public.scheduled_tryout_answers
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

-- Suspend updated_at triggers during backfill to avoid per-row trigger overhead
alter table public.scheduled_tryout_attempt_items
  disable trigger set_scheduled_tryout_attempt_items_updated_at;

update public.scheduled_tryout_attempt_items as item
set
  user_id = coalesce(item.user_id, attempt.user_id),
  block_name_snapshot = coalesce(item.block_name_snapshot, block.name, 'Tanpa blok')
from public.scheduled_tryout_attempts as attempt
left join public.blocks as block
  on block.id = item.block_id_snapshot
where attempt.id = item.attempt_id
  and (item.user_id is null or item.block_name_snapshot is null);

alter table public.scheduled_tryout_attempt_items
  enable trigger set_scheduled_tryout_attempt_items_updated_at;

alter table public.scheduled_tryout_answers
  disable trigger set_scheduled_tryout_answers_updated_at;

update public.scheduled_tryout_answers as ans
set user_id = attempt.user_id
from public.scheduled_tryout_attempts as attempt
where attempt.id = ans.attempt_id
  and ans.user_id is null;

alter table public.scheduled_tryout_answers
  enable trigger set_scheduled_tryout_answers_updated_at;

alter table public.scheduled_tryout_attempts
  disable trigger set_scheduled_tryout_attempts_updated_at;

update public.scheduled_tryout_attempts as attempt
set synced_questions_at = event.questions_updated_at
from public.scheduled_tryout_events as event
where event.id = attempt.event_id
  and attempt.synced_questions_at is null;

alter table public.scheduled_tryout_attempts
  enable trigger set_scheduled_tryout_attempts_updated_at;

-- Enforce non-null invariants on denormalized ownership/snapshot columns
alter table public.scheduled_tryout_attempt_items
  drop constraint if exists scheduled_tryout_attempt_items_user_id_nn,
  add constraint scheduled_tryout_attempt_items_user_id_nn
    check (user_id is not null) not valid;
alter table public.scheduled_tryout_attempt_items
  validate constraint scheduled_tryout_attempt_items_user_id_nn;

alter table public.scheduled_tryout_attempt_items
  drop constraint if exists scheduled_tryout_attempt_items_block_name_nn,
  add constraint scheduled_tryout_attempt_items_block_name_nn
    check (block_name_snapshot is not null) not valid;
alter table public.scheduled_tryout_attempt_items
  validate constraint scheduled_tryout_attempt_items_block_name_nn;

alter table public.scheduled_tryout_answers
  drop constraint if exists scheduled_tryout_answers_user_id_nn,
  add constraint scheduled_tryout_answers_user_id_nn
    check (user_id is not null) not valid;
alter table public.scheduled_tryout_answers
  validate constraint scheduled_tryout_answers_user_id_nn;

-- Statement-level triggers with transition tables to bump questions_updated_at once per statement
create or replace function public.bump_scheduled_event_questions_watermark_from_questions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.scheduled_tryout_events
    set questions_updated_at = timezone('utc', now())
    where id in (select distinct old_rows.event_id from old_rows where old_rows.event_id is not null);
  else
    update public.scheduled_tryout_events
    set questions_updated_at = timezone('utc', now())
    where id in (select distinct new_rows.event_id from new_rows where new_rows.event_id is not null);
  end if;

  return null;
end;
$$;

revoke all on function public.bump_scheduled_event_questions_watermark_from_questions() from public, anon, authenticated;
grant execute on function public.bump_scheduled_event_questions_watermark_from_questions() to service_role;

create or replace function public.bump_scheduled_event_questions_watermark_from_options()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.scheduled_tryout_events
    set questions_updated_at = timezone('utc', now())
    where id in (
      select distinct q.event_id
      from old_rows
      join public.scheduled_tryout_event_questions as q
        on q.id = old_rows.event_question_id
    );
  else
    update public.scheduled_tryout_events
    set questions_updated_at = timezone('utc', now())
    where id in (
      select distinct q.event_id
      from new_rows
      join public.scheduled_tryout_event_questions as q
        on q.id = new_rows.event_question_id
    );
  end if;

  return null;
end;
$$;

revoke all on function public.bump_scheduled_event_questions_watermark_from_options() from public, anon, authenticated;
grant execute on function public.bump_scheduled_event_questions_watermark_from_options() to service_role;

drop trigger if exists bump_scheduled_event_questions_watermark_on_q on public.scheduled_tryout_event_questions;
drop trigger if exists bump_scheduled_event_questions_watermark_on_q_ins on public.scheduled_tryout_event_questions;
drop trigger if exists bump_scheduled_event_questions_watermark_on_q_upd on public.scheduled_tryout_event_questions;
drop trigger if exists bump_scheduled_event_questions_watermark_on_q_del on public.scheduled_tryout_event_questions;

create trigger bump_scheduled_event_questions_watermark_on_q_ins
after insert on public.scheduled_tryout_event_questions
referencing new table as new_rows
for each statement
execute function public.bump_scheduled_event_questions_watermark_from_questions();

create trigger bump_scheduled_event_questions_watermark_on_q_upd
after update on public.scheduled_tryout_event_questions
referencing new table as new_rows
for each statement
execute function public.bump_scheduled_event_questions_watermark_from_questions();

create trigger bump_scheduled_event_questions_watermark_on_q_del
after delete on public.scheduled_tryout_event_questions
referencing old table as old_rows
for each statement
execute function public.bump_scheduled_event_questions_watermark_from_questions();

drop trigger if exists bump_scheduled_event_questions_watermark_on_opt on public.scheduled_tryout_event_question_options;
drop trigger if exists bump_scheduled_event_questions_watermark_on_opt_ins on public.scheduled_tryout_event_question_options;
drop trigger if exists bump_scheduled_event_questions_watermark_on_opt_upd on public.scheduled_tryout_event_question_options;
drop trigger if exists bump_scheduled_event_questions_watermark_on_opt_del on public.scheduled_tryout_event_question_options;

create trigger bump_scheduled_event_questions_watermark_on_opt_ins
after insert on public.scheduled_tryout_event_question_options
referencing new table as new_rows
for each statement
execute function public.bump_scheduled_event_questions_watermark_from_options();

create trigger bump_scheduled_event_questions_watermark_on_opt_upd
after update on public.scheduled_tryout_event_question_options
referencing new table as new_rows
for each statement
execute function public.bump_scheduled_event_questions_watermark_from_options();

create trigger bump_scheduled_event_questions_watermark_on_opt_del
after delete on public.scheduled_tryout_event_question_options
referencing old table as old_rows
for each statement
execute function public.bump_scheduled_event_questions_watermark_from_options();

create or replace function public.populate_scheduled_tryout_item_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    select a.user_id
    into new.user_id
    from public.scheduled_tryout_attempts as a
    where a.id = new.attempt_id;
  end if;

  if new.block_name_snapshot is null then
    if new.block_id_snapshot is not null then
      select coalesce(b.name, 'Tanpa blok')
      into new.block_name_snapshot
      from public.blocks as b
      where b.id = new.block_id_snapshot;
    end if;

    new.block_name_snapshot := coalesce(new.block_name_snapshot, 'Tanpa blok');
  end if;

  return new;
end;
$$;

revoke all on function public.populate_scheduled_tryout_item_defaults() from public, anon, authenticated;
grant execute on function public.populate_scheduled_tryout_item_defaults() to service_role;

drop trigger if exists populate_scheduled_tryout_item_defaults on public.scheduled_tryout_attempt_items;
create trigger populate_scheduled_tryout_item_defaults
before insert on public.scheduled_tryout_attempt_items
for each row
execute function public.populate_scheduled_tryout_item_defaults();

create or replace function public.populate_scheduled_tryout_answer_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    select a.user_id
    into new.user_id
    from public.scheduled_tryout_attempts as a
    where a.id = new.attempt_id;
  end if;

  return new;
end;
$$;

revoke all on function public.populate_scheduled_tryout_answer_defaults() from public, anon, authenticated;
grant execute on function public.populate_scheduled_tryout_answer_defaults() to service_role;

drop trigger if exists populate_scheduled_tryout_answer_defaults on public.scheduled_tryout_answers;
create trigger populate_scheduled_tryout_answer_defaults
before insert on public.scheduled_tryout_answers
for each row
execute function public.populate_scheduled_tryout_answer_defaults();

-- ============================================================================
-- 3. RLS Overhaul: Remove FOR ALL Policies & Use InitPlan Ownership Predicates
-- ============================================================================

-- 3a. scheduled_tryout_events
drop policy if exists "scheduled_tryout_events_select_published_or_manager" on public.scheduled_tryout_events;
drop policy if exists "scheduled_tryout_events_write_manager" on public.scheduled_tryout_events;
drop policy if exists "scheduled_tryout_events_insert_manager" on public.scheduled_tryout_events;
drop policy if exists "scheduled_tryout_events_update_manager" on public.scheduled_tryout_events;
drop policy if exists "scheduled_tryout_events_delete_manager" on public.scheduled_tryout_events;

create policy "scheduled_tryout_events_select_published_or_manager"
on public.scheduled_tryout_events
for select
using (
  editorial_status = 'published'
  or (select public.can_manage_scheduled_tryouts())
);

create policy "scheduled_tryout_events_insert_manager"
on public.scheduled_tryout_events
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_events_update_manager"
on public.scheduled_tryout_events
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_events_delete_manager"
on public.scheduled_tryout_events
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- 3b. scheduled_tryout_event_questions
drop policy if exists "scheduled_tryout_event_questions_select_published_or_manager" on public.scheduled_tryout_event_questions;
drop policy if exists "scheduled_tryout_event_questions_write_manager" on public.scheduled_tryout_event_questions;
drop policy if exists "scheduled_tryout_event_questions_insert_manager" on public.scheduled_tryout_event_questions;
drop policy if exists "scheduled_tryout_event_questions_update_manager" on public.scheduled_tryout_event_questions;
drop policy if exists "scheduled_tryout_event_questions_delete_manager" on public.scheduled_tryout_event_questions;

create policy "scheduled_tryout_event_questions_select_published_or_manager"
on public.scheduled_tryout_event_questions
for select
using (
  (select public.can_manage_scheduled_tryouts())
  or exists (
    select 1
    from public.scheduled_tryout_events
    where scheduled_tryout_events.id = scheduled_tryout_event_questions.event_id
      and scheduled_tryout_events.editorial_status = 'published'
  )
);

create policy "scheduled_tryout_event_questions_insert_manager"
on public.scheduled_tryout_event_questions
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_event_questions_update_manager"
on public.scheduled_tryout_event_questions
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_event_questions_delete_manager"
on public.scheduled_tryout_event_questions
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- 3c. scheduled_tryout_event_question_options
drop policy if exists "scheduled_tryout_event_question_options_select_published_or_manager" on public.scheduled_tryout_event_question_options;
drop policy if exists "scheduled_tryout_event_question_options_write_manager" on public.scheduled_tryout_event_question_options;
drop policy if exists "scheduled_tryout_event_question_options_insert_manager" on public.scheduled_tryout_event_question_options;
drop policy if exists "scheduled_tryout_event_question_options_update_manager" on public.scheduled_tryout_event_question_options;
drop policy if exists "scheduled_tryout_event_question_options_delete_manager" on public.scheduled_tryout_event_question_options;

create policy "scheduled_tryout_event_question_options_select_published_or_manager"
on public.scheduled_tryout_event_question_options
for select
using (
  (select public.can_manage_scheduled_tryouts())
  or exists (
    select 1
    from public.scheduled_tryout_event_questions
    join public.scheduled_tryout_events
      on scheduled_tryout_events.id = scheduled_tryout_event_questions.event_id
    where scheduled_tryout_event_questions.id = scheduled_tryout_event_question_options.event_question_id
      and scheduled_tryout_events.editorial_status = 'published'
  )
);

create policy "scheduled_tryout_event_question_options_insert_manager"
on public.scheduled_tryout_event_question_options
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_event_question_options_update_manager"
on public.scheduled_tryout_event_question_options
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_event_question_options_delete_manager"
on public.scheduled_tryout_event_question_options
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- 3d. scheduled_tryout_attempts
drop policy if exists "scheduled_tryout_attempts_select_own_or_manager" on public.scheduled_tryout_attempts;
drop policy if exists "scheduled_tryout_attempts_write_manager" on public.scheduled_tryout_attempts;
drop policy if exists "scheduled_tryout_attempts_insert_manager" on public.scheduled_tryout_attempts;
drop policy if exists "scheduled_tryout_attempts_update_manager" on public.scheduled_tryout_attempts;
drop policy if exists "scheduled_tryout_attempts_delete_manager" on public.scheduled_tryout_attempts;

create policy "scheduled_tryout_attempts_select_own_or_manager"
on public.scheduled_tryout_attempts
for select
using (
  user_id = (select auth.uid())
  or (select public.can_manage_scheduled_tryouts())
);

create policy "scheduled_tryout_attempts_insert_manager"
on public.scheduled_tryout_attempts
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_attempts_update_manager"
on public.scheduled_tryout_attempts
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_attempts_delete_manager"
on public.scheduled_tryout_attempts
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- 3e. scheduled_tryout_attempt_items (Direct InitPlan check — NO correlated EXISTS!)
drop policy if exists "scheduled_tryout_attempt_items_select_own_or_manager" on public.scheduled_tryout_attempt_items;
drop policy if exists "scheduled_tryout_attempt_items_write_manager" on public.scheduled_tryout_attempt_items;
drop policy if exists "scheduled_tryout_attempt_items_insert_manager" on public.scheduled_tryout_attempt_items;
drop policy if exists "scheduled_tryout_attempt_items_update_manager" on public.scheduled_tryout_attempt_items;
drop policy if exists "scheduled_tryout_attempt_items_delete_manager" on public.scheduled_tryout_attempt_items;

create policy "scheduled_tryout_attempt_items_select_own_or_manager"
on public.scheduled_tryout_attempt_items
for select
using (
  user_id = (select auth.uid())
  or (select public.can_manage_scheduled_tryouts())
);

create policy "scheduled_tryout_attempt_items_insert_manager"
on public.scheduled_tryout_attempt_items
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_attempt_items_update_manager"
on public.scheduled_tryout_attempt_items
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_attempt_items_delete_manager"
on public.scheduled_tryout_attempt_items
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- 3f. scheduled_tryout_answers (Direct InitPlan check — NO correlated EXISTS!)
drop policy if exists "scheduled_tryout_answers_select_own_or_manager" on public.scheduled_tryout_answers;
drop policy if exists "scheduled_tryout_answers_write_manager" on public.scheduled_tryout_answers;
drop policy if exists "scheduled_tryout_answers_insert_manager" on public.scheduled_tryout_answers;
drop policy if exists "scheduled_tryout_answers_update_manager" on public.scheduled_tryout_answers;
drop policy if exists "scheduled_tryout_answers_delete_manager" on public.scheduled_tryout_answers;

create policy "scheduled_tryout_answers_select_own_or_manager"
on public.scheduled_tryout_answers
for select
using (
  user_id = (select auth.uid())
  or (select public.can_manage_scheduled_tryouts())
);

create policy "scheduled_tryout_answers_insert_manager"
on public.scheduled_tryout_answers
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_answers_update_manager"
on public.scheduled_tryout_answers
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_answers_delete_manager"
on public.scheduled_tryout_answers
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- 3g. scheduled_tryout_attempt_results
drop policy if exists "scheduled_tryout_attempt_results_select_own_or_manager" on public.scheduled_tryout_attempt_results;
drop policy if exists "scheduled_tryout_attempt_results_write_manager" on public.scheduled_tryout_attempt_results;
drop policy if exists "scheduled_tryout_attempt_results_insert_manager" on public.scheduled_tryout_attempt_results;
drop policy if exists "scheduled_tryout_attempt_results_update_manager" on public.scheduled_tryout_attempt_results;
drop policy if exists "scheduled_tryout_attempt_results_delete_manager" on public.scheduled_tryout_attempt_results;

create policy "scheduled_tryout_attempt_results_select_own_or_manager"
on public.scheduled_tryout_attempt_results
for select
using (
  user_id = (select auth.uid())
  or (select public.can_manage_scheduled_tryouts())
);

create policy "scheduled_tryout_attempt_results_insert_manager"
on public.scheduled_tryout_attempt_results
for insert
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_attempt_results_update_manager"
on public.scheduled_tryout_attempt_results
for update
using ((select public.can_manage_scheduled_tryouts()))
with check ((select public.can_manage_scheduled_tryouts()));

create policy "scheduled_tryout_attempt_results_delete_manager"
on public.scheduled_tryout_attempt_results
for delete
using ((select public.can_manage_scheduled_tryouts()));

-- ============================================================================
-- 4. Composite & Foreign-Key Indexes + Planner Statistics Refresh
-- ============================================================================

create index if not exists scheduled_tryout_attempts_user_status_started_idx
  on public.scheduled_tryout_attempts (user_id, status, started_at desc);

create index if not exists scheduled_tryout_attempts_user_status_submitted_idx
  on public.scheduled_tryout_attempts (user_id, status, submitted_at desc);

create index if not exists scheduled_tryout_attempts_event_cycle_user_status_idx
  on public.scheduled_tryout_attempts (event_id, event_cycle, user_id, status);

create index if not exists scheduled_tryout_attempts_event_cycle_status_idx
  on public.scheduled_tryout_attempts (event_id, event_cycle, status);

drop index if exists public.scheduled_tryout_attempt_items_attempt_idx;

create index if not exists scheduled_tryout_attempt_items_attempt_event_question_idx
  on public.scheduled_tryout_attempt_items (attempt_id, event_question_id);

create index if not exists scheduled_tryout_attempt_items_user_attempt_idx
  on public.scheduled_tryout_attempt_items (user_id, attempt_id);

create index if not exists scheduled_tryout_attempt_items_block_idx
  on public.scheduled_tryout_attempt_items (block_id_snapshot)
  where block_id_snapshot is not null;

create index if not exists scheduled_tryout_attempt_items_topic_idx
  on public.scheduled_tryout_attempt_items (topic_id_snapshot)
  where topic_id_snapshot is not null;

drop index if exists public.scheduled_tryout_answers_attempt_idx;

create index if not exists scheduled_tryout_answers_attempt_answered_at_idx
  on public.scheduled_tryout_answers (attempt_id, answered_at);

create index if not exists scheduled_tryout_answers_user_attempt_idx
  on public.scheduled_tryout_answers (user_id, attempt_id);

create index if not exists scheduled_tryout_answers_attempt_non_null_idx
  on public.scheduled_tryout_answers (attempt_id)
  where selected_option_key is not null;

-- ============================================================================
-- 5. Hardened RPCs (Watermark-gated sync, single-pass start, zero-sync resume/submit)
-- ============================================================================

create or replace function public.sync_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  event_row public.scheduled_tryout_events%rowtype;
  synced_attempt public.scheduled_tryout_attempts%rowtype;
  question_count integer;
  needs_rerank boolean;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyinkronkan try out terjadwal.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status in ('submitted', 'abandoned') then
    return target_attempt;
  end if;

  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_attempt.event_id;

  -- Fast-path O(1) short-circuit when questions have not changed since last sync
  if target_attempt.synced_questions_at is not distinct from event_row.questions_updated_at
     and exists (
       select 1
       from public.scheduled_tryout_attempt_items
       where attempt_id = target_attempt.id
     ) then
    return target_attempt;
  end if;

  delete from public.scheduled_tryout_attempt_items
  where id in (
    select attempt_item.id
    from public.scheduled_tryout_attempt_items as attempt_item
    left join public.scheduled_tryout_answers as existing_answer
      on existing_answer.attempt_item_id = attempt_item.id
    where attempt_item.attempt_id = target_attempt.id
      and attempt_item.event_question_id is null
      and attempt_item.opened_at is null
      and existing_answer.id is null
  );

  with current_event_questions as (
    select
      event_question.id,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      coalesce(block.name, 'Tanpa blok') as block_name,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',
            option.option_key,
            'text',
            option.option_text
          )
          order by option.sort_order
        ) filter (where option.id is not null),
        '[]'::jsonb
      ) as options_snapshot
    from public.scheduled_tryout_event_questions as event_question
    left join public.blocks as block
      on block.id = event_question.block_id
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = target_attempt.event_id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      block.name,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path
  )
  update public.scheduled_tryout_attempt_items as attempt_item
  set
    question_snapshot = current_question.stem,
    options_snapshot = current_question.options_snapshot,
    correct_option_key_snapshot = current_question.correct_option_key,
    block_id_snapshot = current_question.block_id,
    block_name_snapshot = current_question.block_name,
    topic_id_snapshot = current_question.topic_id,
    question_image_path_snapshot = current_question.question_image_path,
    explanation_text_snapshot = current_question.explanation_text,
    explanation_image_path_snapshot = current_question.explanation_image_path
  from current_event_questions as current_question
  where attempt_item.attempt_id = target_attempt.id
    and attempt_item.event_question_id = current_question.id
    and (
      attempt_item.question_snapshot is distinct from current_question.stem
      or attempt_item.options_snapshot is distinct from current_question.options_snapshot
      or attempt_item.correct_option_key_snapshot is distinct from current_question.correct_option_key
      or attempt_item.block_id_snapshot is distinct from current_question.block_id
      or attempt_item.block_name_snapshot is distinct from current_question.block_name
      or attempt_item.topic_id_snapshot is distinct from current_question.topic_id
      or attempt_item.question_image_path_snapshot is distinct from current_question.question_image_path
      or attempt_item.explanation_text_snapshot is distinct from current_question.explanation_text
      or attempt_item.explanation_image_path_snapshot is distinct from current_question.explanation_image_path
    );

  insert into public.scheduled_tryout_attempt_items (
    attempt_id,
    user_id,
    event_question_id,
    sort_order,
    question_snapshot,
    options_snapshot,
    correct_option_key_snapshot,
    block_id_snapshot,
    block_name_snapshot,
    topic_id_snapshot,
    question_image_path_snapshot,
    explanation_text_snapshot,
    explanation_image_path_snapshot
  )
  with current_event_questions as (
    select
      event_question.id,
      row_number() over (
        order by event_question.question_order, event_question.id
      ) as insert_rank,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      coalesce(block.name, 'Tanpa blok') as block_name,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',
            option.option_key,
            'text',
            option.option_text
          )
          order by option.sort_order
        ) filter (where option.id is not null),
        '[]'::jsonb
      ) as options_snapshot
    from public.scheduled_tryout_event_questions as event_question
    left join public.blocks as block
      on block.id = event_question.block_id
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = target_attempt.event_id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      block.name,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path
  ),
  current_sort_baseline as (
    select coalesce(max(sort_order), 0) as max_sort_order
    from public.scheduled_tryout_attempt_items
    where attempt_id = target_attempt.id
  )
  select
    target_attempt.id,
    target_attempt.user_id,
    current_question.id,
    current_sort_baseline.max_sort_order + current_question.insert_rank,
    current_question.stem,
    current_question.options_snapshot,
    current_question.correct_option_key,
    current_question.block_id,
    current_question.block_name,
    current_question.topic_id,
    current_question.question_image_path,
    current_question.explanation_text,
    current_question.explanation_image_path
  from current_event_questions as current_question
  cross join current_sort_baseline
  where not exists (
    select 1
    from public.scheduled_tryout_attempt_items as attempt_item
    where attempt_item.attempt_id = target_attempt.id
      and attempt_item.event_question_id = current_question.id
  );

  select exists (
    select 1
    from (
      select
        attempt_item.sort_order,
        row_number() over (
          order by coalesce(event_question.question_order, attempt_item.sort_order), attempt_item.created_at, attempt_item.id
        ) as desired_sort_order
      from public.scheduled_tryout_attempt_items as attempt_item
      left join public.scheduled_tryout_event_questions as event_question
        on event_question.id = attempt_item.event_question_id
      where attempt_item.attempt_id = target_attempt.id
    ) as check_order
    where check_order.sort_order is distinct from check_order.desired_sort_order
  )
  into needs_rerank;

  if needs_rerank then
    with rerank_shift as (
      select
        attempt_item.id,
        baseline.max_sort_order
        + row_number() over (
          order by coalesce(event_question.question_order, attempt_item.sort_order), attempt_item.created_at, attempt_item.id
        ) as temp_sort_order
      from public.scheduled_tryout_attempt_items as attempt_item
      cross join (
        select coalesce(max(sort_order), 0) as max_sort_order
        from public.scheduled_tryout_attempt_items
        where attempt_id = target_attempt.id
      ) as baseline
      left join public.scheduled_tryout_event_questions as event_question
        on event_question.id = attempt_item.event_question_id
      where attempt_item.attempt_id = target_attempt.id
    )
    update public.scheduled_tryout_attempt_items as attempt_item
    set sort_order = rerank_shift.temp_sort_order
    from rerank_shift
    where attempt_item.id = rerank_shift.id;

    with ranked_attempt_items as (
      select
        attempt_item.id,
        row_number() over (
          order by coalesce(event_question.question_order, attempt_item.sort_order), attempt_item.created_at, attempt_item.id
        ) as next_sort_order
      from public.scheduled_tryout_attempt_items as attempt_item
      left join public.scheduled_tryout_event_questions as event_question
        on event_question.id = attempt_item.event_question_id
      where attempt_item.attempt_id = target_attempt.id
    )
    update public.scheduled_tryout_attempt_items as attempt_item
    set sort_order = ranked_attempt_item.next_sort_order
    from ranked_attempt_items as ranked_attempt_item
    where attempt_item.id = ranked_attempt_item.id;
  end if;

  select count(*)::integer
  into question_count
  from public.scheduled_tryout_attempt_items
  where attempt_id = target_attempt.id;

  update public.scheduled_tryout_attempts
  set
    total_questions = question_count,
    time_limit_seconds = greatest(0, coalesce(event_row.duration_minutes, question_count)) * 60,
    synced_questions_at = event_row.questions_updated_at
  where id = target_attempt.id
  returning *
  into synced_attempt;

  return synced_attempt;
end;
$$;

revoke all on function public.sync_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.sync_scheduled_tryout_attempt(uuid) to authenticated, service_role;

create or replace function public.pause_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  pause_time timestamptz := timezone('utc', now());
  next_elapsed_seconds integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menjeda try out terjadwal.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'in_progress' then
    return target_attempt;
  end if;

  next_elapsed_seconds := greatest(
    0,
    least(
      target_attempt.time_limit_seconds,
      target_attempt.elapsed_seconds
      + case
          when target_attempt.last_resumed_at is null then 0
          else greatest(
            0,
            extract(epoch from (pause_time - target_attempt.last_resumed_at))::integer
          )
        end
    )
  );

  update public.scheduled_tryout_attempts
  set
    status = 'paused',
    elapsed_seconds = next_elapsed_seconds,
    last_resumed_at = null,
    paused_at = pause_time
  where id = target_attempt.id
  returning *
  into target_attempt;

  return target_attempt;
end;
$$;

revoke all on function public.pause_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.pause_scheduled_tryout_attempt(uuid) to authenticated, service_role;

create or replace function public.resume_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  resume_time timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum melanjutkan try out terjadwal.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'paused' then
    return target_attempt;
  end if;

  update public.scheduled_tryout_attempts
  set
    status = 'in_progress',
    last_resumed_at = resume_time,
    paused_at = null
  where id = target_attempt.id
  returning *
  into target_attempt;

  return target_attempt;
end;
$$;

revoke all on function public.resume_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.resume_scheduled_tryout_attempt(uuid) to authenticated, service_role;

create or replace function public.submit_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempt_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  result_row public.scheduled_tryout_attempt_results%rowtype;
  submission_time timestamptz := timezone('utc', now());
  time_used_seconds_value integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum mengirim hasil try out terjadwal.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  time_used_seconds_value := greatest(
    0,
    least(
      target_attempt.time_limit_seconds,
      target_attempt.elapsed_seconds
      + case
          when target_attempt.status = 'in_progress' and target_attempt.last_resumed_at is not null
            then greatest(
              0,
              extract(epoch from (submission_time - target_attempt.last_resumed_at))::integer
            )
          else 0
        end
    )
  );

  if target_attempt.status <> 'submitted' then
    update public.scheduled_tryout_attempts
    set
      status = 'submitted',
      submitted_at = submission_time,
      elapsed_seconds = time_used_seconds_value,
      last_resumed_at = null,
      paused_at = null
    where id = target_attempt.id
    returning *
    into target_attempt;
  end if;

  insert into public.scheduled_tryout_attempt_results (
    attempt_id,
    event_id,
    event_cycle,
    user_id,
    submitted_at,
    question_count,
    correct_count,
    wrong_count,
    unanswered_count,
    score_percentage
  )
  select
    target_attempt.id,
    target_attempt.event_id,
    target_attempt.event_cycle,
    target_attempt.user_id,
    target_attempt.submitted_at,
    totals.question_count,
    totals.correct_count,
    totals.wrong_count,
    totals.unanswered_count,
    case
      when totals.question_count = 0 then 0
      else round((totals.correct_count::numeric / totals.question_count::numeric) * 100, 2)
    end
  from (
    select
      count(*)::integer as question_count,
      count(*) filter (
        where answer.selected_option_key = item.correct_option_key_snapshot
      )::integer as correct_count,
      count(*) filter (
        where answer.selected_option_key is not null
          and answer.selected_option_key <> item.correct_option_key_snapshot
      )::integer as wrong_count,
      count(*) filter (where answer.selected_option_key is null)::integer as unanswered_count
    from public.scheduled_tryout_attempt_items as item
    left join public.scheduled_tryout_answers as answer
      on answer.attempt_item_id = item.id
    where item.attempt_id = target_attempt.id
  ) as totals
  on conflict (attempt_id) do update
  set
    event_id = excluded.event_id,
    event_cycle = excluded.event_cycle,
    user_id = excluded.user_id,
    submitted_at = excluded.submitted_at,
    question_count = excluded.question_count,
    correct_count = excluded.correct_count,
    wrong_count = excluded.wrong_count,
    unanswered_count = excluded.unanswered_count,
    score_percentage = excluded.score_percentage,
    updated_at = timezone('utc', now())
  returning *
  into result_row;

  return result_row;
end;
$$;

revoke all on function public.submit_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.submit_scheduled_tryout_attempt(uuid) to authenticated, service_role;

create or replace function public.save_scheduled_tryout_answer(
  target_attempt_id uuid,
  target_attempt_item_id uuid,
  selected_option_key text,
  is_doubtful boolean default false
)
returns public.scheduled_tryout_answers
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  target_item public.scheduled_tryout_attempt_items%rowtype;
  answer_row public.scheduled_tryout_answers%rowtype;
  answer_time timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyimpan jawaban.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for share;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'in_progress' then
    raise exception 'Attempt try out terjadwal hanya bisa dijawab saat sesi sedang berjalan.'
      using errcode = 'P0001';
  end if;

  select *
  into target_item
  from public.scheduled_tryout_attempt_items
  where id = target_attempt_item_id
    and attempt_id = target_attempt.id;

  if not found then
    raise exception 'Item soal try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  update public.scheduled_tryout_attempt_items
  set opened_at = answer_time
  where id = target_item.id
    and opened_at is null;

  insert into public.scheduled_tryout_answers (
    attempt_id,
    user_id,
    attempt_item_id,
    selected_option_key,
    is_doubtful,
    answered_at
  )
  values (
    target_attempt.id,
    target_attempt.user_id,
    target_item.id,
    selected_option_key,
    coalesce(is_doubtful, false),
    case
      when selected_option_key is null then null
      else answer_time
    end
  )
  on conflict (attempt_item_id) do update
  set
    user_id = excluded.user_id,
    selected_option_key = excluded.selected_option_key,
    is_doubtful = excluded.is_doubtful,
    answered_at = case
      when excluded.selected_option_key is null then null
      else answer_time
    end,
    updated_at = answer_time
  returning *
  into answer_row;

  return answer_row;
end;
$$;

revoke all on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) to authenticated, service_role;

create or replace function public.start_scheduled_tryout_attempt(
  target_event_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = ''
as $body$
declare
  event_row public.scheduled_tryout_events%rowtype;
  active_attempt public.scheduled_tryout_attempts%rowtype;
  created_attempt public.scheduled_tryout_attempts%rowtype;
  submitted_attempt_count integer;
  inserted_question_count integer;
  now_utc timestamptz := timezone('utc', now());
  active_elapsed_seconds integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum memulai try out terjadwal.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('pro', 'mentor', 'osce_pro', 'admin')
  ) then
    raise exception 'Akses mulai try out terjadwal hanya tersedia untuk pengguna pro, osce_pro, mentor, atau admin.'
      using errcode = '42501';
  end if;

  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_event_id
    and editorial_status = 'published'
    and access_start_at <= now_utc
    and access_end_at > now_utc;

  if not found then
    raise exception 'Event try out terjadwal tidak aktif atau belum dipublikasikan.'
      using errcode = 'P0002';
  end if;

  select *
  into active_attempt
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status in ('in_progress', 'paused')
  order by created_at desc, id desc
  limit 1
  for update;

  if found then
    active_elapsed_seconds := active_attempt.elapsed_seconds + case
      when active_attempt.status = 'in_progress' and active_attempt.last_resumed_at is not null
        then greatest(0, extract(epoch from (now_utc - active_attempt.last_resumed_at))::integer)
      else 0
    end;

    -- Auto-finalize expired active attempts so students do not bounce in a 00:00:00 loop
    if active_attempt.time_limit_seconds > 0 and active_elapsed_seconds >= active_attempt.time_limit_seconds then
      perform public.submit_scheduled_tryout_attempt(active_attempt.id);
    else
      perform public.sync_scheduled_tryout_attempt(active_attempt.id);

      select *
      into active_attempt
      from public.scheduled_tryout_attempts
      where id = active_attempt.id;

      return active_attempt;
    end if;
  end if;

  select count(*)
  into submitted_attempt_count
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status = 'submitted';

  if submitted_attempt_count >= coalesce(event_row.max_attempts, 8) then
    raise exception 'Batas attempt untuk event try out terjadwal ini sudah habis.'
      using errcode = 'P0001';
  end if;

  begin
    insert into public.scheduled_tryout_attempts (
      event_id,
      event_cycle,
      user_id,
      status,
      started_at,
      time_limit_seconds,
      elapsed_seconds,
      last_resumed_at,
      paused_at,
      total_questions,
      synced_questions_at
    )
    values (
      event_row.id,
      event_row.current_cycle,
      auth.uid(),
      'in_progress',
      now_utc,
      greatest(0, coalesce(event_row.duration_minutes, event_row.total_questions, 100)) * 60,
      0,
      now_utc,
      null,
      0,
      event_row.questions_updated_at
    )
    returning *
    into created_attempt;
  exception
    when unique_violation then
      select *
      into active_attempt
      from public.scheduled_tryout_attempts
      where event_id = event_row.id
        and event_cycle = event_row.current_cycle
        and user_id = auth.uid()
        and status in ('in_progress', 'paused')
      order by created_at desc, id desc
      limit 1;

      if found then
        perform public.sync_scheduled_tryout_attempt(active_attempt.id);

        select *
        into active_attempt
        from public.scheduled_tryout_attempts
        where id = active_attempt.id;

        return active_attempt;
      end if;

      raise;
  end;

  -- Single-pass INSERT of all event questions with exact sort_order (zero non-HOT UPDATE passes!)
  insert into public.scheduled_tryout_attempt_items (
    attempt_id,
    user_id,
    event_question_id,
    sort_order,
    question_snapshot,
    options_snapshot,
    correct_option_key_snapshot,
    block_id_snapshot,
    block_name_snapshot,
    topic_id_snapshot,
    question_image_path_snapshot,
    explanation_text_snapshot,
    explanation_image_path_snapshot
  )
  select
    created_attempt.id,
    created_attempt.user_id,
    q.id,
    row_number() over (order by q.question_order, q.id),
    q.stem,
    q.options_snapshot,
    q.correct_option_key,
    q.block_id,
    q.block_name,
    q.topic_id,
    q.question_image_path,
    q.explanation_text,
    q.explanation_image_path
  from (
    select
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      coalesce(block.name, 'Tanpa blok') as block_name,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',
            option.option_key,
            'text',
            option.option_text
          )
          order by option.sort_order
        ) filter (where option.id is not null),
        '[]'::jsonb
      ) as options_snapshot
    from public.scheduled_tryout_event_questions as event_question
    left join public.blocks as block
      on block.id = event_question.block_id
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = event_row.id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      block.name,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path
  ) as q
  order by q.question_order, q.id;

  get diagnostics inserted_question_count = row_count;

  update public.scheduled_tryout_attempts
  set
    total_questions = inserted_question_count,
    time_limit_seconds = greatest(0, coalesce(event_row.duration_minutes, inserted_question_count)) * 60,
    synced_questions_at = event_row.questions_updated_at
  where id = created_attempt.id
  returning *
  into created_attempt;

  return created_attempt;
end;
$body$;

revoke all on function public.start_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to authenticated, service_role;

create or replace function public.reactivate_scheduled_tryout_event(
  target_event_id uuid,
  next_access_start_at timestamptz,
  next_access_end_at timestamptz
)
returns public.scheduled_tryout_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.scheduled_tryout_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum mengaktifkan ulang event try out terjadwal.'
      using errcode = '42501';
  end if;

  if not public.can_manage_scheduled_tryouts() then
    raise exception 'Anda tidak memiliki akses untuk mengaktifkan ulang event try out terjadwal.'
      using errcode = '42501';
  end if;

  if next_access_end_at <= next_access_start_at then
    raise exception 'Jadwal akses event berikutnya tidak valid.'
      using errcode = 'P0001';
  end if;

  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_event_id
  for update;

  if not found then
    raise exception 'Event try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if event_row.access_end_at > timezone('utc', now()) then
    raise exception 'Event try out terjadwal ini masih aktif dan belum bisa diaktifkan ulang.'
      using errcode = 'P0001';
  end if;

  -- Close any unsubmitted attempts from prior cycles without deleting submitted review history
  update public.scheduled_tryout_attempts
  set
    status = 'abandoned',
    last_resumed_at = null,
    paused_at = null
  where event_id = event_row.id
    and status in ('in_progress', 'paused');

  update public.scheduled_tryout_events
  set
    editorial_status = 'published',
    access_start_at = next_access_start_at,
    access_end_at = next_access_end_at,
    current_cycle = current_cycle + 1,
    updated_by = auth.uid()
  where id = event_row.id
  returning *
  into event_row;

  return event_row;
end;
$$;

revoke all on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- Refresh table planner statistics after backfill and new indexes
analyze public.scheduled_tryout_events;
analyze public.scheduled_tryout_attempts;
analyze public.scheduled_tryout_attempt_items;
analyze public.scheduled_tryout_answers;
analyze public.scheduled_tryout_attempt_results;
