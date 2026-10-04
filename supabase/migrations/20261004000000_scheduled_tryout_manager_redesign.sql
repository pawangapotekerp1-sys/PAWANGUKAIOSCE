alter table public.scheduled_tryout_events
add column total_questions integer not null default 100,
add column duration_minutes integer not null default 100,
add column max_attempts integer not null default 1;

create or replace function public.upsert_scheduled_tryout_event(
  target_event_id uuid,
  payload jsonb
)
returns public.scheduled_tryout_events
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_event public.scheduled_tryout_events%rowtype;
  incoming_existing_question_ids uuid[] := '{}'::uuid[];
  question_payload jsonb;
  current_question_id uuid;
  current_block_id uuid;
  current_topic_id uuid;
  next_question_order integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyimpan event try out terjadwal.'
      using errcode = '42501';
  end if;

  if not public.can_manage_scheduled_tryouts() then
    raise exception 'Akses kelola event try out terjadwal hanya tersedia untuk mentor atau admin.'
      using errcode = '42501';
  end if;

  if payload is null then
    raise exception 'Payload event try out terjadwal tidak boleh kosong.'
      using errcode = 'P0001';
  end if;

  if target_event_id is null then
    insert into public.scheduled_tryout_events (
      title,
      description,
      editorial_status,
      access_start_at,
      access_end_at,
      created_by,
      updated_by,
      total_questions,
      duration_minutes,
      max_attempts
    )
    values (
      payload->>'title',
      coalesce(payload->>'description', ''),
      payload->>'editorialStatus',
      (payload->>'accessStartAt')::timestamptz,
      (payload->>'accessEndAt')::timestamptz,
      nullif(payload->>'createdBy', '')::uuid,
      coalesce(nullif(payload->>'updatedBy', '')::uuid, nullif(payload->>'createdBy', '')::uuid),
      coalesce((payload->>'totalQuestions')::integer, 100),
      coalesce((payload->>'durationMinutes')::integer, 100),
      coalesce((payload->>'maxAttempts')::integer, 1)
    )
    returning *
    into saved_event;
  else
    update public.scheduled_tryout_events
    set
      title = payload->>'title',
      description = coalesce(payload->>'description', ''),
      editorial_status = payload->>'editorialStatus',
      access_start_at = (payload->>'accessStartAt')::timestamptz,
      access_end_at = (payload->>'accessEndAt')::timestamptz,
      updated_by = nullif(payload->>'updatedBy', '')::uuid,
      total_questions = coalesce((payload->>'totalQuestions')::integer, 100),
      duration_minutes = coalesce((payload->>'durationMinutes')::integer, 100),
      max_attempts = coalesce((payload->>'maxAttempts')::integer, 1)
    where id = target_event_id
    returning *
    into saved_event;

    if not found then
      raise exception 'Event try out terjadwal tidak ditemukan.'
        using errcode = 'P0002';
    end if;
  end if;

  -- Jika payload tidak mengandung field 'questions', berarti upsert hanya untuk metadata. Skip logika questions.
  if payload ? 'questions' then
    select coalesce(array_agg(nullif(question_item->>'id', '')::uuid), '{}'::uuid[])
    into incoming_existing_question_ids
    from jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb)) as question(question_item)
    where nullif(question_item->>'id', '') is not null;

    delete from public.scheduled_tryout_event_questions
    where event_id = saved_event.id
      and not (id = any(incoming_existing_question_ids));

    for question_payload in
      select value
      from jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb))
    loop
      next_question_order := next_question_order + 1;
      current_question_id := nullif(question_payload->>'id', '')::uuid;
      current_block_id := nullif(question_payload->>'blockId', '')::uuid;
      current_topic_id := nullif(question_payload->>'topicId', '')::uuid;

      if current_question_id is null then
        insert into public.scheduled_tryout_event_questions (
          event_id,
          question_order,
          stem,
          question_image_path,
          block_id,
          topic_id,
          correct_option_key,
          explanation_text,
          explanation_image_path
        )
        values (
          saved_event.id,
          next_question_order,
          question_payload->>'stem',
          nullif(question_payload->>'questionImagePath', ''),
          current_block_id,
          current_topic_id,
          question_payload->>'correctOptionKey',
          nullif(question_payload->>'explanationText', ''),
          nullif(question_payload->>'explanationImagePath', '')
        )
        returning id
        into current_question_id;
      else
        update public.scheduled_tryout_event_questions
        set
          question_order = next_question_order,
          stem = question_payload->>'stem',
          question_image_path = nullif(question_payload->>'questionImagePath', ''),
          block_id = current_block_id,
          topic_id = current_topic_id,
          correct_option_key = question_payload->>'correctOptionKey',
          explanation_text = nullif(question_payload->>'explanationText', ''),
          explanation_image_path = nullif(question_payload->>'explanationImagePath', '')
        where id = current_question_id
          and event_id = saved_event.id
        returning id
        into current_question_id;

        if not found then
          raise exception 'Soal event try out terjadwal tidak ditemukan.'
            using errcode = 'P0002';
        end if;
      end if;

      delete from public.scheduled_tryout_event_question_options
      where event_question_id = current_question_id;

      insert into public.scheduled_tryout_event_question_options (
        event_question_id,
        option_key,
        option_text,
        sort_order
      )
      select
        current_question_id,
        option_payload->>'key',
        option_payload->>'text',
        ordinality
      from jsonb_array_elements(coalesce(question_payload->'options', '[]'::jsonb)) with ordinality as option(option_payload, ordinality);
    end loop;
  end if;

  return saved_event;
end;
$$;

revoke all on function public.upsert_scheduled_tryout_event(uuid, jsonb) from public, anon;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to authenticated;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to service_role;
