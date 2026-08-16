create table if not exists public.generator_user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  provider text not null default 'gemini',
  model text not null default 'gemini-3.7-flash',
  secret_id uuid,
  secret_hint text not null,
  last_validated_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint generator_user_settings_provider_check check (
    provider in ('gemini')
  )
);

drop trigger if exists set_generator_user_settings_updated_at on public.generator_user_settings;
create trigger set_generator_user_settings_updated_at
before update on public.generator_user_settings
for each row
execute function public.set_updated_at();

create table if not exists public.question_generation_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  model text not null default 'gemini-3.7-flash',
  target_question_count integer not null,
  reference_count integer not null,
  status text not null default 'generating',
  generated_count integer not null default 0,
  failed_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_generation_batches_target_question_count_check check (
    target_question_count between 1 and 20
  ),
  constraint question_generation_batches_reference_count_check check (
    reference_count between 1 and 3
  ),
  constraint question_generation_batches_generated_count_check check (
    generated_count >= 0
  ),
  constraint question_generation_batches_status_check check (
    status in ('generating', 'ready_for_review', 'failed', 'partially_distributed', 'completed')
  )
);

create index if not exists question_generation_batches_created_by_idx
  on public.question_generation_batches (created_by, created_at desc);

drop trigger if exists set_question_generation_batches_updated_at on public.question_generation_batches;
create trigger set_question_generation_batches_updated_at
before update on public.question_generation_batches
for each row
execute function public.set_updated_at();

create table if not exists public.question_generation_references (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.question_generation_batches (id) on delete cascade,
  reference_order integer not null,
  stem text not null,
  options_snapshot jsonb not null default '{}'::jsonb,
  correct_option_key text not null,
  explanation_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_generation_references_reference_order_check check (
    reference_order >= 1
  ),
  constraint question_generation_references_correct_option_key_check check (
    correct_option_key in ('A', 'B', 'C', 'D', 'E')
  )
);

create unique index if not exists question_generation_references_batch_order_uidx
  on public.question_generation_references (batch_id, reference_order);

create index if not exists question_generation_references_batch_id_idx
  on public.question_generation_references (batch_id);

drop trigger if exists set_question_generation_references_updated_at on public.question_generation_references;
create trigger set_question_generation_references_updated_at
before update on public.question_generation_references
for each row
execute function public.set_updated_at();

create table if not exists public.question_generation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.question_generation_batches (id) on delete cascade,
  draft_question_id uuid references public.question_upload_items (id) on delete set null,
  item_order integer not null,
  generation_mode text not null,
  status text not null default 'draft_generated',
  edited_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_generation_items_item_order_check check (
    item_order >= 1
  ),
  constraint question_generation_items_generation_mode_check check (
    generation_mode in ('copy_concept', 'paraphrase')
  ),
  constraint question_generation_items_status_check check (
    status in ('draft_generated', 'draft_edited')
  )
);

create unique index if not exists question_generation_items_batch_order_uidx
  on public.question_generation_items (batch_id, item_order);

create index if not exists question_generation_items_batch_id_idx
  on public.question_generation_items (batch_id);

create index if not exists question_generation_items_draft_question_id_idx
  on public.question_generation_items (draft_question_id);

drop trigger if exists set_question_generation_items_updated_at on public.question_generation_items;
create trigger set_question_generation_items_updated_at
before update on public.question_generation_items
for each row
execute function public.set_updated_at();

create table if not exists public.question_generation_deliveries (
  id uuid primary key default gen_random_uuid(),
  generation_item_id uuid not null references public.question_generation_items (id) on delete cascade,
  destination_type text not null,
  destination_question_id uuid references public.questions (id) on delete set null,
  destination_event_id uuid references public.scheduled_tryout_events (id) on delete set null,
  destination_event_question_id uuid references public.scheduled_tryout_event_questions (id) on delete set null,
  block_id uuid references public.blocks (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  delivered_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint question_generation_deliveries_destination_type_check check (
    destination_type in ('question_bank', 'scheduled_event')
  )
);

create index if not exists question_generation_deliveries_item_id_idx
  on public.question_generation_deliveries (generation_item_id, created_at desc);

alter table public.generator_user_settings enable row level security;
alter table public.question_generation_batches enable row level security;
alter table public.question_generation_references enable row level security;
alter table public.question_generation_items enable row level security;
alter table public.question_generation_deliveries enable row level security;

drop policy if exists "generator_user_settings_owner_access" on public.generator_user_settings;
create policy "generator_user_settings_owner_access"
on public.generator_user_settings
for all
using (
  user_id = auth.uid()
  and public.can_manage_question_bank()
)
with check (
  user_id = auth.uid()
  and public.can_manage_question_bank()
);

drop policy if exists "question_generation_batches_owner_access" on public.question_generation_batches;
create policy "question_generation_batches_owner_access"
on public.question_generation_batches
for all
using (
  created_by = auth.uid()
  and public.can_manage_question_bank()
)
with check (
  created_by = auth.uid()
  and public.can_manage_question_bank()
);

drop policy if exists "question_generation_references_owner_access" on public.question_generation_references;
create policy "question_generation_references_owner_access"
on public.question_generation_references
for all
using (
  exists (
    select 1
    from public.question_generation_batches
    where question_generation_batches.id = question_generation_references.batch_id
      and question_generation_batches.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
)
with check (
  exists (
    select 1
    from public.question_generation_batches
    where question_generation_batches.id = question_generation_references.batch_id
      and question_generation_batches.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
);

drop policy if exists "question_generation_items_owner_access" on public.question_generation_items;
create policy "question_generation_items_owner_access"
on public.question_generation_items
for all
using (
  exists (
    select 1
    from public.question_generation_batches
    where question_generation_batches.id = question_generation_items.batch_id
      and question_generation_batches.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
)
with check (
  exists (
    select 1
    from public.question_generation_batches
    where question_generation_batches.id = question_generation_items.batch_id
      and question_generation_batches.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
);

drop policy if exists "question_generation_deliveries_owner_access" on public.question_generation_deliveries;
create policy "question_generation_deliveries_owner_access"
on public.question_generation_deliveries
for all
using (
  exists (
    select 1
    from public.question_generation_items
    inner join public.question_generation_batches
      on question_generation_batches.id = question_generation_items.batch_id
    where question_generation_items.id = question_generation_deliveries.generation_item_id
      and question_generation_batches.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
)
with check (
  exists (
    select 1
    from public.question_generation_items
    inner join public.question_generation_batches
      on question_generation_batches.id = question_generation_items.batch_id
    where question_generation_items.id = question_generation_deliveries.generation_item_id
      and question_generation_batches.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
);

alter table public.question_generation_batches
drop constraint if exists question_generation_batches_target_question_count_check;

alter table public.question_generation_batches
add constraint question_generation_batches_target_question_count_check
check (
  target_question_count between 1 and 20
);

create unique index if not exists question_generation_deliveries_item_bank_destination_uidx
  on public.question_generation_deliveries (generation_item_id, block_id, topic_id)
  where destination_type = 'question_bank';

create unique index if not exists question_generation_deliveries_item_event_destination_uidx
  on public.question_generation_deliveries (generation_item_id, destination_event_id)
  where destination_type = 'scheduled_event';

create or replace function public.persist_generated_question_batch(
  target_batch_id uuid,
  target_user_id uuid,
  target_references jsonb,
  target_generated_items jsonb
)
returns table (
  batch_id uuid,
  generated_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_batch public.question_generation_batches%rowtype;
  created_draft_batch_id uuid;
  persisted_count integer := 0;
begin
  select *
  into owned_batch
  from public.question_generation_batches
  where id = target_batch_id
    and created_by = target_user_id
  for update;

  if not found then
    raise exception 'Batch generator tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.question_generation_references
    where question_generation_references.batch_id = target_batch_id
  ) or exists (
    select 1
    from public.question_generation_items
    where question_generation_items.batch_id = target_batch_id
  ) then
    raise exception 'Batch generator ini sudah memiliki hasil tersimpan.'
      using errcode = 'P0001';
  end if;

  if jsonb_typeof(target_references) <> 'array'
    or jsonb_array_length(target_references) < 1
    or jsonb_array_length(target_references) > 3 then
    raise exception 'Referensi soal harus berjumlah 1 sampai 3.'
      using errcode = 'P0001';
  end if;

  if jsonb_typeof(target_generated_items) <> 'array'
    or jsonb_array_length(target_generated_items) < 1
    or jsonb_array_length(target_generated_items) > 20 then
    raise exception 'Jumlah soal hasil generator harus berada pada rentang 1 sampai 20.'
      using errcode = 'P0001';
  end if;

  if jsonb_array_length(target_generated_items) <> owned_batch.target_question_count then
    raise exception 'Jumlah hasil generator tidak cocok dengan target batch.'
      using errcode = 'P0001';
  end if;

  insert into public.question_generation_references (
    batch_id,
    reference_order,
    stem,
    options_snapshot,
    correct_option_key,
    explanation_text
  )
  select
    target_batch_id,
    reference_entry.reference_order,
    reference_entry.payload->>'stem',
    reference_entry.payload->'options',
    reference_entry.payload->>'correctOptionKey',
    reference_entry.payload->>'explanationText'
  from (
    select
      value as payload,
      ordinality::integer as reference_order
    from jsonb_array_elements(target_references) with ordinality
  ) as reference_entry
  order by reference_entry.reference_order;

  insert into public.question_upload_batches (
    title,
    input_format,
    source_file_name,
    status,
    total_items,
    created_by
  )
  values (
    format('Question Generator %s', timezone('utc', now())),
    'manual',
    null,
    'completed',
    jsonb_array_length(target_generated_items),
    target_user_id
  )
  returning id into created_draft_batch_id;

  with generated_input as (
    select
      value as payload,
      ordinality::integer as item_order
    from jsonb_array_elements(target_generated_items) with ordinality
  ),
  inserted_drafts as (
    insert into public.question_upload_items (
      batch_id,
      source_row_number,
      stem,
      options_snapshot,
      correct_option_key,
      explanation,
      explanation_source,
      raw_payload,
      workflow_status,
      created_by,
      updated_by
    )
    select
      created_draft_batch_id,
      generated_input.item_order,
      generated_input.payload->>'stem',
      jsonb_build_array(
        jsonb_build_object('key', 'A', 'text', generated_input.payload->'options'->>'A'),
        jsonb_build_object('key', 'B', 'text', generated_input.payload->'options'->>'B'),
        jsonb_build_object('key', 'C', 'text', generated_input.payload->'options'->>'C'),
        jsonb_build_object('key', 'D', 'text', generated_input.payload->'options'->>'D'),
        jsonb_build_object('key', 'E', 'text', generated_input.payload->'options'->>'E')
      ),
      generated_input.payload->>'correctOptionKey',
      generated_input.payload->>'explanationText',
      'manual_editor',
      jsonb_build_object(
        'source', 'question_generator',
        'generationMode', generated_input.payload->>'generationMode'
      ),
      'draft_ready',
      target_user_id,
      target_user_id
    from generated_input
    order by generated_input.item_order
    returning id, source_row_number
  )
  insert into public.question_generation_items (
    batch_id,
    draft_question_id,
    item_order,
    generation_mode,
    status
  )
  select
    target_batch_id,
    inserted_drafts.id,
    inserted_drafts.source_row_number,
    generated_input.payload->>'generationMode',
    'draft_generated'
  from inserted_drafts
  inner join generated_input
    on generated_input.item_order = inserted_drafts.source_row_number
  order by inserted_drafts.source_row_number;

  get diagnostics persisted_count = row_count;

  update public.question_generation_batches
  set
    generated_count = persisted_count,
    status = 'ready_for_review',
    failed_reason = null
  where id = target_batch_id;

  return query
  select
    target_batch_id as batch_id,
    persisted_count as generated_count;
end;
$$;

create or replace function public.deliver_generated_item_to_question_bank(
  target_generation_item_id uuid,
  target_user_id uuid,
  target_block_id uuid,
  target_topic_id uuid
)
returns table (
  delivery_id uuid,
  question_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_item record;
  draft_row public.question_upload_items%rowtype;
  created_question_id uuid;
  created_delivery_id uuid;
  total_item_count integer := 0;
  delivered_item_count integer := 0;
  next_batch_status text := 'ready_for_review';
begin
  select
    item.id,
    item.batch_id,
    item.draft_question_id
  into owned_item
  from public.question_generation_items as item
  inner join public.question_generation_batches as batch
    on batch.id = item.batch_id
  where item.id = target_generation_item_id
    and batch.created_by = target_user_id
  for update of item, batch;

  if not found then
    raise exception 'Draft generator tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if owned_item.draft_question_id is null then
    raise exception 'Draft generator ini belum terhubung ke draft internal.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.question_generation_deliveries
    where generation_item_id = target_generation_item_id
      and destination_type = 'question_bank'
      and block_id = target_block_id
      and topic_id = target_topic_id
  ) then
    raise exception 'Draft ini sudah pernah dikirim ke blok dan materi bank soal yang sama.'
      using errcode = 'P0001';
  end if;

  select *
  into draft_row
  from public.question_upload_items
  where id = owned_item.draft_question_id;

  if not found then
    raise exception 'Draft internal generator tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  insert into public.questions (
    stem,
    block_id,
    topic_id,
    status,
    created_by,
    updated_by
  )
  values (
    coalesce(draft_row.stem, ''),
    target_block_id,
    target_topic_id,
    'draft',
    target_user_id,
    target_user_id
  )
  returning id into created_question_id;

  insert into public.question_options (
    question_id,
    option_key,
    option_text,
    is_correct,
    sort_order
  )
  select
    created_question_id,
    option_entry.payload->>'key',
    option_entry.payload->>'text',
    (option_entry.payload->>'key') = draft_row.correct_option_key,
    option_entry.sort_order
  from (
    select
      value as payload,
      ordinality::integer as sort_order
    from jsonb_array_elements(draft_row.options_snapshot) with ordinality
  ) as option_entry
  order by option_entry.sort_order;

  insert into public.question_explanations (
    question_id,
    explanation,
    explanation_source,
    created_by,
    updated_by
  )
  values (
    created_question_id,
    coalesce(draft_row.explanation, ''),
    'manual_editor',
    target_user_id,
    target_user_id
  );

  insert into public.question_generation_deliveries (
    generation_item_id,
    destination_type,
    destination_question_id,
    block_id,
    topic_id,
    delivered_by
  )
  values (
    target_generation_item_id,
    'question_bank',
    created_question_id,
    target_block_id,
    target_topic_id,
    target_user_id
  )
  returning id into created_delivery_id;

  select count(*)
  into total_item_count
  from public.question_generation_items
  where batch_id = owned_item.batch_id;

  select count(distinct delivery.generation_item_id)
  into delivered_item_count
  from public.question_generation_deliveries as delivery
  inner join public.question_generation_items as item
    on item.id = delivery.generation_item_id
  where item.batch_id = owned_item.batch_id;

  next_batch_status := case
    when delivered_item_count = 0 then 'ready_for_review'
    when delivered_item_count < total_item_count then 'partially_distributed'
    else 'completed'
  end;

  update public.question_generation_batches
  set status = next_batch_status
  where id = owned_item.batch_id;

  return query
  select
    created_delivery_id,
    created_question_id;
end;
$$;

create or replace function public.deliver_generated_item_to_scheduled_event(
  target_generation_item_id uuid,
  target_user_id uuid,
  target_event_id uuid
)
returns table (
  delivery_id uuid,
  event_question_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_item record;
  draft_row public.question_upload_items%rowtype;
  next_question_order integer := 1;
  created_event_question_id uuid;
  created_delivery_id uuid;
  total_item_count integer := 0;
  delivered_item_count integer := 0;
  next_batch_status text := 'ready_for_review';
begin
  select
    item.id,
    item.batch_id,
    item.draft_question_id
  into owned_item
  from public.question_generation_items as item
  inner join public.question_generation_batches as batch
    on batch.id = item.batch_id
  where item.id = target_generation_item_id
    and batch.created_by = target_user_id
  for update of item, batch;

  if not found then
    raise exception 'Draft generator tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if owned_item.draft_question_id is null then
    raise exception 'Draft generator ini belum terhubung ke draft internal.'
      using errcode = 'P0001';
  end if;

  perform 1
  from public.scheduled_tryout_events
  where id = target_event_id
  for update;

  if not found then
    raise exception 'Event try out terjadwal tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.question_generation_deliveries
    where generation_item_id = target_generation_item_id
      and destination_type = 'scheduled_event'
      and destination_event_id = target_event_id
  ) then
    raise exception 'Draft ini sudah pernah dikirim ke event try out yang sama.'
      using errcode = 'P0001';
  end if;

  select *
  into draft_row
  from public.question_upload_items
  where id = owned_item.draft_question_id;

  if not found then
    raise exception 'Draft internal generator tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  select coalesce(max(question_order), 0) + 1
  into next_question_order
  from public.scheduled_tryout_event_questions
  where event_id = target_event_id;

  insert into public.scheduled_tryout_event_questions (
    event_id,
    question_order,
    stem,
    correct_option_key,
    explanation_text
  )
  values (
    target_event_id,
    next_question_order,
    coalesce(draft_row.stem, ''),
    coalesce(draft_row.correct_option_key, 'A'),
    coalesce(draft_row.explanation, '')
  )
  returning id into created_event_question_id;

  insert into public.scheduled_tryout_event_question_options (
    event_question_id,
    option_key,
    option_text,
    sort_order
  )
  select
    created_event_question_id,
    option_entry.payload->>'key',
    option_entry.payload->>'text',
    option_entry.sort_order
  from (
    select
      value as payload,
      ordinality::integer as sort_order
    from jsonb_array_elements(draft_row.options_snapshot) with ordinality
  ) as option_entry
  order by option_entry.sort_order;

  insert into public.question_generation_deliveries (
    generation_item_id,
    destination_type,
    destination_event_id,
    destination_event_question_id,
    delivered_by
  )
  values (
    target_generation_item_id,
    'scheduled_event',
    target_event_id,
    created_event_question_id,
    target_user_id
  )
  returning id into created_delivery_id;

  select count(*)
  into total_item_count
  from public.question_generation_items
  where batch_id = owned_item.batch_id;

  select count(distinct delivery.generation_item_id)
  into delivered_item_count
  from public.question_generation_deliveries as delivery
  inner join public.question_generation_items as item
    on item.id = delivery.generation_item_id
  where item.batch_id = owned_item.batch_id;

  next_batch_status := case
    when delivered_item_count = 0 then 'ready_for_review'
    when delivered_item_count < total_item_count then 'partially_distributed'
    else 'completed'
  end;

  update public.question_generation_batches
  set status = next_batch_status
  where id = owned_item.batch_id;

  return query
  select
    created_delivery_id,
    created_event_question_id;
end;
$$;

revoke all on function public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.deliver_generated_item_to_question_bank(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.deliver_generated_item_to_scheduled_event(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb) to service_role;
grant execute on function public.deliver_generated_item_to_question_bank(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.deliver_generated_item_to_scheduled_event(uuid, uuid, uuid) to service_role;
