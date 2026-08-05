create index if not exists ingestion_jobs_reference_document_created_idx
  on public.ingestion_jobs (reference_document_id, created_at desc);

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
      'reference-library',
      'reference-library',
      false,
      15728640,
      array['application/pdf']
    )
    on conflict (id) do update
    set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute $policy$
      drop policy if exists "reference_library_select_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "reference_library_select_admin"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'reference-library'
        and public.is_admin()
      )
    $policy$;

    execute $policy$
      drop policy if exists "reference_library_insert_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "reference_library_insert_admin"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'reference-library'
        and public.is_admin()
      )
    $policy$;

    execute $policy$
      drop policy if exists "reference_library_update_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "reference_library_update_admin"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'reference-library'
        and public.is_admin()
      )
      with check (
        bucket_id = 'reference-library'
        and public.is_admin()
      )
    $policy$;

    execute $policy$
      drop policy if exists "reference_library_delete_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "reference_library_delete_admin"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'reference-library'
        and public.is_admin()
      )
    $policy$;
  end if;
end
$$;
