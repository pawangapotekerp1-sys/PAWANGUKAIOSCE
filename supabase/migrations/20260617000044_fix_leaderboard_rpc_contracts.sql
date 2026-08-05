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
      and profiles.role = 'pro'
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

notify pgrst, 'reload schema';
