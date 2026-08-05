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

  answer_option_changed := found
    and existing_answer.selected_option_key is not null
    and existing_answer.selected_option_key is distinct from selected_option_key;
  previous_was_correct := coalesce(existing_answer.selected_option_key = target_item.correct_option_key, false);
  next_is_correct := coalesce(selected_option_key = target_item.correct_option_key, false);

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
