alter type public.app_role add value if not exists 'mentor';

create or replace function public.can_manage_question_bank()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'mentor')
  );
$$;

revoke all on function public.can_manage_question_bank() from public;
grant execute on function public.can_manage_question_bank() to authenticated;
grant execute on function public.can_manage_question_bank() to service_role;

drop policy if exists "questions_select_published_or_admin" on public.questions;
create policy "questions_select_published_or_question_bank_manager"
on public.questions
for select
using (
  status = 'published'
  or public.can_manage_question_bank()
);

drop policy if exists "questions_write_admin" on public.questions;
create policy "questions_write_question_bank_manager"
on public.questions
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);

drop policy if exists "question_options_select_published_or_admin" on public.question_options;
create policy "question_options_select_published_or_question_bank_manager"
on public.question_options
for select
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_options.question_id
      and (
        questions.status = 'published'
        or public.can_manage_question_bank()
      )
  )
);

drop policy if exists "question_options_write_admin" on public.question_options;
create policy "question_options_write_question_bank_manager"
on public.question_options
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);

drop policy if exists "question_explanations_select_published_or_admin" on public.question_explanations;
create policy "question_explanations_select_published_or_question_bank_manager"
on public.question_explanations
for select
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_explanations.question_id
      and (
        questions.status = 'published'
        or public.can_manage_question_bank()
      )
  )
);

drop policy if exists "question_explanations_write_admin" on public.question_explanations;
create policy "question_explanations_write_question_bank_manager"
on public.question_explanations
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute $policy$
      drop policy if exists "question_media_insert_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_insert_question_bank_manager"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'question-media'
        and public.can_manage_question_bank()
      )
    $policy$;

    execute $policy$
      drop policy if exists "question_media_update_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_update_question_bank_manager"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'question-media'
        and public.can_manage_question_bank()
      )
      with check (
        bucket_id = 'question-media'
        and public.can_manage_question_bank()
      )
    $policy$;

    execute $policy$
      drop policy if exists "question_media_delete_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "question_media_delete_question_bank_manager"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'question-media'
        and public.can_manage_question_bank()
      )
    $policy$;
  end if;
end
$$;
