create table if not exists public.exam_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  mode text not null,
  block_id uuid references public.blocks (id) on delete set null,
  question_count integer not null default 0,
  duration_minutes integer not null,
  status text not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint exam_templates_mode_check check (mode in ('full', 'block')),
  constraint exam_templates_status_check check (status in ('draft', 'published', 'archived'))
);

drop trigger if exists set_exam_templates_updated_at on public.exam_templates;
create trigger set_exam_templates_updated_at
before update on public.exam_templates
for each row
execute function public.set_updated_at();

create table if not exists public.exam_template_items (
  id uuid primary key default gen_random_uuid(),
  exam_template_id uuid not null references public.exam_templates (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists exam_template_items_template_question_idx
  on public.exam_template_items (exam_template_id, question_id);

create unique index if not exists exam_template_items_template_sort_idx
  on public.exam_template_items (exam_template_id, sort_order);

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'attempt_status'
  ) then
    create type public.attempt_status as enum (
      'in_progress',
      'submitted',
      'abandoned'
    );
  end if;
end
$$;

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_template_id uuid not null references public.exam_templates (id) on delete restrict,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  time_limit_seconds integer not null,
  total_questions integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint attempts_submission_time_check check (
    (status = 'submitted' and submitted_at is not null)
    or (status <> 'submitted')
  )
);

create index if not exists attempts_user_id_created_at_idx
  on public.attempts (user_id, created_at desc);

drop trigger if exists set_attempts_updated_at on public.attempts;
create trigger set_attempts_updated_at
before update on public.attempts
for each row
execute function public.set_updated_at();

create table if not exists public.attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  block_id uuid references public.blocks (id) on delete set null,
  block_name text not null,
  topic_id uuid references public.topics (id) on delete set null,
  question_stem text not null,
  options_snapshot jsonb not null,
  correct_option_key text not null,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists attempt_items_attempt_sort_idx
  on public.attempt_items (attempt_id, sort_order);

create unique index if not exists attempt_items_attempt_question_idx
  on public.attempt_items (attempt_id, question_id);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  attempt_item_id uuid not null references public.attempt_items (id) on delete cascade,
  selected_option_key text,
  answered_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists answers_attempt_item_unique_idx
  on public.answers (attempt_item_id);

create index if not exists answers_attempt_idx
  on public.answers (attempt_id);

drop trigger if exists set_answers_updated_at on public.answers;
create trigger set_answers_updated_at
before update on public.answers
for each row
execute function public.set_updated_at();

create table if not exists public.attempt_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts (id) on delete cascade,
  score numeric(5,2) not null,
  correct_answers integer not null,
  wrong_answers integer not null,
  unanswered_count integer not null default 0,
  time_used_seconds integer not null,
  block_summary jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.start_attempt_from_template(
  target_exam_template_id uuid
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  template_row public.exam_templates%rowtype;
  created_attempt public.attempts%rowtype;
  template_question_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum memulai try out.'
      using errcode = '42501';
  end if;

  select *
  into template_row
  from public.exam_templates
  where id = target_exam_template_id
    and status = 'published';

  if not found then
    raise exception 'Template try out tidak ditemukan atau belum dipublikasikan.'
      using errcode = 'P0002';
  end if;

  select count(*)
  into template_question_count
  from public.exam_template_items
  where exam_template_id = template_row.id;

  if coalesce(template_question_count, 0) = 0 then
    raise exception 'Template try out ini belum memiliki soal.'
      using errcode = 'P0002';
  end if;

  insert into public.attempts (
    user_id,
    exam_template_id,
    status,
    time_limit_seconds,
    total_questions
  )
  values (
    auth.uid(),
    template_row.id,
    'in_progress',
    template_row.duration_minutes * 60,
    template_question_count
  )
  returning *
  into created_attempt;

  insert into public.attempt_items (
    attempt_id,
    question_id,
    block_id,
    block_name,
    topic_id,
    question_stem,
    options_snapshot,
    correct_option_key,
    sort_order
  )
  select
    created_attempt.id,
    question.id,
    block.id,
    coalesce(block.name, 'Tanpa blok'),
    topic.id,
    question.stem,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key',
          option.option_key,
          'text',
          option.option_text
        )
        order by option.sort_order
      ),
      '[]'::jsonb
    ),
    max(option.option_key) filter (where option.is_correct),
    template_item.sort_order
  from public.exam_template_items as template_item
  join public.questions as question
    on question.id = template_item.question_id
  left join public.blocks as block
    on block.id = question.block_id
  left join public.topics as topic
    on topic.id = question.topic_id
  join public.question_options as option
    on option.question_id = question.id
  where template_item.exam_template_id = template_row.id
  group by
    template_item.sort_order,
    question.id,
    question.stem,
    block.id,
    block.name,
    topic.id
  order by template_item.sort_order;

  return created_attempt;
end;
$$;

revoke all on function public.start_attempt_from_template(uuid) from public;
grant execute on function public.start_attempt_from_template(uuid) to authenticated;
grant execute on function public.start_attempt_from_template(uuid) to service_role;

create or replace function public.submit_attempt(
  target_attempt_id uuid
)
returns public.attempt_results
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.attempts%rowtype;
  result_row public.attempt_results%rowtype;
  submission_time timestamptz := timezone('utc', now());
  time_used_seconds_value integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum mengirim hasil.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.attempts
  where id = target_attempt_id
    and (
      user_id = auth.uid()
      or public.is_admin()
    );

  if not found then
    raise exception 'Attempt try out tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'submitted' then
    update public.attempts
    set
      status = 'submitted',
      submitted_at = submission_time
    where id = target_attempt.id
    returning *
    into target_attempt;
  end if;

  time_used_seconds_value := greatest(
    0,
    least(
      target_attempt.time_limit_seconds,
      coalesce(
        extract(epoch from (coalesce(target_attempt.submitted_at, submission_time) - target_attempt.started_at))::integer,
        0
      )
    )
  );

  insert into public.attempt_results (
    attempt_id,
    score,
    correct_answers,
    wrong_answers,
    unanswered_count,
    time_used_seconds,
    block_summary
  )
  select
    target_attempt.id,
    case
      when totals.total_questions = 0 then 0
      else round((totals.correct_answers::numeric / totals.total_questions::numeric) * 100, 2)
    end,
    totals.correct_answers,
    totals.wrong_answers,
    totals.unanswered_count,
    time_used_seconds_value,
    totals.block_summary
  from (
    select
      count(*)::integer as total_questions,
      count(*) filter (where answer.selected_option_key = item.correct_option_key)::integer as correct_answers,
      count(*) filter (
        where answer.selected_option_key is not null
          and answer.selected_option_key <> item.correct_option_key
      )::integer as wrong_answers,
      count(*) filter (where answer.selected_option_key is null)::integer as unanswered_count,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'name',
              block_totals.block_name,
              'correct',
              block_totals.correct_answers,
              'wrong',
              block_totals.wrong_answers
            )
            order by block_totals.sort_key
          )
          from (
            select
              item_summary.block_name,
              min(item_summary.sort_order) as sort_key,
              count(*) filter (
                where summary_answer.selected_option_key = item_summary.correct_option_key
              )::integer as correct_answers,
              count(*) filter (
                where summary_answer.selected_option_key is not null
                  and summary_answer.selected_option_key <> item_summary.correct_option_key
              )::integer as wrong_answers
            from public.attempt_items as item_summary
            left join public.answers as summary_answer
              on summary_answer.attempt_item_id = item_summary.id
            where item_summary.attempt_id = target_attempt.id
            group by item_summary.block_name
          ) as block_totals
        ),
        '[]'::jsonb
      ) as block_summary
    from public.attempt_items as item
    left join public.answers as answer
      on answer.attempt_item_id = item.id
    where item.attempt_id = target_attempt.id
  ) as totals
  on conflict (attempt_id) do update
  set
    score = excluded.score,
    correct_answers = excluded.correct_answers,
    wrong_answers = excluded.wrong_answers,
    unanswered_count = excluded.unanswered_count,
    time_used_seconds = excluded.time_used_seconds,
    block_summary = excluded.block_summary,
    generated_at = timezone('utc', now())
  returning *
  into result_row;

  return result_row;
end;
$$;

revoke all on function public.submit_attempt(uuid) from public;
grant execute on function public.submit_attempt(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid) to service_role;
