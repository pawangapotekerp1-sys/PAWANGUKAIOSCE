alter table public.exam_templates
  add column if not exists diagnostic_source boolean not null default false;

create table if not exists public.attempt_item_behavior_metrics (
  attempt_item_id uuid primary key references public.attempt_items (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  time_spent_seconds integer not null default 0,
  was_ever_flagged_ragu boolean not null default false,
  is_flagged_ragu_final boolean not null default false,
  answer_change_count integer not null default 0,
  changed_correct_to_wrong_count integer not null default 0,
  first_answered_at timestamptz,
  last_answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists attempt_item_behavior_metrics_attempt_idx
  on public.attempt_item_behavior_metrics (attempt_id);

drop trigger if exists set_attempt_item_behavior_metrics_updated_at on public.attempt_item_behavior_metrics;
create trigger set_attempt_item_behavior_metrics_updated_at
before update on public.attempt_item_behavior_metrics
for each row
execute function public.set_updated_at();

create table if not exists public.attempt_answer_change_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  attempt_item_id uuid not null references public.attempt_items (id) on delete cascade,
  previous_option_key text,
  next_option_key text,
  was_previous_correct boolean not null default false,
  is_next_correct boolean not null default false,
  changed_at timestamptz not null default timezone('utc', now())
);

create index if not exists attempt_answer_change_events_attempt_idx
  on public.attempt_answer_change_events (attempt_id, changed_at desc);

create index if not exists attempt_answer_change_events_attempt_item_idx
  on public.attempt_answer_change_events (attempt_item_id, changed_at desc);

create table if not exists public.attempt_diagnostic_snapshots (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_template_id uuid not null references public.exam_templates (id) on delete cascade,
  submitted_at timestamptz not null,
  question_count integer not null,
  correct_count integer not null,
  wrong_count integer not null,
  unanswered_count integer not null,
  overall_accuracy numeric(5,2) not null,
  overall_avg_time_per_question numeric(10,2) not null,
  overall_ragu_rate numeric(6,4) not null,
  overall_answer_change_rate numeric(6,4) not null,
  overall_correct_to_wrong_rate numeric(6,4) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists attempt_diagnostic_snapshots_user_submitted_idx
  on public.attempt_diagnostic_snapshots (user_id, submitted_at desc);

create index if not exists attempt_diagnostic_snapshots_template_idx
  on public.attempt_diagnostic_snapshots (exam_template_id, submitted_at desc);

drop trigger if exists set_attempt_diagnostic_snapshots_updated_at on public.attempt_diagnostic_snapshots;
create trigger set_attempt_diagnostic_snapshots_updated_at
before update on public.attempt_diagnostic_snapshots
for each row
execute function public.set_updated_at();

create table if not exists public.attempt_diagnostic_topic_snapshots (
  id uuid primary key default gen_random_uuid(),
  attempt_snapshot_id uuid not null references public.attempt_diagnostic_snapshots (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  topic_name text not null,
  block_id uuid references public.blocks (id) on delete set null,
  block_name text not null,
  question_count integer not null,
  correct_count integer not null,
  wrong_count integer not null,
  unanswered_count integer not null,
  accuracy numeric(5,2) not null,
  avg_time_seconds numeric(10,2) not null,
  ragu_count integer not null,
  ragu_rate numeric(6,4) not null,
  answer_change_count integer not null,
  answer_change_rate numeric(6,4) not null,
  correct_to_wrong_count integer not null,
  correct_to_wrong_rate numeric(6,4) not null,
  weakness_score_base numeric(8,4) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists attempt_diagnostic_topic_snapshots_attempt_topic_idx
  on public.attempt_diagnostic_topic_snapshots (attempt_snapshot_id, topic_id);

create index if not exists attempt_diagnostic_topic_snapshots_attempt_idx
  on public.attempt_diagnostic_topic_snapshots (attempt_id);

create index if not exists attempt_diagnostic_topic_snapshots_topic_idx
  on public.attempt_diagnostic_topic_snapshots (topic_id);

create or replace function public.save_attempt_answer(
  target_attempt_id uuid,
  target_attempt_item_id uuid,
  selected_option_key text,
  is_doubtful boolean,
  time_spent_delta_seconds integer
)
returns public.answers
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.attempts%rowtype;
  target_item public.attempt_items%rowtype;
  existing_answer public.answers%rowtype;
  saved_answer public.answers%rowtype;
  safe_is_doubtful boolean := case
    when selected_option_key is null then false
    else coalesce(is_doubtful, false)
  end;
  safe_time_spent_delta integer := greatest(coalesce(time_spent_delta_seconds, 0), 0);
  answer_option_changed boolean := false;
  previous_was_correct boolean := false;
  next_is_correct boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyimpan jawaban.'
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

  if target_attempt.status <> 'in_progress' then
    raise exception 'Attempt try out belum aktif untuk menerima jawaban.'
      using errcode = 'P0001';
  end if;

  select *
  into target_item
  from public.attempt_items
  where id = target_attempt_item_id
    and attempt_id = target_attempt.id;

  if not found then
    raise exception 'Soal try out tidak ditemukan pada attempt ini.'
      using errcode = 'P0002';
  end if;

  select *
  into existing_answer
  from public.answers
  where attempt_item_id = target_item.id;

  answer_option_changed := found and existing_answer.selected_option_key is distinct from selected_option_key;
  previous_was_correct := found and existing_answer.selected_option_key = target_item.correct_option_key;
  next_is_correct := selected_option_key = target_item.correct_option_key;

  insert into public.attempt_item_behavior_metrics (
    attempt_item_id,
    attempt_id,
    time_spent_seconds,
    was_ever_flagged_ragu,
    is_flagged_ragu_final,
    answer_change_count,
    changed_correct_to_wrong_count,
    first_answered_at,
    last_answered_at
  )
  values (
    target_item.id,
    target_attempt.id,
    safe_time_spent_delta,
    safe_is_doubtful,
    safe_is_doubtful,
    case when answer_option_changed then 1 else 0 end,
    case
      when answer_option_changed and previous_was_correct and selected_option_key is not null and not next_is_correct then 1
      else 0
    end,
    case when selected_option_key is not null then timezone('utc', now()) else null end,
    case when selected_option_key is not null then timezone('utc', now()) else null end
  )
  on conflict (attempt_item_id) do update
  set
    time_spent_seconds = public.attempt_item_behavior_metrics.time_spent_seconds + excluded.time_spent_seconds,
    was_ever_flagged_ragu = public.attempt_item_behavior_metrics.was_ever_flagged_ragu or excluded.was_ever_flagged_ragu,
    is_flagged_ragu_final = excluded.is_flagged_ragu_final,
    answer_change_count = public.attempt_item_behavior_metrics.answer_change_count + excluded.answer_change_count,
    changed_correct_to_wrong_count = public.attempt_item_behavior_metrics.changed_correct_to_wrong_count + excluded.changed_correct_to_wrong_count,
    first_answered_at = coalesce(public.attempt_item_behavior_metrics.first_answered_at, excluded.first_answered_at),
    last_answered_at = coalesce(excluded.last_answered_at, public.attempt_item_behavior_metrics.last_answered_at);

  if answer_option_changed then
    insert into public.attempt_answer_change_events (
      attempt_id,
      attempt_item_id,
      previous_option_key,
      next_option_key,
      was_previous_correct,
      is_next_correct
    )
    values (
      target_attempt.id,
      target_item.id,
      existing_answer.selected_option_key,
      selected_option_key,
      previous_was_correct,
      next_is_correct
    );
  end if;

  insert into public.answers (
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
    safe_is_doubtful,
    timezone('utc', now())
  )
  on conflict (attempt_item_id) do update
  set
    selected_option_key = excluded.selected_option_key,
    is_doubtful = excluded.is_doubtful,
    answered_at = excluded.answered_at
  returning *
  into saved_answer;

  return saved_answer;
end;
$$;

revoke all on function public.save_attempt_answer(uuid, uuid, text, boolean, integer) from public;
grant execute on function public.save_attempt_answer(uuid, uuid, text, boolean, integer) to authenticated;
grant execute on function public.save_attempt_answer(uuid, uuid, text, boolean, integer) to service_role;

create or replace function public.rebuild_attempt_diagnostic_snapshot(
  target_attempt_id uuid
)
returns public.attempt_diagnostic_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.attempts%rowtype;
  target_template public.exam_templates%rowtype;
  snapshot_row public.attempt_diagnostic_snapshots%rowtype;
begin
  if auth.uid() is not null then
    select *
    into target_attempt
    from public.attempts
    where id = target_attempt_id
      and (
        user_id = auth.uid()
        or public.is_admin()
      );
  else
    select *
    into target_attempt
    from public.attempts
    where id = target_attempt_id;
  end if;

  if not found then
    raise exception 'Attempt try out tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  select *
  into target_template
  from public.exam_templates
  where id = target_attempt.exam_template_id;

  if not found then
    raise exception 'Template try out tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'submitted'
    or target_attempt.submitted_at is null
    or target_template.diagnostic_source is distinct from true then
    delete from public.attempt_diagnostic_snapshots
    where attempt_id = target_attempt.id
    returning *
    into snapshot_row;

    return snapshot_row;
  end if;

  if target_template.diagnostic_source = true then

  with attempt_totals as (
    select
      count(*)::integer as question_count,
      count(*) filter (where answer.selected_option_key = item.correct_option_key)::integer as correct_count,
      count(*) filter (
        where answer.selected_option_key is not null
          and answer.selected_option_key <> item.correct_option_key
      )::integer as wrong_count,
      count(*) filter (where answer.selected_option_key is null)::integer as unanswered_count,
      round(
        case
          when count(*) = 0 then 0
          else (count(*) filter (where answer.selected_option_key = item.correct_option_key)::numeric / count(*)::numeric) * 100
        end,
        2
      ) as overall_accuracy,
      round(
        case
          when count(*) = 0 then 0
          else coalesce(sum(metric.time_spent_seconds), 0)::numeric / count(*)::numeric
        end,
        2
      ) as overall_avg_time_per_question,
      round(
        case
          when count(*) = 0 then 0
          else count(*) filter (where coalesce(metric.was_ever_flagged_ragu, false))::numeric / count(*)::numeric
        end,
        4
      ) as overall_ragu_rate,
      round(
        case
          when count(*) = 0 then 0
          else coalesce(sum(metric.answer_change_count), 0)::numeric / count(*)::numeric
        end,
        4
      ) as overall_answer_change_rate,
      round(
        case
          when count(*) = 0 then 0
          else coalesce(sum(metric.changed_correct_to_wrong_count), 0)::numeric / count(*)::numeric
        end,
        4
      ) as overall_correct_to_wrong_rate
    from public.attempt_items as item
    left join public.answers as answer
      on answer.attempt_item_id = item.id
    left join public.attempt_item_behavior_metrics as metric
      on metric.attempt_item_id = item.id
    where item.attempt_id = target_attempt.id
  )
  insert into public.attempt_diagnostic_snapshots (
    attempt_id,
    user_id,
    exam_template_id,
    submitted_at,
    question_count,
    correct_count,
    wrong_count,
    unanswered_count,
    overall_accuracy,
    overall_avg_time_per_question,
    overall_ragu_rate,
    overall_answer_change_rate,
    overall_correct_to_wrong_rate
  )
  select
    target_attempt.id,
    target_attempt.user_id,
    target_attempt.exam_template_id,
    target_attempt.submitted_at,
    attempt_totals.question_count,
    attempt_totals.correct_count,
    attempt_totals.wrong_count,
    attempt_totals.unanswered_count,
    attempt_totals.overall_accuracy,
    attempt_totals.overall_avg_time_per_question,
    attempt_totals.overall_ragu_rate,
    attempt_totals.overall_answer_change_rate,
    attempt_totals.overall_correct_to_wrong_rate
  from attempt_totals
  on conflict (attempt_id) do update
  set
    user_id = excluded.user_id,
    exam_template_id = excluded.exam_template_id,
    submitted_at = excluded.submitted_at,
    question_count = excluded.question_count,
    correct_count = excluded.correct_count,
    wrong_count = excluded.wrong_count,
    unanswered_count = excluded.unanswered_count,
    overall_accuracy = excluded.overall_accuracy,
    overall_avg_time_per_question = excluded.overall_avg_time_per_question,
    overall_ragu_rate = excluded.overall_ragu_rate,
    overall_answer_change_rate = excluded.overall_answer_change_rate,
    overall_correct_to_wrong_rate = excluded.overall_correct_to_wrong_rate,
    updated_at = timezone('utc', now())
  returning *
  into snapshot_row;

  delete from public.attempt_diagnostic_topic_snapshots
  where attempt_snapshot_id = snapshot_row.id;

  insert into public.attempt_diagnostic_topic_snapshots (
    attempt_snapshot_id,
    attempt_id,
    topic_id,
    topic_name,
    block_id,
    block_name,
    question_count,
    correct_count,
    wrong_count,
    unanswered_count,
    accuracy,
    avg_time_seconds,
    ragu_count,
    ragu_rate,
    answer_change_count,
    answer_change_rate,
    correct_to_wrong_count,
    correct_to_wrong_rate,
    weakness_score_base
  )
  select
    snapshot_row.id,
    target_attempt.id,
    item.topic_id,
    coalesce(topic.name, 'Tanpa topik'),
    item.block_id,
    coalesce(item.block_name, 'Tanpa blok'),
    count(*)::integer as question_count,
    count(*) filter (where answer.selected_option_key = item.correct_option_key)::integer as correct_count,
    count(*) filter (
      where answer.selected_option_key is not null
        and answer.selected_option_key <> item.correct_option_key
    )::integer as wrong_count,
    count(*) filter (where answer.selected_option_key is null)::integer as unanswered_count,
    round(
      case
        when count(*) = 0 then 0
        else (count(*) filter (where answer.selected_option_key = item.correct_option_key)::numeric / count(*)::numeric) * 100
      end,
      2
    ) as accuracy,
    round(
      case
        when count(*) = 0 then 0
        else coalesce(sum(metric.time_spent_seconds), 0)::numeric / count(*)::numeric
      end,
      2
    ) as avg_time_seconds,
    count(*) filter (where coalesce(metric.was_ever_flagged_ragu, false))::integer as ragu_count,
    round(
      case
        when count(*) = 0 then 0
        else count(*) filter (where coalesce(metric.was_ever_flagged_ragu, false))::numeric / count(*)::numeric
      end,
      4
    ) as ragu_rate,
    coalesce(sum(metric.answer_change_count), 0)::integer as answer_change_count,
    round(
      case
        when count(*) = 0 then 0
        else coalesce(sum(metric.answer_change_count), 0)::numeric / count(*)::numeric
      end,
      4
    ) as answer_change_rate,
    coalesce(sum(metric.changed_correct_to_wrong_count), 0)::integer as correct_to_wrong_count,
    round(
      case
        when count(*) = 0 then 0
        else coalesce(sum(metric.changed_correct_to_wrong_count), 0)::numeric / count(*)::numeric
      end,
      4
    ) as correct_to_wrong_rate,
    round(
      (
        (100 - (
          case
            when count(*) = 0 then 0
            else (count(*) filter (where answer.selected_option_key = item.correct_option_key)::numeric / count(*)::numeric) * 100
          end
        )) * 0.7
      ) + (
        (
          round(
            case
              when count(*) = 0 then 0
              else count(*) filter (where coalesce(metric.was_ever_flagged_ragu, false))::numeric / count(*)::numeric
            end,
            4
          ) * 10
        ) + (
          round(
            case
              when count(*) = 0 then 0
              else coalesce(sum(metric.answer_change_count), 0)::numeric / count(*)::numeric
            end,
            4
          ) * 5
        ) + (
          round(
            case
              when count(*) = 0 then 0
              else coalesce(sum(metric.changed_correct_to_wrong_count), 0)::numeric / count(*)::numeric
            end,
            4
          ) * 15
        )
      ) * 0.3,
      4
    ) as weakness_score_base
  from public.attempt_items as item
  left join public.answers as answer
    on answer.attempt_item_id = item.id
  left join public.attempt_item_behavior_metrics as metric
    on metric.attempt_item_id = item.id
  left join public.topics as topic
    on topic.id = item.topic_id
  where item.attempt_id = target_attempt.id
    and item.topic_id is not null
  group by
    item.topic_id,
    topic.name,
    item.block_id,
    item.block_name;

  end if;

  return snapshot_row;
end;
$$;

revoke all on function public.rebuild_attempt_diagnostic_snapshot(uuid) from public;
grant execute on function public.rebuild_attempt_diagnostic_snapshot(uuid) to authenticated;
grant execute on function public.rebuild_attempt_diagnostic_snapshot(uuid) to service_role;

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
    update public.attempts
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

  perform public.rebuild_attempt_diagnostic_snapshot(target_attempt.id);

  return result_row;
end;
$$;

revoke all on function public.submit_attempt(uuid) from public;
grant execute on function public.submit_attempt(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid) to service_role;

create or replace function public.get_personal_weakness_diagnosis(
  date_from date,
  date_to date,
  user_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  safe_timezone text := coalesce(nullif(user_timezone, ''), 'UTC');
  range_start_utc timestamptz;
  range_end_utc timestamptz;
  eligible_attempt_count integer := 0;
  overall_question_count integer := 0;
  overall_accuracy numeric(5,2) := 0;
  overall_average_time_per_question numeric(10,2) := 0;
  overall_ragu_rate numeric(6,4) := 0;
  overall_answer_change_rate numeric(6,4) := 0;
  overall_correct_to_wrong_rate numeric(6,4) := 0;
  diagnosis_mode text := 'empty';
  minimum_attempts_met boolean := false;
  global_behavior_patterns jsonb := '[]'::jsonb;
  subtopic_rankings jsonb := '[]'::jsonb;
  basic_summary jsonb := null;
  narrative jsonb := '{}'::jsonb;
  top_topic_name text;
  top_block_name text;
  top_behavior_flags jsonb := '[]'::jsonb;
  top_confidence text;
begin
  if target_user_id is null then
    raise exception 'Silakan login terlebih dahulu sebelum melihat diagnosis.'
      using errcode = '42501';
  end if;

  if date_from is null or date_to is null then
    raise exception 'Rentang tanggal diagnosis harus lengkap.'
      using errcode = '22004';
  end if;

  if date_to < date_from then
    raise exception 'Tanggal akhir diagnosis tidak boleh lebih awal dari tanggal mulai.'
      using errcode = '22007';
  end if;

  range_start_utc := (date_from::timestamp at time zone safe_timezone);
  range_end_utc := ((date_to + 1)::timestamp at time zone safe_timezone);

  with eligible_snapshots as (
    select snapshot.*
    from public.attempt_diagnostic_snapshots as snapshot
    join public.exam_templates as template
      on template.id = snapshot.exam_template_id
    where snapshot.user_id = target_user_id
      and snapshot.submitted_at >= range_start_utc
      and snapshot.submitted_at < range_end_utc
      and template.diagnostic_source = true
  )
  select
    count(*)::integer,
    coalesce(sum(snapshot.question_count), 0)::integer,
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else (coalesce(sum(snapshot.correct_count), 0)::numeric / sum(snapshot.question_count)::numeric) * 100
      end,
      2
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_avg_time_per_question * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      2
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_ragu_rate * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      4
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_answer_change_rate * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      4
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_correct_to_wrong_rate * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      4
    )
  into
    eligible_attempt_count,
    overall_question_count,
    overall_accuracy,
    overall_average_time_per_question,
    overall_ragu_rate,
    overall_answer_change_rate,
    overall_correct_to_wrong_rate
  from eligible_snapshots as snapshot;

  diagnosis_mode := case
    when eligible_attempt_count = 0 then 'empty'
    when eligible_attempt_count < 3 then 'basic'
    else 'full'
  end;
  minimum_attempts_met := eligible_attempt_count >= 3;

  with pattern_candidates as (
    select
      4 as sort_key,
      'correct_to_wrong_switches'::text as code,
      'Sering mengubah benar menjadi salah'::text as label,
      case
        when overall_correct_to_wrong_rate >= 0.12 then 'high'
        when overall_correct_to_wrong_rate >= 0.06 then 'medium'
        when overall_correct_to_wrong_rate >= 0.02 then 'low'
        else null
      end as severity,
      format(
        '%s%% perubahan jawaban berakhir dari benar ke salah.',
        round(overall_correct_to_wrong_rate * 100, 0)::text
      ) as evidence,
      'Perubahan dari benar ke salah menunjukkan keputusan akhir sering merusak jawaban yang sebenarnya sudah tepat.'::text
        as description
    union all
    select
      3,
      'frequent_answer_changes',
      'Sering ganti jawaban',
      case
        when overall_answer_change_rate >= 0.30 then 'high'
        when overall_answer_change_rate >= 0.15 then 'medium'
        when overall_answer_change_rate >= 0.05 then 'low'
        else null
      end,
      format(
        '%s%% soal mengalami perubahan jawaban berulang.',
        round(overall_answer_change_rate * 100, 0)::text
      ),
      'Perubahan jawaban yang sering menandakan stabilitas keputusan masih belum konsisten pada rentang ini.'
    union all
    select
      2,
      'frequent_ragu',
      'Sering ragu-ragu',
      case
        when overall_ragu_rate >= 0.35 then 'high'
        when overall_ragu_rate >= 0.20 then 'medium'
        when overall_ragu_rate >= 0.10 then 'low'
        else null
      end,
      format(
        '%s%% soal sempat ditandai ragu-ragu.',
        round(overall_ragu_rate * 100, 0)::text
      ),
      'Tanda ragu-ragu yang berulang menunjukkan keyakinan konsep belum stabil saat mengerjakan try out.'
    union all
    select
      1,
      'slow_pacing',
      'Terlalu lama',
      case
        when overall_average_time_per_question >= 120 then 'high'
        when overall_average_time_per_question >= 90 then 'medium'
        when overall_average_time_per_question >= 60 then 'low'
        else null
      end,
      format(
        'Rata-rata waktu per soal berada di %s detik.',
        round(overall_average_time_per_question, 0)::text
      ),
      'Tempo pengerjaan yang lambat membuat diagnosis ini membaca ada tekanan tambahan pada proses memilih jawaban.'
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', code,
        'label', label,
        'severity', severity,
        'evidence', evidence,
        'description', description
      )
      order by sort_key desc
    ),
    '[]'::jsonb
  )
  into global_behavior_patterns
  from pattern_candidates
  where severity is not null;

  if diagnosis_mode = 'full' then
    with eligible_snapshots as (
      select snapshot.*
      from public.attempt_diagnostic_snapshots as snapshot
      join public.exam_templates as template
        on template.id = snapshot.exam_template_id
      where snapshot.user_id = target_user_id
        and snapshot.submitted_at >= range_start_utc
        and snapshot.submitted_at < range_end_utc
        and template.diagnostic_source = true
    ),
    topic_totals as (
      select
        topic_snapshot.topic_id,
        max(topic_snapshot.topic_name) as topic_name,
        max(topic_snapshot.block_id::text)::uuid as block_id,
        max(topic_snapshot.block_name) as block_name,
        count(distinct topic_snapshot.attempt_id)::integer as attempt_coverage_count,
        coalesce(sum(topic_snapshot.question_count), 0)::integer as question_count,
        coalesce(sum(topic_snapshot.correct_count), 0)::integer as correct_count,
        coalesce(sum(topic_snapshot.wrong_count), 0)::integer as wrong_count,
        coalesce(sum(topic_snapshot.unanswered_count), 0)::integer as unanswered_count,
        coalesce(sum(topic_snapshot.avg_time_seconds * topic_snapshot.question_count), 0)::numeric as total_time_seconds,
        coalesce(sum(topic_snapshot.ragu_count), 0)::integer as ragu_count,
        coalesce(sum(topic_snapshot.answer_change_count), 0)::integer as answer_change_count,
        coalesce(sum(topic_snapshot.correct_to_wrong_count), 0)::integer as correct_to_wrong_count
      from public.attempt_diagnostic_topic_snapshots as topic_snapshot
      join eligible_snapshots as snapshot
        on snapshot.id = topic_snapshot.attempt_snapshot_id
      group by topic_snapshot.topic_id
    ),
    computed_rankings as (
      select
        topic_totals.topic_id,
        topic_totals.topic_name,
        topic_totals.block_id,
        topic_totals.block_name,
        topic_totals.attempt_coverage_count,
        topic_totals.question_count,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else (topic_totals.correct_count::numeric / topic_totals.question_count::numeric) * 100
          end,
          2
        ) as accuracy,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.total_time_seconds / topic_totals.question_count::numeric
          end,
          2
        ) as average_time_per_question,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.ragu_count::numeric / topic_totals.question_count::numeric
          end,
          4
        ) as ragu_rate,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.answer_change_count::numeric / topic_totals.question_count::numeric
          end,
          4
        ) as answer_change_rate,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.correct_to_wrong_count::numeric / topic_totals.question_count::numeric
          end,
          4
        ) as correct_to_wrong_rate
      from topic_totals
    ),
    ranked_topics as (
      select
        computed.topic_id,
        computed.topic_name,
        computed.block_id,
        computed.block_name,
        computed.attempt_coverage_count,
        computed.question_count,
        computed.accuracy,
        computed.average_time_per_question,
        computed.ragu_rate,
        computed.answer_change_rate,
        computed.correct_to_wrong_rate,
        array_remove(
          array[
            case when computed.ragu_rate >= 0.20 then 'frequent_ragu' end,
            case
              when overall_average_time_per_question > 0
                and computed.average_time_per_question >= overall_average_time_per_question * 1.15
                then 'slow_pacing'
            end,
            case when computed.answer_change_rate >= 0.15 then 'frequent_answer_changes' end,
            case when computed.correct_to_wrong_rate >= 0.06 then 'correct_to_wrong_switches' end
          ],
          null
        ) as behavior_flags,
        case
          when computed.question_count >= 12 and computed.attempt_coverage_count >= 3 then 'high'
          when computed.question_count >= 6 and computed.attempt_coverage_count >= 2 then 'medium'
          else 'low'
        end as confidence,
        round(
          ((100 - computed.accuracy) * 0.70)
          + (
            least(
              greatest(
                case
                  when overall_average_time_per_question <= 0 then 0
                  else (computed.average_time_per_question / overall_average_time_per_question) - 1
                end,
                0
              ),
              1
            ) * 100 * 0.075
          )
          + (computed.ragu_rate * 100 * 0.075)
          + (least(computed.answer_change_rate, 1) * 100 * 0.06)
          + (least(computed.correct_to_wrong_rate, 1) * 100 * 0.09),
          2
        ) as weakness_score
      from computed_rankings as computed
    ),
    serialized_rankings as (
      select
        row_number() over (
          order by
            ranked.weakness_score desc,
            ranked.accuracy asc,
            ranked.question_count desc,
            ranked.topic_name asc
        )::integer as rank,
        ranked.*
      from ranked_topics as ranked
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'topicId', serialized.topic_id,
          'topicName', serialized.topic_name,
          'blockId', serialized.block_id,
          'blockName', serialized.block_name,
          'rank', serialized.rank,
          'weaknessScore', serialized.weakness_score,
          'confidence', serialized.confidence,
          'questionCount', serialized.question_count,
          'attemptCoverageCount', serialized.attempt_coverage_count,
          'accuracy', serialized.accuracy,
          'averageTimePerQuestion', serialized.average_time_per_question,
          'behaviorFlags', to_jsonb(serialized.behavior_flags),
          'summary',
            case
              when coalesce(array_length(serialized.behavior_flags, 1), 0) = 0
                then format(
                  '%s menjadi subtopik lemah pada rentang ini terutama karena akurasi berada di %s%%.',
                  serialized.topic_name,
                  round(serialized.accuracy, 0)::text
                )
              else format(
                '%s menjadi subtopik lemah pada rentang ini karena akurasi %s%% dan disertai pola %s.',
                serialized.topic_name,
                round(serialized.accuracy, 0)::text,
                array_to_string(
                  array_remove(
                    array[
                      case when 'frequent_ragu' = any(serialized.behavior_flags) then 'sering ragu-ragu' end,
                      case when 'slow_pacing' = any(serialized.behavior_flags) then 'terlalu lama' end,
                      case when 'frequent_answer_changes' = any(serialized.behavior_flags) then 'sering ganti jawaban' end,
                      case when 'correct_to_wrong_switches' = any(serialized.behavior_flags) then 'mengubah benar menjadi salah' end
                    ],
                    null
                  ),
                  ', '
                )
              )
            end
        )
        order by serialized.rank
      ),
      '[]'::jsonb
    )
    into subtopic_rankings
    from serialized_rankings as serialized;
  end if;

  if diagnosis_mode = 'basic' then
    with eligible_snapshots as (
      select snapshot.*
      from public.attempt_diagnostic_snapshots as snapshot
      join public.exam_templates as template
        on template.id = snapshot.exam_template_id
      where snapshot.user_id = target_user_id
        and snapshot.submitted_at >= range_start_utc
        and snapshot.submitted_at < range_end_utc
        and template.diagnostic_source = true
    ),
    observed_topics as (
      select
        topic_snapshot.topic_name,
        sum(topic_snapshot.question_count)::integer as question_count
      from public.attempt_diagnostic_topic_snapshots as topic_snapshot
      join eligible_snapshots as snapshot
        on snapshot.id = topic_snapshot.attempt_snapshot_id
      group by topic_snapshot.topic_name
      order by question_count desc, topic_snapshot.topic_name asc
    )
    select jsonb_build_object(
      'message',
      format(
        'Diagnosis penuh membutuhkan minimal 3 try out besar yang eligible. Rentang ini baru memiliki %s try out.',
        eligible_attempt_count
      ),
      'eligibleAttemptCount', eligible_attempt_count,
      'overallAccuracy', overall_accuracy,
      'observedTopics',
      coalesce((select jsonb_agg(observed.topic_name) from observed_topics as observed), '[]'::jsonb),
      'globalBehaviorPatterns', global_behavior_patterns
    )
    into basic_summary;
  end if;

  if diagnosis_mode = 'full' and jsonb_array_length(subtopic_rankings) > 0 then
    top_topic_name := subtopic_rankings -> 0 ->> 'topicName';
    top_block_name := coalesce(subtopic_rankings -> 0 ->> 'blockName', 'Tanpa blok');
    top_behavior_flags := coalesce(subtopic_rankings -> 0 -> 'behaviorFlags', '[]'::jsonb);
    top_confidence := coalesce(subtopic_rankings -> 0 ->> 'confidence', 'low');

    narrative := jsonb_build_object(
      'headline',
      format(
        'Kelemahan paling konsisten pada rentang ini muncul di %s, terutama %s.',
        top_block_name,
        top_topic_name
      ),
      'body',
      case
        when jsonb_array_length(top_behavior_flags) = 0 then
          format(
            'Akurasi %s paling tertahan pada rentang ini, dengan evidence %s try out submitted yang sudah cukup untuk diagnosis penuh.',
            top_topic_name,
            eligible_attempt_count
          )
        else
          format(
            '%s menjadi subtopik terlemah dengan confidence %s dan didukung pola %s.',
            top_topic_name,
            top_confidence,
            array_to_string(
              array_remove(
                array[
                  case when top_behavior_flags ? 'frequent_ragu' then 'sering ragu-ragu' end,
                  case when top_behavior_flags ? 'slow_pacing' then 'terlalu lama' end,
                  case when top_behavior_flags ? 'frequent_answer_changes' then 'sering ganti jawaban' end,
                  case when top_behavior_flags ? 'correct_to_wrong_switches' then 'mengubah benar menjadi salah' end
                ],
                null
              ),
              ', '
            )
          )
      end,
      'nextReadiness',
      format(
        'Diagnosis penuh ini disusun dari %s try out sumber diagnosis yang submitted pada rentang terpilih.',
        eligible_attempt_count
      )
    );
  elsif diagnosis_mode = 'basic' then
    narrative := jsonb_build_object(
      'headline', 'Data diagnosis belum cukup untuk ranking penuh.',
      'body',
      format(
        'Rentang ini baru memiliki %s try out sumber diagnosis, sehingga backend hanya mengembalikan ringkasan dasar dan pola perilaku global.',
        eligible_attempt_count
      ),
      'nextReadiness', 'Tambah minimal satu try out besar lagi dalam rentang ini agar diagnosis penuh dapat dihitung.'
    );
  else
    narrative := jsonb_build_object(
      'headline', 'Belum ada data diagnosis pada rentang ini.',
      'body', 'Tidak ada try out besar yang submitted dari template sumber diagnosis pada rentang tanggal yang dipilih.',
      'nextReadiness', 'Jalankan try out besar lalu pilih rentang yang memuat hasil submit tersebut untuk melihat diagnosis.'
    );
  end if;

  return jsonb_build_object(
    'summary',
    jsonb_build_object(
      'rangeStart', date_from,
      'rangeEnd', date_to,
      'timezone', safe_timezone,
      'eligibleAttemptCount', eligible_attempt_count,
      'minimumAttemptsMet', minimum_attempts_met,
      'diagnosisMode', diagnosis_mode,
      'overallAccuracy', overall_accuracy,
      'overallAverageTimePerQuestion', overall_average_time_per_question,
      'overallQuestionCount', overall_question_count
    ),
    'globalBehaviorPatterns', global_behavior_patterns,
    'subtopicRankings', subtopic_rankings,
    'basicSummary', basic_summary,
    'narrative', narrative
  );
end;
$$;

revoke all on function public.get_personal_weakness_diagnosis(date, date, text) from public;
grant execute on function public.get_personal_weakness_diagnosis(date, date, text) to authenticated;
grant execute on function public.get_personal_weakness_diagnosis(date, date, text) to service_role;
