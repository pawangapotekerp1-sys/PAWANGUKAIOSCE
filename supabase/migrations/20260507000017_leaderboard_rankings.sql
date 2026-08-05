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
      and profiles.role = 'pro'
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
      and profiles.role = 'pro'
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
      normalized_category as category,
      row_number() over (
        order by
          best_per_user.score desc,
          best_per_user.time_used_seconds asc,
          best_per_user.submitted_at asc,
          best_per_user.attempt_id asc
      ) as leaderboard_row
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
  where ranked_scores.leaderboard_row <= 10
  order by ranked_scores.leaderboard_row
  limit 10;
end;
$$;

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.get_leaderboard(text) to service_role;
