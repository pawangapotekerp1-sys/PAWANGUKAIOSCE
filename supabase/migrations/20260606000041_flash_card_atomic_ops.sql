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
begin
  if target_subtopics is null or jsonb_typeof(target_subtopics) <> 'array' or jsonb_array_length(target_subtopics) = 0 then
    raise exception 'Flash card subtopics payload is required.';
  end if;

  if not exists (
    select 1
    from public.flashcard_materials
    where id = target_material_id
      and created_by = target_owner_id
  ) then
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
    sort_order
  )
  select
    inserted_subtopics.id,
    trim(card_payload ->> 'front_text'),
    trim(card_payload ->> 'back_text'),
    card_order::integer
  from inserted_subtopics
  inner join jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    on inserted_subtopics.sort_order = subtopic_order::integer
  inner join jsonb_array_elements(subtopic.subtopic_payload -> 'cards') with ordinality as card(card_payload, card_order)
    on true;
end;
$$;

grant execute on function public.replace_flashcard_material_content(uuid, uuid, jsonb) to service_role;
