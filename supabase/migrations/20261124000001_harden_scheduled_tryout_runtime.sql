-- Migration: Harden scheduled tryout runtime RPCs against deadlocks, write amplification,
--            client clock skew, and duration/max_attempts schema drift.

create or replace function public.get_server_now()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select timezone('utc', now());
$$;

revoke all on function public.get_server_now() from public, anon;
grant execute on function public.get_server_now() to authenticated, service_role;

create or replace function public.sync_scheduled_tryout_attempt(
  target_attempt_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  synced_attempt public.scheduled_tryout_attempts%rowtype;
  event_duration_minutes integer;
  question_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyinkronkan try out terjadwal.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status in ('submitted', 'abandoned') then
    return target_attempt;
  end if;

  delete from public.scheduled_tryout_attempt_items
  where id in (
    select attempt_item.id
    from public.scheduled_tryout_attempt_items as attempt_item
    left join public.scheduled_tryout_answers as existing_answer
      on existing_answer.attempt_item_id = attempt_item.id
    where attempt_item.attempt_id = target_attempt.id
      and attempt_item.event_question_id is null
      and attempt_item.opened_at is null
      and existing_answer.id is null
  );

  with current_event_questions as (
    select
      event_question.id,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',
            option.option_key,
            'text',
            option.option_text
          )
          order by option.sort_order
        ) filter (where option.id is not null),
        '[]'::jsonb
      ) as options_snapshot
    from public.scheduled_tryout_event_questions as event_question
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = target_attempt.event_id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path
  )
  update public.scheduled_tryout_attempt_items as attempt_item
  set
    event_question_id = current_question.id,
    question_snapshot = current_question.stem,
    options_snapshot = current_question.options_snapshot,
    correct_option_key_snapshot = current_question.correct_option_key,
    block_id_snapshot = current_question.block_id,
    topic_id_snapshot = current_question.topic_id,
    question_image_path_snapshot = current_question.question_image_path,
    explanation_text_snapshot = current_question.explanation_text,
    explanation_image_path_snapshot = current_question.explanation_image_path
  from current_event_questions as current_question
  where attempt_item.attempt_id = target_attempt.id
    and attempt_item.event_question_id = current_question.id;

  insert into public.scheduled_tryout_attempt_items (
    attempt_id,
    event_question_id,
    sort_order,
    question_snapshot,
    options_snapshot,
    correct_option_key_snapshot,
    block_id_snapshot,
    topic_id_snapshot,
    question_image_path_snapshot,
    explanation_text_snapshot,
    explanation_image_path_snapshot
  )
  with current_event_questions as (
    select
      event_question.id,
      row_number() over (
        order by event_question.question_order, event_question.id
      ) as insert_rank,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',
            option.option_key,
            'text',
            option.option_text
          )
          order by option.sort_order
        ) filter (where option.id is not null),
        '[]'::jsonb
      ) as options_snapshot
    from public.scheduled_tryout_event_questions as event_question
    left join public.scheduled_tryout_event_question_options as option
      on option.event_question_id = event_question.id
    where event_question.event_id = target_attempt.event_id
    group by
      event_question.id,
      event_question.question_order,
      event_question.stem,
      event_question.correct_option_key,
      event_question.block_id,
      event_question.topic_id,
      event_question.question_image_path,
      event_question.explanation_text,
      event_question.explanation_image_path
  ),
  current_sort_baseline as (
    select coalesce(max(sort_order), 0) as max_sort_order
    from public.scheduled_tryout_attempt_items
    where attempt_id = target_attempt.id
  )
  select
    target_attempt.id,
    current_question.id,
    current_sort_baseline.max_sort_order + current_question.insert_rank,
    current_question.stem,
    current_question.options_snapshot,
    current_question.correct_option_key,
    current_question.block_id,
    current_question.topic_id,
    current_question.question_image_path,
    current_question.explanation_text,
    current_question.explanation_image_path
  from current_event_questions as current_question
  cross join current_sort_baseline
  where not exists (
    select 1
    from public.scheduled_tryout_attempt_items as attempt_item
    where attempt_item.attempt_id = target_attempt.id
      and attempt_item.event_question_id = current_question.id
  );

  with rerank_shift as (
    select
      attempt_item.id,
      baseline.max_sort_order
      + row_number() over (
        order by coalesce(event_question.question_order, attempt_item.sort_order), attempt_item.created_at, attempt_item.id
      ) as temp_sort_order
    from public.scheduled_tryout_attempt_items as attempt_item
    cross join (
      select coalesce(max(sort_order), 0) as max_sort_order
      from public.scheduled_tryout_attempt_items
      where attempt_id = target_attempt.id
    ) as baseline
    left join public.scheduled_tryout_event_questions as event_question
      on event_question.id = attempt_item.event_question_id
    where attempt_item.attempt_id = target_attempt.id
  )
  update public.scheduled_tryout_attempt_items as attempt_item
  set sort_order = rerank_shift.temp_sort_order
  from rerank_shift
  where attempt_item.id = rerank_shift.id;

  with ranked_attempt_items as (
    select
      attempt_item.id,
      row_number() over (
        order by coalesce(event_question.question_order, attempt_item.sort_order), attempt_item.created_at, attempt_item.id
      ) as next_sort_order
    from public.scheduled_tryout_attempt_items as attempt_item
    left join public.scheduled_tryout_event_questions as event_question
      on event_question.id = attempt_item.event_question_id
    where attempt_item.attempt_id = target_attempt.id
  )
  update public.scheduled_tryout_attempt_items as attempt_item
  set sort_order = ranked_attempt_item.next_sort_order
  from ranked_attempt_items as ranked_attempt_item
  where attempt_item.id = ranked_attempt_item.id;

  select count(*)::integer
  into question_count
  from public.scheduled_tryout_attempt_items
  where attempt_id = target_attempt.id;

  select duration_minutes
  into event_duration_minutes
  from public.scheduled_tryout_events
  where id = target_attempt.event_id;

  update public.scheduled_tryout_attempts
  set
    total_questions = question_count,
    time_limit_seconds = greatest(0, coalesce(event_duration_minutes, question_count)) * 60
  where id = target_attempt.id
  returning *
  into synced_attempt;

  return synced_attempt;
end;
$$;

revoke all on function public.sync_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.sync_scheduled_tryout_attempt(uuid) to authenticated, service_role;

create or replace function public.save_scheduled_tryout_answer(
  target_attempt_id uuid,
  target_attempt_item_id uuid,
  selected_option_key text,
  is_doubtful boolean default false
)
returns public.scheduled_tryout_answers
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.scheduled_tryout_attempts%rowtype;
  target_item public.scheduled_tryout_attempt_items%rowtype;
  answer_row public.scheduled_tryout_answers%rowtype;
  answer_time timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyimpan jawaban.'
      using errcode = '42501';
  end if;

  select *
  into target_attempt
  from public.scheduled_tryout_attempts
  where id = target_attempt_id
    and user_id = auth.uid()
  for share;

  if not found then
    raise exception 'Attempt try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'in_progress' then
    raise exception 'Attempt try out terjadwal hanya bisa dijawab saat sesi sedang berjalan.'
      using errcode = 'P0001';
  end if;

  select *
  into target_item
  from public.scheduled_tryout_attempt_items
  where id = target_attempt_item_id
    and attempt_id = target_attempt.id;

  if not found then
    raise exception 'Item soal try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  update public.scheduled_tryout_attempt_items
  set opened_at = coalesce(opened_at, answer_time)
  where id = target_item.id;

  insert into public.scheduled_tryout_answers (
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
    coalesce(is_doubtful, false),
    case
      when selected_option_key is null then null
      else answer_time
    end
  )
  on conflict (attempt_item_id) do update
  set
    selected_option_key = excluded.selected_option_key,
    is_doubtful = excluded.is_doubtful,
    answered_at = case
      when excluded.selected_option_key is null then null
      else answer_time
    end,
    updated_at = answer_time
  returning *
  into answer_row;

  return answer_row;
end;
$$;

revoke all on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.save_scheduled_tryout_answer(uuid, uuid, text, boolean) to authenticated, service_role;

create or replace function public.start_scheduled_tryout_attempt(
  target_event_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
as $body$
declare
  event_row public.scheduled_tryout_events%rowtype;
  active_attempt public.scheduled_tryout_attempts%rowtype;
  created_attempt public.scheduled_tryout_attempts%rowtype;
  submitted_attempt_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum memulai try out terjadwal.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('pro', 'mentor', 'osce_pro')
  ) then
    raise exception 'Akses mulai try out terjadwal hanya tersedia untuk pengguna pro, osce_pro, atau mentor.'
      using errcode = '42501';
  end if;

  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_event_id
    and editorial_status = 'published'
    and access_start_at <= timezone('utc', now())
    and access_end_at > timezone('utc', now());

  if not found then
    raise exception 'Event try out terjadwal tidak aktif atau belum dipublikasikan.'
      using errcode = 'P0002';
  end if;

  select *
  into active_attempt
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status in ('in_progress', 'paused')
  order by created_at desc, id desc
  limit 1;

  if found then
    perform public.sync_scheduled_tryout_attempt(active_attempt.id);

    select *
    into active_attempt
    from public.scheduled_tryout_attempts
    where id = active_attempt.id;

    return active_attempt;
  end if;

  select count(*)
  into submitted_attempt_count
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status = 'submitted';

  if submitted_attempt_count >= coalesce(event_row.max_attempts, 8) then
    raise exception 'Batas attempt untuk event try out terjadwal ini sudah habis.'
      using errcode = 'P0001';
  end if;

  begin
    insert into public.scheduled_tryout_attempts (
      event_id,
      event_cycle,
      user_id,
      status,
      started_at,
      time_limit_seconds,
      elapsed_seconds,
      last_resumed_at,
      paused_at,
      total_questions
    )
    values (
      event_row.id,
      event_row.current_cycle,
      auth.uid(),
      'in_progress',
      timezone('utc', now()),
      0,
      0,
      timezone('utc', now()),
      null,
      0
    )
    returning *
    into created_attempt;
  exception
    when unique_violation then
      select *
      into active_attempt
      from public.scheduled_tryout_attempts
      where event_id = event_row.id
        and event_cycle = event_row.current_cycle
        and user_id = auth.uid()
        and status in ('in_progress', 'paused')
      order by created_at desc, id desc
      limit 1;

      if found then
        perform public.sync_scheduled_tryout_attempt(active_attempt.id);

        select *
        into active_attempt
        from public.scheduled_tryout_attempts
        where id = active_attempt.id;

        return active_attempt;
      end if;

      raise;
  end;

  perform public.sync_scheduled_tryout_attempt(created_attempt.id);

  select *
  into created_attempt
  from public.scheduled_tryout_attempts
  where id = created_attempt.id;

  return created_attempt;
end;
$body$;

revoke all on function public.start_scheduled_tryout_attempt(uuid) from public, anon;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to authenticated, service_role;
