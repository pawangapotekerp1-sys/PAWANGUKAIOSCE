update public.exam_templates
set
  slug = 'tryout-besar',
  title = 'Try Out Besar',
  description = 'Simulasi penuh untuk membaca stamina, fokus, dan pola salah sebelum review dipersempit.',
  block_id = null,
  topic_id = null,
  question_count = 50,
  duration_minutes = 60,
  diagnostic_source = true,
  status = 'published',
  updated_at = timezone('utc', now())
where mode = 'full';

insert into public.exam_templates (
  id,
  slug,
  title,
  description,
  mode,
  block_id,
  topic_id,
  question_count,
  duration_minutes,
  diagnostic_source,
  status
)
select
  (
    substr(template_hash, 1, 8)
    || '-' || substr(template_hash, 9, 4)
    || '-' || substr(template_hash, 13, 4)
    || '-' || substr(template_hash, 17, 4)
    || '-' || substr(template_hash, 21, 12)
  )::uuid,
  'tryout-besar',
  'Try Out Besar',
  'Simulasi penuh untuk membaca stamina, fokus, dan pola salah sebelum review dipersempit.',
  'full',
  null,
  null,
  50,
  60,
  true,
  'published'
from (
  select md5('generated-full-template') as template_hash
) as generated_full
where not exists (
  select 1
  from public.exam_templates as template
  where template.mode = 'full'
);

update public.exam_templates as template
set
  slug = block.slug,
  title = block.name,
  description = format('Try out per blok %s.', block.name),
  block_id = block.id,
  topic_id = null,
  question_count = 30,
  duration_minutes = 40,
  diagnostic_source = false,
  status = 'published',
  updated_at = timezone('utc', now())
from public.blocks as block
where template.mode = 'block'
  and template.block_id = block.id
  and block.is_active = true;

insert into public.exam_templates (
  id,
  slug,
  title,
  description,
  mode,
  block_id,
  topic_id,
  question_count,
  duration_minutes,
  diagnostic_source,
  status
)
select
  (
    substr(template_hash, 1, 8)
    || '-' || substr(template_hash, 9, 4)
    || '-' || substr(template_hash, 13, 4)
    || '-' || substr(template_hash, 17, 4)
    || '-' || substr(template_hash, 21, 12)
  )::uuid,
  block.slug,
  block.name,
  format('Try out per blok %s.', block.name),
  'block',
  block.id,
  null,
  30,
  40,
  false,
  'published'
from (
  select
    block.*,
    md5(format('generated-block-template-%s', block.id)) as template_hash
  from public.blocks as block
  where block.is_active = true
) as block
where not exists (
  select 1
  from public.exam_templates as template
  where template.mode = 'block' and template.block_id = block.id
);

update public.exam_templates as template
set
  slug = format('materi-%s', topic.slug),
  title = topic.name,
  description = format('Latihan fokus %s dengan 20 soal acak dari materi ini.', topic.name),
  block_id = topic.block_id,
  topic_id = topic.id,
  question_count = 20,
  duration_minutes = 30,
  diagnostic_source = false,
  status = 'published',
  updated_at = timezone('utc', now())
from public.topics as topic
join public.blocks as block
  on block.id = topic.block_id
where template.mode = 'topic'
  and template.topic_id = topic.id
  and block.is_active = true
  and topic.is_active = true;

insert into public.exam_templates (
  id,
  slug,
  title,
  description,
  mode,
  block_id,
  topic_id,
  question_count,
  duration_minutes,
  diagnostic_source,
  status
)
select
  (
    substr(template_hash, 1, 8)
    || '-' || substr(template_hash, 9, 4)
    || '-' || substr(template_hash, 13, 4)
    || '-' || substr(template_hash, 17, 4)
    || '-' || substr(template_hash, 21, 12)
  )::uuid,
  format('materi-%s', topic.slug),
  topic.name,
  format('Latihan fokus %s dengan 20 soal acak dari materi ini.', topic.name),
  'topic',
  topic.block_id,
  topic.id,
  20,
  30,
  false,
  'published'
from (
  select
    topic.*,
    md5(format('generated-topic-template-%s', topic.id)) as template_hash
  from public.topics as topic
  join public.blocks as block
    on block.id = topic.block_id
  where block.is_active = true
    and topic.is_active = true
) as topic
where not exists (
  select 1
  from public.exam_templates as template
  where template.mode = 'topic' and template.topic_id = topic.id
);
