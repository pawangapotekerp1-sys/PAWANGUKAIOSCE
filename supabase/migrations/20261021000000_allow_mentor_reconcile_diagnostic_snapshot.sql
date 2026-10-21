-- Allow mentors/question bank managers to reconcile diagnostic snapshots during answer key sync
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
        or public.can_manage_question_bank()
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

revoke all on function public.rebuild_attempt_diagnostic_snapshot(uuid) from public, anon;
grant execute on function public.rebuild_attempt_diagnostic_snapshot(uuid) to authenticated;
grant execute on function public.rebuild_attempt_diagnostic_snapshot(uuid) to service_role;
