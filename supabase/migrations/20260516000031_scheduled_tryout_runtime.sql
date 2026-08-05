create or replace function public.can_manage_scheduled_tryouts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'mentor')
  );
$$;

revoke all on function public.can_manage_scheduled_tryouts() from public;
grant execute on function public.can_manage_scheduled_tryouts() to authenticated;
grant execute on function public.can_manage_scheduled_tryouts() to service_role;

create table if not exists public.scheduled_tryout_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  editorial_status text not null default 'draft',
  access_start_at timestamptz not null,
  access_end_at timestamptz not null,
  current_cycle integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scheduled_tryout_events_editorial_status_check check (
    editorial_status in ('draft', 'published')
  ),
  constraint scheduled_tryout_events_access_window_check check (
    access_end_at > access_start_at
  ),
  constraint scheduled_tryout_events_cycle_check check (
    current_cycle >= 1
  )
);

drop trigger if exists set_scheduled_tryout_events_updated_at on public.scheduled_tryout_events;
create trigger set_scheduled_tryout_events_updated_at
before update on public.scheduled_tryout_events
for each row
execute function public.set_updated_at();

create table if not exists public.scheduled_tryout_event_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.scheduled_tryout_events (id) on delete cascade,
  question_order integer not null,
  stem text not null,
  question_image_path text,
  block_id uuid references public.blocks (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  correct_option_key text not null,
  explanation_text text,
  explanation_image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scheduled_tryout_event_questions_question_order_check check (
    question_order >= 1
  )
);

create unique index if not exists scheduled_tryout_event_questions_event_order_idx
  on public.scheduled_tryout_event_questions (event_id, question_order);

create index if not exists scheduled_tryout_event_questions_event_id_idx
  on public.scheduled_tryout_event_questions (event_id);

drop trigger if exists set_scheduled_tryout_event_questions_updated_at on public.scheduled_tryout_event_questions;
create trigger set_scheduled_tryout_event_questions_updated_at
before update on public.scheduled_tryout_event_questions
for each row
execute function public.set_updated_at();

create table if not exists public.scheduled_tryout_event_question_options (
  id uuid primary key default gen_random_uuid(),
  event_question_id uuid not null references public.scheduled_tryout_event_questions (id) on delete cascade,
  option_key text not null,
  option_text text not null,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint scheduled_tryout_event_question_options_sort_order_check check (
    sort_order >= 1
  )
);

create unique index if not exists scheduled_tryout_event_question_options_question_key_idx
  on public.scheduled_tryout_event_question_options (event_question_id, option_key);

create unique index if not exists scheduled_tryout_event_question_options_question_sort_idx
  on public.scheduled_tryout_event_question_options (event_question_id, sort_order);

create table if not exists public.scheduled_tryout_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.scheduled_tryout_events (id) on delete cascade,
  event_cycle integer not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('in_progress', 'paused', 'submitted', 'abandoned')),
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  time_limit_seconds integer not null,
  elapsed_seconds integer not null default 0,
  last_resumed_at timestamptz,
  paused_at timestamptz,
  total_questions integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scheduled_tryout_attempts_event_cycle_check check (
    event_cycle >= 1
  ),
  constraint scheduled_tryout_attempts_time_limit_check check (
    time_limit_seconds >= 0
  ),
  constraint scheduled_tryout_attempts_elapsed_seconds_check check (
    elapsed_seconds >= 0
  ),
  constraint scheduled_tryout_attempts_total_questions_check check (
    total_questions >= 0
  ),
  constraint scheduled_tryout_attempts_submitted_check check (
    (status = 'submitted' and submitted_at is not null)
    or (status <> 'submitted')
  )
);

create index if not exists scheduled_tryout_attempts_event_id_idx
  on public.scheduled_tryout_attempts (event_id);

create index if not exists scheduled_tryout_attempts_event_cycle_idx
  on public.scheduled_tryout_attempts (event_cycle);

create index if not exists scheduled_tryout_attempts_user_id_idx
  on public.scheduled_tryout_attempts (user_id);

create index if not exists scheduled_tryout_attempts_submitted_at_idx
  on public.scheduled_tryout_attempts (submitted_at desc nulls last);

create unique index if not exists scheduled_tryout_attempts_one_active_per_cycle_idx
  on public.scheduled_tryout_attempts (event_id, event_cycle, user_id)
  where status in ('in_progress', 'paused');

drop trigger if exists set_scheduled_tryout_attempts_updated_at on public.scheduled_tryout_attempts;
create trigger set_scheduled_tryout_attempts_updated_at
before update on public.scheduled_tryout_attempts
for each row
execute function public.set_updated_at();

create table if not exists public.scheduled_tryout_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.scheduled_tryout_attempts (id) on delete cascade,
  event_question_id uuid references public.scheduled_tryout_event_questions (id) on delete set null,
  sort_order integer not null,
  opened_at timestamptz,
  question_snapshot text not null,
  options_snapshot jsonb not null default '[]'::jsonb,
  correct_option_key_snapshot text not null,
  block_id_snapshot uuid references public.blocks (id) on delete set null,
  topic_id_snapshot uuid references public.topics (id) on delete set null,
  question_image_path_snapshot text,
  explanation_text_snapshot text,
  explanation_image_path_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scheduled_tryout_attempt_items_sort_order_check check (
    sort_order >= 1
  )
);

create unique index if not exists scheduled_tryout_attempt_items_attempt_order_idx
  on public.scheduled_tryout_attempt_items (attempt_id, sort_order);

create index if not exists scheduled_tryout_attempt_items_attempt_idx
  on public.scheduled_tryout_attempt_items (attempt_id);

drop trigger if exists set_scheduled_tryout_attempt_items_updated_at on public.scheduled_tryout_attempt_items;
create trigger set_scheduled_tryout_attempt_items_updated_at
before update on public.scheduled_tryout_attempt_items
for each row
execute function public.set_updated_at();

create table if not exists public.scheduled_tryout_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.scheduled_tryout_attempts (id) on delete cascade,
  attempt_item_id uuid not null unique references public.scheduled_tryout_attempt_items (id) on delete cascade,
  selected_option_key text,
  is_doubtful boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists scheduled_tryout_answers_attempt_idx
  on public.scheduled_tryout_answers (attempt_id);

drop trigger if exists set_scheduled_tryout_answers_updated_at on public.scheduled_tryout_answers;
create trigger set_scheduled_tryout_answers_updated_at
before update on public.scheduled_tryout_answers
for each row
execute function public.set_updated_at();

create table if not exists public.scheduled_tryout_attempt_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.scheduled_tryout_attempts (id) on delete cascade,
  event_id uuid not null references public.scheduled_tryout_events (id) on delete cascade,
  event_cycle integer not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null,
  question_count integer not null,
  correct_count integer not null,
  wrong_count integer not null,
  unanswered_count integer not null,
  score_percentage numeric(5,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scheduled_tryout_attempt_results_event_cycle_check check (
    event_cycle >= 1
  )
);

create index if not exists scheduled_tryout_attempt_results_event_id_idx
  on public.scheduled_tryout_attempt_results (event_id);

create index if not exists scheduled_tryout_attempt_results_event_cycle_idx
  on public.scheduled_tryout_attempt_results (event_cycle);

create index if not exists scheduled_tryout_attempt_results_user_id_idx
  on public.scheduled_tryout_attempt_results (user_id);

create index if not exists scheduled_tryout_attempt_results_submitted_at_idx
  on public.scheduled_tryout_attempt_results (submitted_at desc);

drop trigger if exists set_scheduled_tryout_attempt_results_updated_at on public.scheduled_tryout_attempt_results;
create trigger set_scheduled_tryout_attempt_results_updated_at
before update on public.scheduled_tryout_attempt_results
for each row
execute function public.set_updated_at();

alter table public.scheduled_tryout_events enable row level security;
alter table public.scheduled_tryout_event_questions enable row level security;
alter table public.scheduled_tryout_event_question_options enable row level security;
alter table public.scheduled_tryout_attempts enable row level security;
alter table public.scheduled_tryout_attempt_items enable row level security;
alter table public.scheduled_tryout_answers enable row level security;
alter table public.scheduled_tryout_attempt_results enable row level security;

drop policy if exists "scheduled_tryout_events_select_published_or_manager" on public.scheduled_tryout_events;
create policy "scheduled_tryout_events_select_published_or_manager"
on public.scheduled_tryout_events
for select
using (
  editorial_status = 'published'
  or public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_events_write_manager" on public.scheduled_tryout_events;
create policy "scheduled_tryout_events_write_manager"
on public.scheduled_tryout_events
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_event_questions_select_published_or_manager" on public.scheduled_tryout_event_questions;
create policy "scheduled_tryout_event_questions_select_published_or_manager"
on public.scheduled_tryout_event_questions
for select
using (
  exists (
    select 1
    from public.scheduled_tryout_events
    where scheduled_tryout_events.id = scheduled_tryout_event_questions.event_id
      and (
        scheduled_tryout_events.editorial_status = 'published'
        or public.can_manage_scheduled_tryouts()
      )
  )
);

drop policy if exists "scheduled_tryout_event_questions_write_manager" on public.scheduled_tryout_event_questions;
create policy "scheduled_tryout_event_questions_write_manager"
on public.scheduled_tryout_event_questions
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_event_question_options_select_published_or_manager" on public.scheduled_tryout_event_question_options;
create policy "scheduled_tryout_event_question_options_select_published_or_manager"
on public.scheduled_tryout_event_question_options
for select
using (
  exists (
    select 1
    from public.scheduled_tryout_event_questions
    join public.scheduled_tryout_events
      on scheduled_tryout_events.id = scheduled_tryout_event_questions.event_id
    where scheduled_tryout_event_questions.id = scheduled_tryout_event_question_options.event_question_id
      and (
        scheduled_tryout_events.editorial_status = 'published'
        or public.can_manage_scheduled_tryouts()
      )
  )
);

drop policy if exists "scheduled_tryout_event_question_options_write_manager" on public.scheduled_tryout_event_question_options;
create policy "scheduled_tryout_event_question_options_write_manager"
on public.scheduled_tryout_event_question_options
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_attempts_select_own_or_manager" on public.scheduled_tryout_attempts;
create policy "scheduled_tryout_attempts_select_own_or_manager"
on public.scheduled_tryout_attempts
for select
using (
  user_id = auth.uid()
  or public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_attempts_write_manager" on public.scheduled_tryout_attempts;
create policy "scheduled_tryout_attempts_write_manager"
on public.scheduled_tryout_attempts
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_attempt_items_select_own_or_manager" on public.scheduled_tryout_attempt_items;
create policy "scheduled_tryout_attempt_items_select_own_or_manager"
on public.scheduled_tryout_attempt_items
for select
using (
  exists (
    select 1
    from public.scheduled_tryout_attempts
    where scheduled_tryout_attempts.id = scheduled_tryout_attempt_items.attempt_id
      and (
        scheduled_tryout_attempts.user_id = auth.uid()
        or public.can_manage_scheduled_tryouts()
      )
  )
);

drop policy if exists "scheduled_tryout_attempt_items_write_manager" on public.scheduled_tryout_attempt_items;
create policy "scheduled_tryout_attempt_items_write_manager"
on public.scheduled_tryout_attempt_items
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_answers_select_own_or_manager" on public.scheduled_tryout_answers;
create policy "scheduled_tryout_answers_select_own_or_manager"
on public.scheduled_tryout_answers
for select
using (
  exists (
    select 1
    from public.scheduled_tryout_attempts
    where scheduled_tryout_attempts.id = scheduled_tryout_answers.attempt_id
      and (
        scheduled_tryout_attempts.user_id = auth.uid()
        or public.can_manage_scheduled_tryouts()
      )
  )
);

drop policy if exists "scheduled_tryout_answers_write_manager" on public.scheduled_tryout_answers;
create policy "scheduled_tryout_answers_write_manager"
on public.scheduled_tryout_answers
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_attempt_results_select_own_or_manager" on public.scheduled_tryout_attempt_results;
create policy "scheduled_tryout_attempt_results_select_own_or_manager"
on public.scheduled_tryout_attempt_results
for select
using (
  user_id = auth.uid()
  or public.can_manage_scheduled_tryouts()
);

drop policy if exists "scheduled_tryout_attempt_results_write_manager" on public.scheduled_tryout_attempt_results;
create policy "scheduled_tryout_attempt_results_write_manager"
on public.scheduled_tryout_attempt_results
for all
using (
  public.can_manage_scheduled_tryouts()
)
with check (
  public.can_manage_scheduled_tryouts()
);

create or replace function public.list_scheduled_tryout_catalog_entries()
returns table (
  event_id uuid,
  title text,
  description text,
  access_start_at timestamptz,
  access_end_at timestamptz,
  current_cycle integer,
  total_questions integer,
  duration_minutes integer,
  remaining_attempts integer,
  has_active_attempt boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  raise exception 'Scheduled tryout catalog RPC shell is not implemented in Task 1.';
end;
$$;

revoke all on function public.list_scheduled_tryout_catalog_entries() from public;
grant execute on function public.list_scheduled_tryout_catalog_entries() to authenticated;
grant execute on function public.list_scheduled_tryout_catalog_entries() to service_role;

create or replace function public.sync_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  synced_attempt public.scheduled_tryout_attempts%rowtype;
  question_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyinkronkan try out terjadwal.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
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
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = target_attempt.event_id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path
  )
  update public.scheduled_tryout_attempt_items as attempt_item
  set
    event_question_id = current_question.id,
    question_snapshot = current_question.stem,
    options_snapshot = current_question.options_snapshot,
    correct_option_key_snapshot = current_question.correct_option_key,
    block_id_snapshot = current_question.block_id,
    topic_id_snapshot = current_question.topic_id,
    question_image_path_snapshot = current_question.question_image_path,
    explanation_text_snapshot = current_question.explanation_text,
    explanation_image_path_snapshot = current_question.explanation_image_path
  from current_event_questions as current_question
  where attempt_item.attempt_id = target_attempt.id
    and attempt_item.event_question_id = current_question.id;

  insert into public.scheduled_tryout_attempt_items (
    attempt_id,
    event_question_id,
    sort_order,
    question_snapshot,
    options_snapshot,
    correct_option_key_snapshot,
    block_id_snapshot,
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
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = target_attempt.event_id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
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
    current_question.id,
    current_sort_baseline.max_sort_order + current_question.insert_rank,
    current_question.stem,
    current_question.options_snapshot,
    current_question.correct_option_key,
    current_question.block_id,
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

  select count(*)::integer
  into question_count
  from public.scheduled_tryout_attempt_items
  where attempt_id = target_attempt.id;

  update public.scheduled_tryout_attempts
  set
    total_questions = question_count,
    time_limit_seconds = question_count * 60
  where id = target_attempt.id
  returning *
  into synced_attempt;

  return synced_attempt;
end;
$$;

revoke all on function public.sync_scheduled_tryout_attempt(uuid) from public;
grant execute on function public.sync_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.sync_scheduled_tryout_attempt(uuid) to service_role;

create or replace function public.start_scheduled_tryout_attempt(
  target_event_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.scheduled_tryout_events%rowtype;
  active_attempt public.scheduled_tryout_attempts%rowtype;
  created_attempt public.scheduled_tryout_attempts%rowtype;
  submitted_attempt_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum memulai try out terjadwal.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('pro', 'mentor')
  ) then
    raise exception 'Akses mulai try out terjadwal hanya tersedia untuk pengguna pro atau mentor.'
      using errcode = '42501';
  end if;

  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_event_id
    and editorial_status = 'published'
    and access_start_at <= timezone('utc', now())
    and access_end_at > timezone('utc', now());

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
  limit 1;

  if found then
    perform public.sync_scheduled_tryout_attempt(active_attempt.id);

    select *
    into active_attempt
    from public.scheduled_tryout_attempts
    where id = active_attempt.id;

    return active_attempt;
  end if;

  select count(*)
  into submitted_attempt_count
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status = 'submitted';

  if submitted_attempt_count >= 3 then
    raise exception 'Kesempatan try out terjadwal untuk siklus ini sudah habis.'
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
      total_questions
    )
    values (
      event_row.id,
      event_row.current_cycle,
      auth.uid(),
      'in_progress',
      timezone('utc', now()),
      0,
      0,
      timezone('utc', now()),
      null,
      0
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

  perform public.sync_scheduled_tryout_attempt(created_attempt.id);

  select *
  into created_attempt
  from public.scheduled_tryout_attempts
  where id = created_attempt.id;

  return created_attempt;
end;
$$;

revoke all on function public.start_scheduled_tryout_attempt(uuid) from public;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to service_role;

create or replace function public.save_scheduled_tryout_answer(
  target_attempt_id uuid,
  target_attempt_item_id uuid,
  selected_option_key text,
  is_doubtful boolean default false
)
returns public.scheduled_tryout_answers
language plpgsql
security definer
set search_path = public
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

  perform public.sync_scheduled_tryout_attempt(target_attempt_id);

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid();

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
  set opened_at = coalesce(opened_at, answer_time)
  where id = target_item.id;

  insert into public.scheduled_tryout_answers (
    attempt_id,
    attempt_item_id,
    selected_option_key,
    is_doubtful,
    answered_at
  )
  values (
    target_attempt.id,
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

revoke all on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) from public;
grant execute on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) to service_role;

create or replace function public.pause_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
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
    and user_id = auth.uid();

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

revoke all on function public.pause_scheduled_tryout_attempt(uuid) from public;
grant execute on function public.pause_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.pause_scheduled_tryout_attempt(uuid) to service_role;

create or replace function public.resume_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  resume_time timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum melanjutkan try out terjadwal.'
      using errcode = '42501';
  end if;

  select scheduled_tryout_attempts.*
  into target_attempt
  from public.scheduled_tryout_attempts
  join public.scheduled_tryout_events
    on scheduled_tryout_events.id = scheduled_tryout_attempts.event_id
  where scheduled_tryout_attempts.id = target_attempt_id
    and scheduled_tryout_attempts.user_id = auth.uid();

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  perform public.sync_scheduled_tryout_attempt(target_attempt.id);

  if target_attempt.status <> 'paused' then
    select *
    into target_attempt
    from public.scheduled_tryout_attempts
    where id = target_attempt.id;

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

revoke all on function public.resume_scheduled_tryout_attempt(uuid) from public;
grant execute on function public.resume_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.resume_scheduled_tryout_attempt(uuid) to service_role;

create or replace function public.submit_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempt_results
language plpgsql
security definer
set search_path = public
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

  perform public.sync_scheduled_tryout_attempt(target_attempt_id);

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid();

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

revoke all on function public.submit_scheduled_tryout_attempt(uuid) from public;
grant execute on function public.submit_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.submit_scheduled_tryout_attempt(uuid) to service_role;

create or replace function public.upsert_scheduled_tryout_event(
  target_event_id uuid,
  payload jsonb
)
returns public.scheduled_tryout_events
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_event public.scheduled_tryout_events%rowtype;
  incoming_existing_question_ids uuid[] := '{}'::uuid[];
  question_payload jsonb;
  current_question_id uuid;
  current_block_id uuid;
  current_topic_id uuid;
  next_question_order integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyimpan event try out terjadwal.'
      using errcode = '42501';
  end if;

  if not public.can_manage_scheduled_tryouts() then
    raise exception 'Akses kelola event try out terjadwal hanya tersedia untuk mentor atau admin.'
      using errcode = '42501';
  end if;

  if payload is null then
    raise exception 'Payload event try out terjadwal tidak boleh kosong.'
      using errcode = 'P0001';
  end if;

  if target_event_id is null then
    insert into public.scheduled_tryout_events (
      title,
      description,
      editorial_status,
      access_start_at,
      access_end_at,
      created_by,
      updated_by
    )
    values (
      payload->>'title',
      coalesce(payload->>'description', ''),
      payload->>'editorialStatus',
      (payload->>'accessStartAt')::timestamptz,
      (payload->>'accessEndAt')::timestamptz,
      nullif(payload->>'createdBy', '')::uuid,
      coalesce(nullif(payload->>'updatedBy', '')::uuid, nullif(payload->>'createdBy', '')::uuid)
    )
    returning *
    into saved_event;
  else
    update public.scheduled_tryout_events
    set
      title = payload->>'title',
      description = coalesce(payload->>'description', ''),
      editorial_status = payload->>'editorialStatus',
      access_start_at = (payload->>'accessStartAt')::timestamptz,
      access_end_at = (payload->>'accessEndAt')::timestamptz,
      updated_by = nullif(payload->>'updatedBy', '')::uuid
    where id = target_event_id
    returning *
    into saved_event;

    if not found then
      raise exception 'Event try out terjadwal tidak ditemukan.'
        using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg(nullif(question_item->>'id', '')::uuid), '{}'::uuid[])
  into incoming_existing_question_ids
  from jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb)) as question(question_item)
  where nullif(question_item->>'id', '') is not null;

  delete from public.scheduled_tryout_event_questions
  where event_id = saved_event.id
    and not (id = any(incoming_existing_question_ids));

  for question_payload in
    select value
    from jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb))
  loop
    next_question_order := next_question_order + 1;
    current_question_id := nullif(question_payload->>'id', '')::uuid;
    current_block_id := nullif(question_payload->>'blockId', '')::uuid;
    current_topic_id := nullif(question_payload->>'topicId', '')::uuid;

    if current_question_id is null then
      insert into public.scheduled_tryout_event_questions (
        event_id,
        question_order,
        stem,
        question_image_path,
        block_id,
        topic_id,
        correct_option_key,
        explanation_text,
        explanation_image_path
      )
      values (
        saved_event.id,
        next_question_order,
        question_payload->>'stem',
        nullif(question_payload->>'questionImagePath', ''),
        current_block_id,
        current_topic_id,
        question_payload->>'correctOptionKey',
        nullif(question_payload->>'explanationText', ''),
        nullif(question_payload->>'explanationImagePath', '')
      )
      returning id
      into current_question_id;
    else
      update public.scheduled_tryout_event_questions
      set
        question_order = next_question_order,
        stem = question_payload->>'stem',
        question_image_path = nullif(question_payload->>'questionImagePath', ''),
        block_id = current_block_id,
        topic_id = current_topic_id,
        correct_option_key = question_payload->>'correctOptionKey',
        explanation_text = nullif(question_payload->>'explanationText', ''),
        explanation_image_path = nullif(question_payload->>'explanationImagePath', '')
      where id = current_question_id
        and event_id = saved_event.id
      returning id
      into current_question_id;

      if not found then
        raise exception 'Soal event try out terjadwal tidak ditemukan.'
          using errcode = 'P0002';
      end if;
    end if;

    delete from public.scheduled_tryout_event_question_options
    where event_question_id = current_question_id;

    insert into public.scheduled_tryout_event_question_options (
      event_question_id,
      option_key,
      option_text,
      sort_order
    )
    select
      current_question_id,
      option_item->>'key',
      option_item->>'text',
      option_ordinality::integer
    from jsonb_array_elements(coalesce(question_payload->'options', '[]'::jsonb)) with ordinality
      as option(option_item, option_ordinality);
  end loop;

  return saved_event;
end;
$$;

revoke all on function public.upsert_scheduled_tryout_event(uuid, jsonb) from public;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to authenticated;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to service_role;

create or replace function public.reactivate_scheduled_tryout_event(
  target_event_id uuid,
  next_access_start_at timestamptz,
  next_access_end_at timestamptz
)
returns public.scheduled_tryout_events
language plpgsql
security definer
set search_path = public
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

  delete from public.scheduled_tryout_answers
  where attempt_id in (
    select id
    from public.scheduled_tryout_attempts
    where event_id = event_row.id
  );

  delete from public.scheduled_tryout_attempt_results
  where event_id = event_row.id;

  delete from public.scheduled_tryout_attempts
  where event_id = event_row.id;

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

revoke all on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) from public;
grant execute on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz) to service_role;

create or replace function public.delete_scheduled_tryout_event(
  target_event_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Scheduled tryout delete RPC shell is not implemented in Task 1.';
end;
$$;

revoke all on function public.delete_scheduled_tryout_event(uuid) from public;
grant execute on function public.delete_scheduled_tryout_event(uuid) to authenticated;
grant execute on function public.delete_scheduled_tryout_event(uuid) to service_role;
