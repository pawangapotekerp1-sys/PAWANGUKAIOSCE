create or replace function public.list_tryout_catalog_entries()
returns table (
  mode text,
  slug text,
  title text,
  description text,
  block_id uuid,
  block_name text,
  block_sort_order integer,
  topic_id uuid,
  topic_name text,
  topic_sort_order integer,
  session_template_id uuid,
  duration_minutes integer,
  available_question_count integer,
  required_question_count integer,
  is_startable boolean,
  disabled_reason text
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible_questions as (
    select
      question.id,
      question.block_id,
      question.topic_id
    from public.questions as question
    join public.question_options as option
      on option.question_id = question.id
    where question.status = 'published'
    group by question.id, question.block_id, question.topic_id
    having count(*) >= 2
      and bool_or(option.is_correct)
  ),
  active_blocks as (
    select
      block.id,
      block.slug,
      block.name,
      block.sort_order
    from public.blocks as block
    where block.is_active = true
  ),
  active_topics as (
    select
      topic.id,
      topic.block_id,
      topic.slug,
      topic.name,
      topic.sort_order
    from public.topics as topic
    join active_blocks as block
      on block.id = topic.block_id
    where topic.is_active = true
  ),
  full_template as (
    select
      template.id as session_template_id,
      template.duration_minutes
    from public.exam_templates as template
    where template.mode = 'full'
      and template.status = 'published'
    order by template.created_at asc, template.id asc
    limit 1
  ),
  block_templates as (
    select distinct on (template.block_id)
      template.block_id,
      template.id as session_template_id,
      template.duration_minutes
    from public.exam_templates as template
    where template.mode = 'block'
      and template.status = 'published'
      and template.block_id is not null
    order by template.block_id, template.created_at asc, template.id asc
  ),
  topic_templates as (
    select distinct on (template.topic_id)
      template.topic_id,
      template.id as session_template_id,
      template.duration_minutes
    from public.exam_templates as template
    where template.mode = 'topic'
      and template.status = 'published'
      and template.topic_id is not null
    order by template.topic_id, template.created_at asc, template.id asc
  ),
  full_counts as (
    select count(*)::integer as available_question_count
    from eligible_questions
  ),
  block_counts as (
    select
      eligible_question.block_id,
      count(*)::integer as available_question_count
    from eligible_questions as eligible_question
    where eligible_question.block_id is not null
    group by eligible_question.block_id
  ),
  topic_counts as (
    select
      eligible_question.topic_id,
      count(*)::integer as available_question_count
    from eligible_questions as eligible_question
    where eligible_question.topic_id is not null
    group by eligible_question.topic_id
  )
  select
    'full'::text as mode,
    'tryout-besar'::text as slug,
    'Try Out Besar'::text as title,
    'Simulasi penuh untuk membaca stamina, fokus, dan pola salah sebelum review dipersempit.'::text as description,
    null::uuid as block_id,
    null::text as block_name,
    null::integer as block_sort_order,
    null::uuid as topic_id,
    null::text as topic_name,
    null::integer as topic_sort_order,
    template.session_template_id,
    coalesce(template.duration_minutes, 60) as duration_minutes,
    coalesce(counts.available_question_count, 0) as available_question_count,
    50 as required_question_count,
    coalesce(counts.available_question_count, 0) >= 50
      and template.session_template_id is not null as is_startable,
    case
      when coalesce(counts.available_question_count, 0) >= 50
        and template.session_template_id is not null then null
      else format(
        '%s/%s soal valid siap. %s',
        coalesce(counts.available_question_count, 0),
        50,
        concat_ws(
          ' ',
          case
            when template.session_template_id is null then 'Template try out belum dipublikasikan.'
            else null
          end,
          case
            when template.session_template_id is not null
              and coalesce(counts.available_question_count, 0) < 50 then 'Jumlah soal valid belum mencukupi.'
            else null
          end
        )
      )
    end as disabled_reason
  from full_counts as counts
  left join full_template as template
    on true

  union all

  select
    'block'::text as mode,
    block.slug,
    block.name as title,
    format('Try out per blok %s.', block.name) as description,
    block.id as block_id,
    block.name as block_name,
    block.sort_order as block_sort_order,
    null::uuid as topic_id,
    null::text as topic_name,
    null::integer as topic_sort_order,
    template.session_template_id,
    coalesce(template.duration_minutes, 40) as duration_minutes,
    coalesce(counts.available_question_count, 0) as available_question_count,
    30 as required_question_count,
    coalesce(counts.available_question_count, 0) >= 30
      and template.session_template_id is not null as is_startable,
    case
      when coalesce(counts.available_question_count, 0) >= 30
        and template.session_template_id is not null then null
      else format(
        '%s/%s soal valid siap. %s',
        coalesce(counts.available_question_count, 0),
        30,
        concat_ws(
          ' ',
          case
            when template.session_template_id is null then 'Template try out belum dipublikasikan.'
            else null
          end,
          case
            when template.session_template_id is not null
              and coalesce(counts.available_question_count, 0) < 30 then 'Jumlah soal valid belum mencukupi.'
            else null
          end
        )
      )
    end as disabled_reason
  from active_blocks as block
  left join block_templates as template
    on template.block_id = block.id
  left join block_counts as counts
    on counts.block_id = block.id

  union all

  select
    'topic'::text as mode,
    topic.slug,
    topic.name as title,
    format('Try out per materi %s.', topic.name) as description,
    block.id as block_id,
    block.name as block_name,
    block.sort_order as block_sort_order,
    topic.id as topic_id,
    topic.name as topic_name,
    topic.sort_order as topic_sort_order,
    template.session_template_id,
    coalesce(template.duration_minutes, 30) as duration_minutes,
    coalesce(counts.available_question_count, 0) as available_question_count,
    20 as required_question_count,
    coalesce(counts.available_question_count, 0) >= 20
      and template.session_template_id is not null as is_startable,
    case
      when coalesce(counts.available_question_count, 0) >= 20
        and template.session_template_id is not null then null
      else format(
        '%s/%s soal valid siap. %s',
        coalesce(counts.available_question_count, 0),
        20,
        concat_ws(
          ' ',
          case
            when template.session_template_id is null then 'Template try out belum dipublikasikan.'
            else null
          end,
          case
            when template.session_template_id is not null
              and coalesce(counts.available_question_count, 0) < 20 then 'Jumlah soal valid belum mencukupi.'
            else null
          end
        )
      )
    end as disabled_reason
  from active_topics as topic
  join active_blocks as block
    on block.id = topic.block_id
  left join topic_templates as template
    on template.topic_id = topic.id
  left join topic_counts as counts
    on counts.topic_id = topic.id;
$$;

revoke all on function public.list_tryout_catalog_entries() from public;
grant execute on function public.list_tryout_catalog_entries() to authenticated;
grant execute on function public.list_tryout_catalog_entries() to service_role;
