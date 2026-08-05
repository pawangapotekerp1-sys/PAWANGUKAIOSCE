with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id,
    6 as target_sort_order
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.topics as topic
set
  block_id = moved_topic.target_block_id,
  sort_order = moved_topic.target_sort_order
from moved_topic
where topic.id = moved_topic.id
  and (
    topic.block_id is distinct from moved_topic.target_block_id
    or topic.sort_order is distinct from moved_topic.target_sort_order
  );

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.questions
set block_id = moved_topic.target_block_id
from moved_topic
where public.questions.topic_id = moved_topic.id
  and public.questions.block_id is distinct from moved_topic.target_block_id;

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.question_upload_items
set block_id = moved_topic.target_block_id
from moved_topic
where (
  public.question_upload_items.topic_id = moved_topic.id
  or (
    public.question_upload_items.topic_id is null
    and public.question_upload_items.suggested_topic_id = moved_topic.id
  )
)
  and public.question_upload_items.block_id is distinct from moved_topic.target_block_id;

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.exam_templates
set block_id = moved_topic.target_block_id
from moved_topic
where public.exam_templates.topic_id = moved_topic.id
  and public.exam_templates.block_id is distinct from moved_topic.target_block_id;

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id,
    'Pharmaceutical Science'::text as target_block_name
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.attempt_items
set
  block_id = moved_topic.target_block_id,
  block_name = moved_topic.target_block_name
from moved_topic
where public.attempt_items.topic_id = moved_topic.id
  and (
    public.attempt_items.block_id is distinct from moved_topic.target_block_id
    or public.attempt_items.block_name is distinct from moved_topic.target_block_name
  );

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id,
    'Pharmaceutical Science'::text as target_block_name
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.attempt_diagnostic_topic_snapshots
set
  block_id = moved_topic.target_block_id,
  block_name = moved_topic.target_block_name
from moved_topic
where public.attempt_diagnostic_topic_snapshots.topic_id = moved_topic.id
  and (
    public.attempt_diagnostic_topic_snapshots.block_id is distinct from moved_topic.target_block_id
    or public.attempt_diagnostic_topic_snapshots.block_name is distinct from moved_topic.target_block_name
  );

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.scheduled_tryout_event_questions
set block_id = moved_topic.target_block_id
from moved_topic
where public.scheduled_tryout_event_questions.topic_id = moved_topic.id
  and public.scheduled_tryout_event_questions.block_id is distinct from moved_topic.target_block_id;

with moved_topic as (
  select
    topic.id,
    '44444444-4444-4444-4444-444444444442'::uuid as target_block_id
  from public.topics as topic
  where topic.slug = 'bahan-alam-farmasi'
)
update public.scheduled_tryout_attempt_items
set block_id_snapshot = moved_topic.target_block_id
from moved_topic
where public.scheduled_tryout_attempt_items.topic_id_snapshot = moved_topic.id
  and public.scheduled_tryout_attempt_items.block_id_snapshot is distinct from moved_topic.target_block_id;
