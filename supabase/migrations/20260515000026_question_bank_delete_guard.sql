create or replace function public.delete_question(target_question_id uuid)
returns table (
  id uuid,
  question_image_path text,
  explanation_image_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_question_id uuid;
  deleted_question_image_path text;
  deleted_explanation_image_path text;
begin
  if not public.can_manage_question_bank() then
    raise exception 'Akses hapus soal hanya tersedia untuk pengelola question bank.'
      using errcode = '42501';
  end if;

  select
    questions.id,
    questions.question_image_path,
    question_explanations.explanation_image_path
  into
    deleted_question_id,
    deleted_question_image_path,
    deleted_explanation_image_path
  from public.questions
  left join public.question_explanations
    on question_explanations.question_id = questions.id
  where questions.id = target_question_id;

  if deleted_question_id is null then
    raise exception 'Soal yang ingin dihapus tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.exam_template_items
    where question_id = target_question_id
  ) or exists (
    select 1
    from public.attempt_items
    where question_id = target_question_id
  ) then
    raise exception 'Soal ini sudah dipakai di template atau riwayat try out sehingga tidak dapat dihapus.'
      using errcode = 'P0001';
  end if;

  delete from public.questions
  where id = target_question_id;

  return query
  select
    deleted_question_id,
    deleted_question_image_path,
    deleted_explanation_image_path;
end;
$$;

revoke all on function public.delete_question(uuid) from public;
grant execute on function public.delete_question(uuid) to authenticated;
grant execute on function public.delete_question(uuid) to service_role;

create or replace function public.delete_questions(target_question_ids uuid[])
returns table (
  id uuid,
  question_image_path text,
  explanation_image_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_count integer := coalesce(array_length(target_question_ids, 1), 0);
  matched_count integer := 0;
begin
  if not public.can_manage_question_bank() then
    raise exception 'Akses hapus soal hanya tersedia untuk pengelola question bank.'
      using errcode = '42501';
  end if;

  if requested_count = 0 then
    raise exception 'Pilih minimal satu soal untuk dihapus.'
      using errcode = 'P0001';
  end if;

  select count(*)
  into matched_count
  from public.questions
  where id = any (target_question_ids);

  if matched_count <> requested_count then
    raise exception 'Soal yang ingin dihapus tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.exam_template_items
    where question_id = any (target_question_ids)
  ) or exists (
    select 1
    from public.attempt_items
    where question_id = any (target_question_ids)
  ) then
    raise exception 'Soal ini sudah dipakai di template atau riwayat try out sehingga tidak dapat dihapus.'
      using errcode = 'P0001';
  end if;

  return query
  with target_rows as (
    select
      questions.id,
      questions.question_image_path,
      question_explanations.explanation_image_path
    from public.questions
    left join public.question_explanations
      on question_explanations.question_id = questions.id
    where questions.id = any (target_question_ids)
  ),
  deleted_rows as (
    delete from public.questions
    where id = any (target_question_ids)
    returning id
  )
  select
    target_rows.id,
    target_rows.question_image_path,
    target_rows.explanation_image_path
  from target_rows
  inner join deleted_rows
    on deleted_rows.id = target_rows.id
  order by array_position(target_question_ids, target_rows.id);
end;
$$;

revoke all on function public.delete_questions(uuid[]) from public;
grant execute on function public.delete_questions(uuid[]) to authenticated;
grant execute on function public.delete_questions(uuid[]) to service_role;
