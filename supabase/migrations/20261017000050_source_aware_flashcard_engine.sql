-- supabase/migrations/20261017000050_source_aware_flashcard_engine.sql
-- 1. Tambah kolom metadata pada flashcard_materials
alter table public.flashcard_materials
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. Tambah kolom metadata pada flashcard_cards
alter table public.flashcard_cards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. Update default model user_ai_credentials ke gemini-3.8-flash
alter table public.user_ai_credentials
  alter column model set default 'gemini-3.8-flash';

-- 4. RPC Penggantian Konten Atomik dengan Dukungan Metadata dan Proteksi Hak Akses
create or replace function public.replace_flashcard_material_content(
  target_material_id uuid,
  target_owner_id uuid,
  target_subtopics jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_owner_id uuid;
begin
  if target_subtopics is null or jsonb_typeof(target_subtopics) <> 'array' or jsonb_array_length(target_subtopics) = 0 then
    raise exception 'Flash card subtopics payload is required.';
  end if;

  select created_by into actual_owner_id
  from public.flashcard_materials
  where id = target_material_id;

  if actual_owner_id is null then
    raise exception 'Flash card material not found.';
  end if;

  if actual_owner_id <> target_owner_id then
    raise exception 'Flash card material is not owned by the provided mentor.';
  end if;

  delete from public.flashcard_subtopics
  where material_id = target_material_id;

  with inserted_subtopics as (
    insert into public.flashcard_subtopics (
      material_id,
      title,
      summary,
      sort_order
    )
    select
      target_material_id,
      trim(subtopic_payload ->> 'title'),
      trim(subtopic_payload ->> 'summary'),
      subtopic_order::integer
    from jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    returning id, sort_order
  )
  insert into public.flashcard_cards (
    subtopic_id,
    front_text,
    back_text,
    sort_order,
    metadata
  )
  select
    inserted_subtopics.id,
    trim(card_payload ->> 'front_text'),
    trim(card_payload ->> 'back_text'),
    card_order::integer,
    coalesce(card_payload -> 'metadata', '{}'::jsonb)
  from inserted_subtopics
  inner join jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    on inserted_subtopics.sort_order = subtopic_order::integer
  inner join jsonb_array_elements(subtopic.subtopic_payload -> 'cards') with ordinality as card(card_payload, card_order)
    on true;
end;
$$;

revoke all on function public.replace_flashcard_material_content(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_flashcard_material_content(uuid, uuid, jsonb) to service_role;
