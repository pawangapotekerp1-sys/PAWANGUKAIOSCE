with moved_topics as (
  select
    topic.id,
    topic.slug,
    case
      when slug = 'biologi-sel' then '44444444-4444-4444-4444-444444444441'::uuid
      when slug = 'bahan-alam-farmasi' then '44444444-4444-4444-4444-444444444443'::uuid
      else topic.block_id
    end as target_block_id,
    case
      when slug = 'biologi-sel' then 6
      when slug = 'bahan-alam-farmasi' then 4
      else topic.sort_order
    end as target_sort_order
  from public.topics as topic
  where slug in ('biologi-sel', 'bahan-alam-farmasi')
)
update public.topics as topic
set
  block_id = moved_topics.target_block_id,
  sort_order = moved_topics.target_sort_order
from moved_topics
where topic.id = moved_topics.id
  and (
    topic.block_id is distinct from moved_topics.target_block_id
    or topic.sort_order is distinct from moved_topics.target_sort_order
  );

with moved_topics as (
  select
    topic.id,
    case
      when slug = 'biologi-sel' then '44444444-4444-4444-4444-444444444441'::uuid
      when slug = 'bahan-alam-farmasi' then '44444444-4444-4444-4444-444444444443'::uuid
      else topic.block_id
    end as target_block_id
  from public.topics as topic
  where slug in ('biologi-sel', 'bahan-alam-farmasi')
)
update public.questions
set block_id = moved_topics.target_block_id
from moved_topics
where public.questions.topic_id = moved_topics.id
  and public.questions.block_id is distinct from moved_topics.target_block_id;

with moved_topics as (
  select
    topic.id,
    case
      when slug = 'biologi-sel' then '44444444-4444-4444-4444-444444444441'::uuid
      when slug = 'bahan-alam-farmasi' then '44444444-4444-4444-4444-444444444443'::uuid
      else topic.block_id
    end as target_block_id
  from public.topics as topic
  where slug in ('biologi-sel', 'bahan-alam-farmasi')
)
update public.question_upload_items
set block_id = moved_topics.target_block_id
from moved_topics
where (
  public.question_upload_items.topic_id = moved_topics.id
  or (
    public.question_upload_items.topic_id is null
    and public.question_upload_items.suggested_topic_id = moved_topics.id
  )
)
  and public.question_upload_items.block_id is distinct from moved_topics.target_block_id;

with moved_topics as (
  select
    topic.id,
    case
      when slug = 'biologi-sel' then '44444444-4444-4444-4444-444444444441'::uuid
      when slug = 'bahan-alam-farmasi' then '44444444-4444-4444-4444-444444444443'::uuid
      else topic.block_id
    end as target_block_id
  from public.topics as topic
  where slug in ('biologi-sel', 'bahan-alam-farmasi')
)
update public.exam_templates
set block_id = moved_topics.target_block_id
from moved_topics
where exam_templates.mode = 'topic'
  and public.exam_templates.topic_id = moved_topics.id
  and public.exam_templates.block_id is distinct from moved_topics.target_block_id;
