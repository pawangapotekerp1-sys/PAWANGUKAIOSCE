-- Fix leaderboard filters: include osce_pro role and remove top-10 limit

-- 1. Fix get_scheduled_event_leaderboard: include osce_pro
create or replace function public.get_scheduled_event_leaderboard(
  target_event_id uuid,
  target_event_cycle integer default null
)
returns table (
  rank bigint,
  event_id uuid,
  event_cycle integer,
  user_id uuid,
  alias text,
  best_score numeric(5,2),
  best_score_attempt_number integer,
  attempt_id uuid,
  submitted_at timestamptz,
  leaderboard_state text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  event_row public.scheduled_tryout_events%rowtype;
  resolved_event_cycle integer;
begin
  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_event_id
    and editorial_status = 'published';

  if not found then
    raise exception 'Event try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  select current_cycle
  into resolved_event_cycle
  from public.scheduled_tryout_events
  where id = target_event_id;

  resolved_event_cycle := coalesce(target_event_cycle, resolved_event_cycle);

  return query
  with event_context as (
    select
      event.id,
      resolved_event_cycle as event_cycle,
      case
        when timezone('utc', now()) < event.access_end_at then 'live'
        else 'final'
      end as leaderboard_state
    from public.scheduled_tryout_events as event
    where event.id = target_event_id
  ),
  submitted_attempts as (
    select
      attempt.id,
      attempt.event_id,
      attempt.event_cycle,
      attempt.user_id,
      attempt.submitted_at,
      result.score_percentage::numeric(5,2) as score_percentage,
      coalesce(
        nullif(profiles.leaderboard_alias, ''),
        'Apoteker-' || upper(substr(replace(attempt.user_id::text, '-', ''), 1, 4))
      ) as alias
    from public.scheduled_tryout_attempts as attempt
    join public.scheduled_tryout_attempt_results as result
      on result.attempt_id = attempt.id
    join public.profiles as profiles
      on profiles.id = attempt.user_id
    join event_context
      on event_context.id = attempt.event_id
      and event_context.event_cycle = attempt.event_cycle
    where attempt.status = 'submitted'
      and attempt.submitted_at is not null
      and profiles.role in ('pro', 'osce_pro')
  ),
  attempt_numbered as (
    select
      attempt.id,
      attempt.event_id,
      attempt.event_cycle,
      attempt.user_id,
      attempt.submitted_at,
      attempt.score_percentage,
      attempt.alias,
      row_number() over (
        partition by attempt.user_id
        order by attempt.submitted_at asc, attempt.id asc
      ) as attempt_number
    from submitted_attempts as attempt
  ),
  best_score_per_user as (
    select
      attempt.user_id,
      max(attempt.score_percentage)::numeric(5,2) as best_score
    from attempt_numbered as attempt
    group by attempt.user_id
  ),
  first_best_score_attempt as (
    select
      attempt.event_id,
      attempt.event_cycle,
      attempt.user_id,
      attempt.alias,
      best_score_per_user.best_score,
      attempt.attempt_number::integer as best_score_attempt_number,
      attempt.id as attempt_id,
      attempt.submitted_at,
      row_number() over (
        partition by attempt.user_id
        order by attempt.attempt_number asc, attempt.submitted_at asc, attempt.id asc
      ) as best_row
    from attempt_numbered as attempt
    join best_score_per_user
      on best_score_per_user.user_id = attempt.user_id
     and best_score_per_user.best_score = attempt.score_percentage
  ),
  ranked_rows as (
    select
      dense_rank() over (
        order by
          first_best_score_attempt.best_score desc,
          first_best_score_attempt.best_score_attempt_number asc
      ) as rank,
      first_best_score_attempt.event_id,
      first_best_score_attempt.event_cycle,
      first_best_score_attempt.user_id,
      first_best_score_attempt.alias,
      first_best_score_attempt.best_score,
      first_best_score_attempt.best_score_attempt_number,
      first_best_score_attempt.attempt_id,
      first_best_score_attempt.submitted_at
    from first_best_score_attempt
    where first_best_score_attempt.best_row = 1
  )
  select
    ranked_rows.rank,
    ranked_rows.event_id,
    ranked_rows.event_cycle,
    ranked_rows.user_id,
    ranked_rows.alias,
    ranked_rows.best_score,
    ranked_rows.best_score_attempt_number,
    ranked_rows.attempt_id,
    ranked_rows.submitted_at,
    event_context.leaderboard_state
  from ranked_rows
  cross join event_context
  order by
    ranked_rows.rank asc,
    ranked_rows.best_score desc,
    ranked_rows.best_score_attempt_number asc,
    ranked_rows.submitted_at asc,
    ranked_rows.attempt_id asc;
end;
$$;

revoke all on function public.get_scheduled_event_leaderboard(uuid, integer) from public;
grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to authenticated;
grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to service_role;


-- 2. Fix get_leaderboard: include osce_pro role AND remove top-10 limit
create or replace function public.get_leaderboard(target_category text default 'overall')
returns table (
  rank bigint,
  user_id uuid,
  alias text,
  score numeric(5,2),
  time_used_seconds integer,
  attempt_id uuid,
  submitted_at timestamptz,
  category text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_category text := lower(coalesce(target_category, 'overall'));
  target_block_name text;
begin
  if normalized_category = 'overall' then
    target_block_name := null;
  elsif normalized_category = 'clinical_science' then
    target_block_name := 'Clinical Science';
  elsif normalized_category = 'social_behavior_administrative_pharmacy' then
    target_block_name := 'Social, Behavioral & Administrative Pharmacy';
  elsif normalized_category = 'pharmaceutical_science' then
    target_block_name := 'Pharmaceutical Science';
  else
    raise exception 'Kategori leaderboard tidak valid.'
      using errcode = '22023';
  end if;

  return query
  with overall_attempt_scores as (
    select
      attempt.user_id,
      coalesce(
        nullif(profiles.leaderboard_alias, ''),
        'Apoteker-' || upper(substr(replace(attempt.user_id::text, '-', ''), 1, 4))
      ) as alias,
      attempt_result.score::numeric(5, 2) as score,
      attempt_result.time_used_seconds,
      attempt.id as attempt_id,
      attempt.submitted_at
    from public.attempts as attempt
    join public.attempt_results as attempt_result
      on attempt_result.attempt_id = attempt.id
    join public.profiles as profiles
      on profiles.id = attempt.user_id
    where attempt.status = 'submitted'
      and attempt.submitted_at is not null
      and profiles.role in ('pro', 'osce_pro')
  ),
  block_attempt_scores as (
    select
      attempt.user_id,
      coalesce(
        nullif(profiles.leaderboard_alias, ''),
        'Apoteker-' || upper(substr(replace(attempt.user_id::text, '-', ''), 1, 4))
      ) as alias,
      round(
        (
          count(*) filter (
            where answer.selected_option_key = item.correct_option_key
          )::numeric
          / count(*)::numeric
        ) * 100,
        2
      )::numeric(5, 2) as score,
      attempt_result.time_used_seconds,
      attempt.id as attempt_id,
      attempt.submitted_at
    from public.attempt_items as item
    join public.attempts as attempt
      on attempt.id = item.attempt_id
    join public.attempt_results as attempt_result
      on attempt_result.attempt_id = attempt.id
    join public.profiles as profiles
      on profiles.id = attempt.user_id
    left join public.answers as answer
      on answer.attempt_item_id = item.id
    where attempt.status = 'submitted'
      and attempt.submitted_at is not null
      and profiles.role in ('pro', 'osce_pro')
      and item.block_name = target_block_name
    group by
      attempt.user_id,
      profiles.leaderboard_alias,
      attempt_result.time_used_seconds,
      attempt.id,
      attempt.submitted_at
  ),
  candidate_scores as (
    select
      overall_attempt_scores.user_id,
      overall_attempt_scores.alias,
      overall_attempt_scores.score,
      overall_attempt_scores.time_used_seconds,
      overall_attempt_scores.attempt_id,
      overall_attempt_scores.submitted_at
    from overall_attempt_scores
    where normalized_category = 'overall'

    union all

    select
      block_attempt_scores.user_id,
      block_attempt_scores.alias,
      block_attempt_scores.score,
      block_attempt_scores.time_used_seconds,
      block_attempt_scores.attempt_id,
      block_attempt_scores.submitted_at
    from block_attempt_scores
    where normalized_category <> 'overall'
  ),
  best_per_user as (
    select
      candidate_scores.user_id,
      candidate_scores.alias,
      candidate_scores.score,
      candidate_scores.time_used_seconds,
      candidate_scores.attempt_id,
      candidate_scores.submitted_at,
      row_number() over (
        partition by candidate_scores.user_id
        order by
          candidate_scores.score desc,
          candidate_scores.time_used_seconds asc,
          candidate_scores.submitted_at asc,
          candidate_scores.attempt_id asc
      ) as best_row
    from candidate_scores
  ),
  ranked_scores as (
    select
      dense_rank() over (
        order by
          best_per_user.score desc,
          best_per_user.time_used_seconds asc
      ) as rank,
      best_per_user.user_id,
      best_per_user.alias,
      best_per_user.score,
      best_per_user.time_used_seconds,
      best_per_user.attempt_id,
      best_per_user.submitted_at,
      normalized_category as category
    from best_per_user
    where best_per_user.best_row = 1
  )
  select
    ranked_scores.rank,
    ranked_scores.user_id,
    ranked_scores.alias,
    ranked_scores.score,
    ranked_scores.time_used_seconds,
    ranked_scores.attempt_id,
    ranked_scores.submitted_at,
    ranked_scores.category
  from ranked_scores
  order by
    ranked_scores.rank asc,
    ranked_scores.score desc,
    ranked_scores.time_used_seconds asc,
    ranked_scores.submitted_at asc,
    ranked_scores.attempt_id asc;
end;
$$;

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.get_leaderboard(text) to service_role;

notify pgrst, 'reload schema';
