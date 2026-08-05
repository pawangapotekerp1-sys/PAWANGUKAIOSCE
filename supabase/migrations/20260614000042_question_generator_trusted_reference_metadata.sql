alter table public.question_generation_items
  add column if not exists reference_label text,
  add column if not exists reference_url text;

alter table public.question_generation_items
  drop constraint if exists question_generation_items_generation_mode_check;

update public.question_generation_items
set generation_mode = 'new_case_same_concept'
where generation_mode in ('copy_concept', 'paraphrase');

alter table public.question_generation_items
  add constraint question_generation_items_generation_mode_check check (
    generation_mode in (
      'new_case_same_concept',
      'different_trap_same_objective',
      'reverse_reasoning'
    )
  );

alter table public.question_generation_items
  drop constraint if exists question_generation_items_reference_url_https_check;

alter table public.question_generation_items
  add constraint question_generation_items_reference_url_https_check check (
    reference_url is null or reference_url ~ '^https://'
  );

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
        'variationMode', generated_input.payload->>'variationMode',
        'reference', generated_input.payload->'reference'
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
    reference_label,
    reference_url,
    status
  )
  select
    target_batch_id,
    inserted_drafts.id,
    inserted_drafts.source_row_number,
    generated_input.payload->>'variationMode',
    generated_input.payload->'reference'->>'label',
    generated_input.payload->'reference'->>'url',
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
    target_batch_id,
    persisted_count;
end;
$$;

revoke all on function public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb) to service_role;
