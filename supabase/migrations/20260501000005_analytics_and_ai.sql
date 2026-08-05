create or replace view public.user_block_performance
with (security_invoker = true)
as
select
  attempt.user_id,
  item.block_id,
  item.block_name,
  count(*)::integer as total_questions,
  count(*) filter (
    where answer.selected_option_key = item.correct_option_key
  )::integer as correct_answers,
  count(*) filter (
    where answer.selected_option_key is not null
      and answer.selected_option_key <> item.correct_option_key
  )::integer as wrong_answers,
  count(*) filter (
    where answer.selected_option_key is null
  )::integer as unanswered_count,
  round(
    (
      count(*) filter (
        where answer.selected_option_key = item.correct_option_key
      )::numeric / nullif(count(*)::numeric, 0)
    ) * 100,
    2
  ) as accuracy,
  max(attempt.submitted_at) as latest_submitted_at
from public.attempts as attempt
join public.attempt_items as item
  on item.attempt_id = attempt.id
left join public.answers as answer
  on answer.attempt_item_id = item.id
where attempt.status = 'submitted'
group by
  attempt.user_id,
  item.block_id,
  item.block_name;

create or replace view public.user_topic_performance
with (security_invoker = true)
as
select
  attempt.user_id,
  item.topic_id,
  coalesce(topic.name, 'Tanpa topik') as topic_name,
  item.block_id,
  item.block_name,
  count(*)::integer as total_questions,
  count(*) filter (
    where answer.selected_option_key = item.correct_option_key
  )::integer as correct_answers,
  count(*) filter (
    where answer.selected_option_key is not null
      and answer.selected_option_key <> item.correct_option_key
  )::integer as wrong_answers,
  count(*) filter (
    where answer.selected_option_key is null
  )::integer as unanswered_count,
  round(
    (
      count(*) filter (
        where answer.selected_option_key = item.correct_option_key
      )::numeric / nullif(count(*)::numeric, 0)
    ) * 100,
    2
  ) as accuracy,
  max(attempt.submitted_at) as latest_submitted_at
from public.attempts as attempt
join public.attempt_items as item
  on item.attempt_id = attempt.id
left join public.answers as answer
  on answer.attempt_item_id = item.id
left join public.topics as topic
  on topic.id = item.topic_id
where attempt.status = 'submitted'
  and item.topic_id is not null
group by
  attempt.user_id,
  item.topic_id,
  topic.name,
  item.block_id,
  item.block_name;

create or replace view public.user_recent_attempt_summaries
with (security_invoker = true)
as
select
  attempt.user_id,
  attempt.id as attempt_id,
  template.title as attempt_title,
  template.mode as attempt_mode,
  attempt.submitted_at,
  result.score,
  result.correct_answers,
  result.wrong_answers,
  result.unanswered_count,
  result.time_used_seconds,
  result.block_summary,
  (
    select summary_item ->> 'name'
    from jsonb_array_elements(result.block_summary) as summary_item
    order by
      coalesce((summary_item ->> 'wrong')::integer, 0) desc,
      coalesce((summary_item ->> 'correct')::integer, 0) asc
    limit 1
  ) as weakest_block_name
from public.attempts as attempt
join public.exam_templates as template
  on template.id = attempt.exam_template_id
join public.attempt_results as result
  on result.attempt_id = attempt.id
where attempt.status = 'submitted'
  and attempt.submitted_at is not null;
