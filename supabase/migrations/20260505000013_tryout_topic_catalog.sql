alter table public.exam_templates
  add column if not exists topic_id uuid references public.topics (id) on delete set null;

create index if not exists exam_templates_topic_id_idx
  on public.exam_templates (topic_id);

alter table public.exam_templates
  drop constraint if exists exam_templates_mode_check;

alter table public.exam_templates
  add constraint exam_templates_mode_check
  check (mode in ('full', 'block', 'topic'));

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

  insert into public.attempts (
    user_id,
    exam_template_id,
    status,
    time_limit_seconds,
    total_questions
  )
  values (
    auth.uid(),
    template_row.id,
    'in_progress',
    template_row.duration_minutes * 60,
    required_question_count
  )
  returning *
  into created_attempt;

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
