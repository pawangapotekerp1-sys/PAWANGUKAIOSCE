-- Migration: Create get_attempt_evidence RPC and supporting indexes for Diagnosis Engine Phase 2
-- Timestamp: 20261027000000

create index if not exists attempts_user_id_submitted_at_idx
  on public.attempts (user_id, submitted_at desc)
  where status = 'submitted';

create or replace function public.get_attempt_evidence(
  date_from date default null,
  date_to date default null,
  user_timezone text default 'UTC',
  limit_attempts integer default null
)
returns table (
  attempt_id uuid,
  submitted_at timestamptz,
  question_id uuid,
  topic_id uuid,
  topic_name text,
  selected_option_key text,
  correct_option_key text,
  is_correct boolean,
  explanation text,
  was_ever_flagged_ragu boolean,
  time_spent_seconds integer,
  time_spent_z_score numeric,
  answer_change_count integer,
  changed_correct_to_wrong_count integer,
  changed_wrong_to_correct_count integer,
  session_position_ratio numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid := auth.uid();
  safe_timezone text := coalesce(nullif(user_timezone, ''), 'UTC');
  range_start_utc timestamptz;
  range_end_utc timestamptz;
begin
  if target_user_id is null then
    raise exception 'Pengguna harus login untuk mengakses data bukti diagnosis.'
      using errcode = '42501';
  end if;

  if limit_attempts is null and (date_from is null or date_to is null) then
    raise exception 'Rentang tanggal diagnosis wajib diisi ketika jumlah try out tidak dibatasi.'
      using errcode = '22023';
  end if;

  if date_from is not null and date_to is not null and date_to < date_from then
    raise exception 'Tanggal akhir diagnosis tidak boleh lebih awal dari tanggal mulai.'
      using errcode = '22007';
  end if;

  if date_from is not null then
    range_start_utc := (date_from::timestamp at time zone safe_timezone);
  end if;
  if date_to is not null then
    range_end_utc := ((date_to + 1)::timestamp at time zone safe_timezone);
  end if;

  return query
  with target_attempts as (
    -- 1. Regular diagnostic tryouts
    select
      att.id,
      att.submitted_at,
      'regular'::text as attempt_type
    from public.attempts as att
    join public.exam_templates as tmpl
      on tmpl.id = att.exam_template_id
    where att.user_id = target_user_id
      and att.status = 'submitted'
      and tmpl.diagnostic_source = true
      and (range_start_utc is null or att.submitted_at >= range_start_utc)
      and (range_end_utc is null or att.submitted_at < range_end_utc)

    union all

    -- 2. Scheduled tryout events (only released when access_end_at has passed)
    select
      sta.id,
      sta.submitted_at,
      'scheduled'::text as attempt_type
    from public.scheduled_tryout_attempts as sta
    join public.scheduled_tryout_events as ste
      on ste.id = sta.event_id
    where sta.user_id = target_user_id
      and sta.status = 'submitted'
      and ste.editorial_status = 'published'
      and timezone('utc', now()) >= ste.access_end_at
      and (range_start_utc is null or sta.submitted_at >= range_start_utc)
      and (range_end_utc is null or sta.submitted_at < range_end_utc)

    order by submitted_at desc
    limit coalesce(limit_attempts, 2147483647)
  ),
  change_event_stats as (
    select
      ace.attempt_item_id,
      count(*) filter (where ace.was_previous_correct = true and ace.is_next_correct = false)::integer as c_to_w,
      count(*) filter (where ace.was_previous_correct = false and ace.is_next_correct = true)::integer as w_to_c
    from public.attempt_answer_change_events as ace
    join target_attempts as ta
      on ta.id = ace.attempt_id
    where ta.attempt_type = 'regular'
    group by ace.attempt_item_id
  ),
  scoped_items as (
    -- Regular attempt items
    select
      ta.id as attempt_id,
      ta.submitted_at,
      ai.id as attempt_item_id,
      ai.question_id,
      ai.topic_id,
      coalesce(top.name, 'Tanpa Topik') as topic_name,
      ans.selected_option_key,
      ai.correct_option_key,
      (ans.selected_option_key is not null and ans.selected_option_key = ai.correct_option_key) as is_correct,
      qe.explanation,
      coalesce(bm.was_ever_flagged_ragu, ans.is_doubtful, false) as was_ever_flagged_ragu,
      coalesce(bm.time_spent_seconds, 0)::integer as time_spent_seconds,
      coalesce(bm.answer_change_count, 0)::integer as answer_change_count,
      coalesce(ces.c_to_w, bm.changed_correct_to_wrong_count, 0)::integer as changed_correct_to_wrong_count,
      coalesce(ces.w_to_c, 0)::integer as changed_wrong_to_correct_count,
      ai.sort_order,
      count(*) over (partition by ta.id)::integer as attempt_total_items
    from target_attempts as ta
    join public.attempt_items as ai
      on ai.attempt_id = ta.id
    left join public.topics as top
      on top.id = ai.topic_id
    left join public.answers as ans
      on ans.attempt_item_id = ai.id
    left join public.attempt_item_behavior_metrics as bm
      on bm.attempt_item_id = ai.id
    left join change_event_stats as ces
      on ces.attempt_item_id = ai.id
    left join public.question_explanations as qe
      on qe.question_id = ai.question_id
    where ta.attempt_type = 'regular'

    union all

    -- Scheduled attempt items (keys and explanations available only post-event)
    select
      ta.id as attempt_id,
      ta.submitted_at,
      sai.id as attempt_item_id,
      sai.event_question_id as question_id,
      sai.topic_id_snapshot as topic_id,
      coalesce(top.name, 'Tanpa Topik') as topic_name,
      sans.selected_option_key,
      sai.correct_option_key_snapshot as correct_option_key,
      (sans.selected_option_key is not null and sans.selected_option_key = sai.correct_option_key_snapshot) as is_correct,
      sai.explanation_text_snapshot as explanation,
      coalesce(sans.is_doubtful, false) as was_ever_flagged_ragu,
      0::integer as time_spent_seconds,
      0::integer as answer_change_count,
      0::integer as changed_correct_to_wrong_count,
      0::integer as changed_wrong_to_correct_count,
      sai.sort_order,
      count(*) over (partition by ta.id)::integer as attempt_total_items
    from target_attempts as ta
    join public.scheduled_tryout_attempt_items as sai
      on sai.attempt_id = ta.id
    left join public.topics as top
      on top.id = sai.topic_id_snapshot
    left join public.scheduled_tryout_answers as sans
      on sans.attempt_item_id = sai.id
    where ta.attempt_type = 'scheduled'
  ),
  timing_stats as (
    select
      coalesce(avg(si.time_spent_seconds), 0)::numeric as avg_time,
      coalesce(stddev_pop(si.time_spent_seconds), 0)::numeric as std_time
    from scoped_items as si
  )
  select
    si.attempt_id,
    si.submitted_at,
    si.question_id,
    si.topic_id,
    si.topic_name,
    si.selected_option_key,
    si.correct_option_key,
    si.is_correct,
    si.explanation,
    si.was_ever_flagged_ragu,
    si.time_spent_seconds,
    round(
      case
        when ts.std_time = 0 then 0.0
        else (si.time_spent_seconds - ts.avg_time) / ts.std_time
      end,
      2
    ) as time_spent_z_score,
    si.answer_change_count,
    si.changed_correct_to_wrong_count,
    si.changed_wrong_to_correct_count,
    round(
      case
        when si.attempt_total_items <= 1 then 0.0
        else (si.sort_order - 1)::numeric / (si.attempt_total_items - 1)::numeric
      end,
      4
    ) as session_position_ratio
  from scoped_items as si
  cross join timing_stats as ts
  order by si.submitted_at desc, si.sort_order asc;
end;
$$;

revoke all on function public.get_attempt_evidence(date, date, text, integer) from public, anon;
grant execute on function public.get_attempt_evidence(date, date, text, integer) to authenticated;
grant execute on function public.get_attempt_evidence(date, date, text, integer) to service_role;
