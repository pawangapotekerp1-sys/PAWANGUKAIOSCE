with ranked_active_attempts as (
  select
    id,
    row_number() over (
      partition by user_id
      order by coalesce(last_resumed_at, paused_at, started_at) desc, created_at desc, id desc
    ) as active_rank
  from public.attempts
  where status in ('in_progress', 'paused')
)
update public.attempts
set
  status = 'abandoned',
  last_resumed_at = null,
  paused_at = null
where id in (
  select id
  from ranked_active_attempts
  where active_rank > 1
);

create unique index if not exists attempts_one_active_or_paused_per_user_idx
  on public.attempts (user_id)
  where status in ('in_progress', 'paused');

create or replace function public.start_attempt_from_template(
  target_exam_template_id uuid
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  template_row public.exam_templates%rowtype;
  created_attempt public.attempts%rowtype;
  required_question_count integer;
  available_question_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum memulai try out.'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.attempts
    where user_id = auth.uid()
      and status in ('in_progress', 'paused')
  ) then
    raise exception 'Silakan lanjutkan try out yang masih aktif sebelum memulai sesi baru.'
      using errcode = 'P0001';
  end if;

  select *
  into template_row
  from public.exam_templates
  where id = target_exam_template_id
    and status = 'published';

  if not found then
    raise exception 'Template try out tidak ditemukan atau belum dipublikasikan.'
      using errcode = 'P0002';
  end if;

  required_question_count := case
    when template_row.mode = 'full' then 50
    when template_row.mode = 'block' then 30
    when template_row.mode = 'topic' then 20
    else null
  end;

  if required_question_count is null then
    raise exception 'Mode template try out belum dikenali.'
      using errcode = 'P0002';
  end if;

  if template_row.mode = 'block' and template_row.block_id is null then
    raise exception 'Template try out blok belum memiliki block_id.'
      using errcode = 'P0002';
  end if;

  if template_row.mode = 'topic' and template_row.topic_id is null then
    raise exception 'Template try out materi belum memiliki topic_id.'
      using errcode = 'P0002';
  end if;

  with eligible_questions as (
    select
      question.id
    from public.questions as question
    join public.question_options as option
      on option.question_id = question.id
    where question.status = 'published'
      and (
        template_row.mode = 'full'
        or (template_row.mode = 'block' and question.block_id = template_row.block_id)
        or (template_row.mode = 'topic' and question.topic_id = template_row.topic_id)
      )
    group by question.id
    having count(*) >= 2
      and bool_or(option.is_correct)
  )
  select count(*)
  into available_question_count
  from eligible_questions;

  if coalesce(available_question_count, 0) < required_question_count then
    raise exception 'Template try out ini belum memiliki cukup soal published.'
      using errcode = 'P0002';
  end if;

  begin
    insert into public.attempts (
      user_id,
      exam_template_id,
      status,
      time_limit_seconds,
      total_questions,
      elapsed_seconds,
      last_resumed_at,
      paused_at
    )
    values (
      auth.uid(),
      template_row.id,
      'in_progress',
      required_question_count * 60,
      required_question_count,
      0,
      timezone('utc', now()),
      null
    )
    returning *
    into created_attempt;
  exception
    when unique_violation then
      raise exception 'Silakan lanjutkan try out yang masih aktif sebelum memulai sesi baru.'
        using errcode = 'P0001';
  end;

  insert into public.attempt_items (
    attempt_id,
    question_id,
    block_id,
    block_name,
    topic_id,
    question_stem,
    question_image_path,
    options_snapshot,
    correct_option_key,
    sort_order
  )
  with eligible_questions as (
    select
      question.id,
      question.block_id,
      question.topic_id,
      question.stem,
      question.question_image_path,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'key',
            option.option_key,
            'text',
            option.option_text
          )
          order by option.sort_order
        ),
        '[]'::jsonb
      ) as options_snapshot,
      max(option.option_key) filter (where option.is_correct) as correct_option_key
    from public.questions as question
    join public.question_options as option
      on option.question_id = question.id
    where question.status = 'published'
      and (
        template_row.mode = 'full'
        or (template_row.mode = 'block' and question.block_id = template_row.block_id)
        or (template_row.mode = 'topic' and question.topic_id = template_row.topic_id)
      )
    group by
      question.id,
      question.block_id,
      question.topic_id,
      question.stem,
      question.question_image_path
    having count(*) >= 2
      and bool_or(option.is_correct)
  ),
  selected_questions as (
    select
      eligible_question.id,
      eligible_question.block_id,
      eligible_question.topic_id,
      eligible_question.stem,
      eligible_question.question_image_path,
      eligible_question.options_snapshot,
      eligible_question.correct_option_key,
      random() as random_sort
    from eligible_questions as eligible_question
    order by random()
    limit required_question_count
  ),
  ranked_questions as (
    select
      selected_questions.*,
      row_number() over (order by selected_questions.random_sort, selected_questions.id) as sort_order
    from selected_questions
  )
  select
    created_attempt.id,
    ranked_question.id,
    block.id,
    coalesce(block.name, 'Tanpa blok'),
    topic.id,
    ranked_question.stem,
    ranked_question.question_image_path,
    ranked_question.options_snapshot,
    ranked_question.correct_option_key,
    ranked_question.sort_order
  from ranked_questions as ranked_question
  left join public.blocks as block
    on block.id = ranked_question.block_id
  left join public.topics as topic
    on topic.id = ranked_question.topic_id
  group by
    ranked_question.id,
    ranked_question.block_id,
    ranked_question.topic_id,
    ranked_question.stem,
    ranked_question.question_image_path,
    ranked_question.options_snapshot,
    ranked_question.correct_option_key,
    ranked_question.sort_order,
    block.id,
    block.name,
    topic.id
  order by ranked_question.sort_order;

  return created_attempt;
end;
$$;

revoke all on function public.start_attempt_from_template(uuid) from public;
grant execute on function public.start_attempt_from_template(uuid) to authenticated;
grant execute on function public.start_attempt_from_template(uuid) to service_role;

create or replace function public.pause_attempt(
  target_attempt_id uuid
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.attempts%rowtype;
  pause_time timestamptz := timezone('utc', now());
  next_elapsed_seconds integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menunda try out.'
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
    return target_attempt;
  end if;

  next_elapsed_seconds := greatest(
    0,
    least(
      target_attempt.time_limit_seconds,
      target_attempt.elapsed_seconds
      + case
          when target_attempt.last_resumed_at is null then 0
          else greatest(
            0,
            extract(epoch from (pause_time - target_attempt.last_resumed_at))::integer
          )
        end
    )
  );

  update public.attempts
  set
    status = 'paused',
    elapsed_seconds = next_elapsed_seconds,
    last_resumed_at = null,
    paused_at = pause_time
  where id = target_attempt.id
  returning *
  into target_attempt;

  return target_attempt;
end;
$$;

revoke all on function public.pause_attempt(uuid) from public;
grant execute on function public.pause_attempt(uuid) to authenticated;
grant execute on function public.pause_attempt(uuid) to service_role;

create or replace function public.resume_attempt(
  target_attempt_id uuid
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.attempts%rowtype;
  resume_time timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum melanjutkan try out.'
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

  if target_attempt.status <> 'paused' then
    return target_attempt;
  end if;

  update public.attempts
  set
    status = 'in_progress',
    last_resumed_at = resume_time,
    paused_at = null
  where id = target_attempt.id
  returning *
  into target_attempt;

  return target_attempt;
end;
$$;

revoke all on function public.resume_attempt(uuid) from public;
grant execute on function public.resume_attempt(uuid) to authenticated;
grant execute on function public.resume_attempt(uuid) to service_role;

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

  return result_row;
end;
$$;

revoke all on function public.submit_attempt(uuid) from public;
grant execute on function public.submit_attempt(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid) to service_role;
