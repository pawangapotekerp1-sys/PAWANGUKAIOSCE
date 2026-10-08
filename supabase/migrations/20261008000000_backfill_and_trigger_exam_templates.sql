-- Fix: Backfill missing exam_templates for blocks/topics added after the
-- original backfill migration (20260530000032), and add triggers to
-- auto-create templates when new blocks or topics are inserted.
--
-- Root cause: The one-time backfill ran before 20260531000035 which inserted
-- new block/topic records without creating corresponding exam_templates.
-- This left the "Try Out Unlimited" feature permanently disabled for those
-- entries despite having sufficient published questions.

begin;

-- ============================================================================
-- Part 1: Backfill missing block templates
-- ============================================================================

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

-- ============================================================================
-- Part 2: Backfill missing topic templates
-- ============================================================================

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

-- ============================================================================
-- Part 3: Trigger function to auto-create exam_templates for new blocks
-- ============================================================================

create or replace function public.auto_create_block_exam_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template_hash text;
  generated_id uuid;
begin
  -- Only act on active blocks
  if new.is_active = false then
    return new;
  end if;

  -- Skip if a template already exists for this block
  if exists (
    select 1
    from public.exam_templates
    where mode = 'block' and block_id = new.id
  ) then
    return new;
  end if;

  template_hash := md5(format('generated-block-template-%s', new.id));
  generated_id := (
    substr(template_hash, 1, 8)
    || '-' || substr(template_hash, 9, 4)
    || '-' || substr(template_hash, 13, 4)
    || '-' || substr(template_hash, 17, 4)
    || '-' || substr(template_hash, 21, 12)
  )::uuid;

  insert into public.exam_templates (
    id, slug, title, description, mode,
    block_id, topic_id, question_count, duration_minutes,
    diagnostic_source, status
  )
  values (
    generated_id,
    new.slug,
    new.name,
    format('Try out per blok %s.', new.name),
    'block',
    new.id,
    null,
    30,
    40,
    false,
    'published'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists auto_create_block_template on public.blocks;
create trigger auto_create_block_template
  after insert on public.blocks
  for each row
  execute function public.auto_create_block_exam_template();

-- ============================================================================
-- Part 4: Trigger function to auto-create exam_templates for new topics
-- ============================================================================

create or replace function public.auto_create_topic_exam_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template_hash text;
  generated_id uuid;
  parent_block_active boolean;
begin
  -- Only act on active topics
  if (new.is_active is not null and new.is_active = false) then
    return new;
  end if;

  -- Check if parent block is active
  select block.is_active into parent_block_active
  from public.blocks as block
  where block.id = new.block_id;

  if parent_block_active is null or parent_block_active = false then
    return new;
  end if;

  -- Skip if a template already exists for this topic
  if exists (
    select 1
    from public.exam_templates
    where mode = 'topic' and topic_id = new.id
  ) then
    return new;
  end if;

  template_hash := md5(format('generated-topic-template-%s', new.id));
  generated_id := (
    substr(template_hash, 1, 8)
    || '-' || substr(template_hash, 9, 4)
    || '-' || substr(template_hash, 13, 4)
    || '-' || substr(template_hash, 17, 4)
    || '-' || substr(template_hash, 21, 12)
  )::uuid;

  insert into public.exam_templates (
    id, slug, title, description, mode,
    block_id, topic_id, question_count, duration_minutes,
    diagnostic_source, status
  )
  values (
    generated_id,
    format('materi-%s', new.slug),
    new.name,
    format('Latihan fokus %s dengan 20 soal acak dari materi ini.', new.name),
    'topic',
    new.block_id,
    new.id,
    20,
    30,
    false,
    'published'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists auto_create_topic_template on public.topics;
create trigger auto_create_topic_template
  after insert on public.topics
  for each row
  execute function public.auto_create_topic_exam_template();

commit;
