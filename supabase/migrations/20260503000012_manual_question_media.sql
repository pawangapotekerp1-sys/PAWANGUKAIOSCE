alter table public.questions
  add column if not exists question_image_path text;

alter table public.question_explanations
  alter column explanation drop not null;

alter table public.question_explanations
  add column if not exists explanation_image_path text;

alter table public.attempt_items
  add column if not exists question_image_path text;

do $$
begin
  if to_regclass('storage.buckets') is not null
    and to_regclass('storage.objects') is not null then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    values (
      'question-media',
      'question-media',
      false,
      10485760,
      array['image/png', 'image/jpeg', 'image/webp']
    )
    on conflict (id) do update
    set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute $policy$
      drop policy if exists "question_media_select_authenticated" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_select_authenticated"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'question-media'
      )
    $policy$;

    execute $policy$
      drop policy if exists "question_media_insert_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_insert_admin"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'question-media'
        and public.is_admin()
      )
    $policy$;

    execute $policy$
      drop policy if exists "question_media_update_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_update_admin"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'question-media'
        and public.is_admin()
      )
      with check (
        bucket_id = 'question-media'
        and public.is_admin()
      )
    $policy$;

    execute $policy$
      drop policy if exists "question_media_delete_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_delete_admin"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'question-media'
        and public.is_admin()
      )
    $policy$;
  end if;
end
$$;
