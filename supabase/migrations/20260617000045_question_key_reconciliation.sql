create or replace function public.rebuild_attempt_result(
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
  time_used_seconds_value integer;
begin
  select *
  into target_attempt
  from public.attempts
  where id = target_attempt_id;

  if not found then
    raise exception 'Attempt try out tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'submitted' or target_attempt.submitted_at is null then
    delete from public.attempt_results
    where attempt_id = target_attempt.id
    returning *
    into result_row;

    perform public.rebuild_attempt_diagnostic_snapshot(target_attempt.id);

    return result_row;
  end if;

  time_used_seconds_value := greatest(
    0,
    least(
      target_attempt.time_limit_seconds,
      coalesce(target_attempt.elapsed_seconds, 0)
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

  perform public.rebuild_attempt_diagnostic_snapshot(target_attempt.id);

  return result_row;
end;
$$;

create or replace function public.sync_question_bank_answer_key(
  target_question_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_attempt record;
  affected_attempt_count integer := 0;
begin
  if target_question_id is null then
    return 0;
  end if;

  if not exists (
    select 1
    from public.question_options as option
    where option.question_id = target_question_id
    group by option.question_id
    having count(*) >= 2
      and bool_or(option.is_correct)
  ) then
    return 0;
  end if;

  with question_snapshot as (
    select
      option.question_id,
      max(option.option_key) filter (where option.is_correct) as correct_option_key
    from public.question_options as option
    where option.question_id = target_question_id
    group by option.question_id
    having count(*) >= 2
      and bool_or(option.is_correct)
  )
  update public.attempt_items as attempt_item
  set correct_option_key = question_snapshot.correct_option_key
  from question_snapshot
  where attempt_item.question_id = question_snapshot.question_id
    and attempt_item.correct_option_key is distinct from question_snapshot.correct_option_key;

  update public.attempt_answer_change_events as change_event
  set
    was_previous_correct = coalesce(change_event.previous_option_key = attempt_item.correct_option_key, false),
    is_next_correct = coalesce(change_event.next_option_key = attempt_item.correct_option_key, false)
  from public.attempt_items as attempt_item
  where attempt_item.id = change_event.attempt_item_id
    and attempt_item.question_id = target_question_id
    and (
      change_event.was_previous_correct is distinct from coalesce(change_event.previous_option_key = attempt_item.correct_option_key, false)
      or change_event.is_next_correct is distinct from coalesce(change_event.next_option_key = attempt_item.correct_option_key, false)
    );

  update public.attempt_item_behavior_metrics as metric
  set changed_correct_to_wrong_count = coalesce(
    (
      select count(*)::integer
      from public.attempt_answer_change_events as change_event
      join public.attempt_items as attempt_item
        on attempt_item.id = change_event.attempt_item_id
      where change_event.attempt_item_id = metric.attempt_item_id
        and attempt_item.question_id = target_question_id
        and coalesce(change_event.previous_option_key = attempt_item.correct_option_key, false)
        and change_event.next_option_key is not null
        and change_event.next_option_key <> attempt_item.correct_option_key
    ),
    0
  )
  where exists (
    select 1
    from public.attempt_items as attempt_item
    where attempt_item.id = metric.attempt_item_id
      and attempt_item.question_id = target_question_id
  );

  for affected_attempt in
    select distinct attempt.id
    from public.attempts as attempt
    join public.attempt_items as attempt_item
      on attempt_item.attempt_id = attempt.id
    where attempt_item.question_id = target_question_id
      and attempt.status = 'submitted'
      and attempt.submitted_at is not null
  loop
    affected_attempt_count := affected_attempt_count + 1;
    perform public.rebuild_attempt_result(affected_attempt.id);
  end loop;

  return affected_attempt_count;
end;
$$;

create or replace function public.handle_question_option_answer_key_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_question_bank_answer_key(coalesce(new.question_id, old.question_id));

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_question_bank_answer_key_on_question_options on public.question_options;

create trigger sync_question_bank_answer_key_on_question_options
after insert or update or delete on public.question_options
for each row
execute function public.handle_question_option_answer_key_change();

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

  select *
  into result_row
  from public.rebuild_attempt_result(target_attempt.id);

  return result_row;
end;
$$;

revoke all on function public.submit_attempt(uuid) from public, anon;
grant execute on function public.submit_attempt(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid) to service_role;

do $$
declare
  stale_question record;
begin
  for stale_question in
    with live_questions as (
      select
        option.question_id,
        max(option.option_key) filter (where option.is_correct) as correct_option_key
      from public.question_options as option
      group by option.question_id
      having count(*) >= 2
        and bool_or(option.is_correct)
    )
    select distinct attempt_item.question_id
    from public.attempt_items as attempt_item
    join live_questions as live_question
      on live_question.question_id = attempt_item.question_id
    where attempt_item.correct_option_key is distinct from live_question.correct_option_key
  loop
    perform public.sync_question_bank_answer_key(stale_question.question_id);
  end loop;
end;
$$;
