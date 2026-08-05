create or replace function public.is_admin()
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
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.blocks enable row level security;
alter table public.topics enable row level security;
alter table public.question_sources enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_explanations enable row level security;
alter table public.question_tags enable row level security;
alter table public.exam_templates enable row level security;
alter table public.exam_template_items enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_items enable row level security;
alter table public.answers enable row level security;
alter table public.attempt_results enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin()
);

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
with check (
  public.is_admin()
  or (
    auth.uid() = id
    and role = 'pendaftar_baru'
  )
);

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
    and auth.uid() = old.id
    and not public.is_admin() then
    raise exception 'Role profile hanya dapat diubah oleh admin.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_profile_role_change() from public;
grant execute on function public.prevent_profile_role_change() to authenticated;
grant execute on function public.prevent_profile_role_change() to service_role;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
before update on public.profiles
for each row
execute function public.prevent_profile_role_change();

drop policy if exists "profiles_update_own_without_role_change" on public.profiles;
create policy "profiles_update_own_without_role_change"
on public.profiles
for update
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
on public.subscriptions
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists "subscriptions_insert_admin" on public.subscriptions;
create policy "subscriptions_insert_admin"
on public.subscriptions
for insert
with check (
  public.is_admin()
);

drop policy if exists "subscriptions_update_admin" on public.subscriptions;
create policy "subscriptions_update_admin"
on public.subscriptions
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "payment_submissions_select_own_or_admin" on public.payment_submissions;
create policy "payment_submissions_select_own_or_admin"
on public.payment_submissions
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists "payment_submissions_insert_own" on public.payment_submissions;
create policy "payment_submissions_insert_own"
on public.payment_submissions
for insert
with check (
  auth.uid() = user_id
  and status = 'pending_review'
  and reviewer_id is null
  and reviewed_at is null
  and reviewer_notes is null
);

drop policy if exists "payment_submissions_update_admin" on public.payment_submissions;
create policy "payment_submissions_update_admin"
on public.payment_submissions
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs
for select
using (
  public.is_admin()
);

drop policy if exists "audit_logs_insert_admin" on public.audit_logs;
create policy "audit_logs_insert_admin"
on public.audit_logs
for insert
with check (
  public.is_admin()
);

drop policy if exists "blocks_select_active_or_admin" on public.blocks;
create policy "blocks_select_active_or_admin"
on public.blocks
for select
using (
  is_active
  or public.is_admin()
);

drop policy if exists "blocks_write_admin" on public.blocks;
create policy "blocks_write_admin"
on public.blocks
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "topics_select_active_or_admin" on public.topics;
create policy "topics_select_active_or_admin"
on public.topics
for select
using (
  is_active
  or public.is_admin()
);

drop policy if exists "topics_write_admin" on public.topics;
create policy "topics_write_admin"
on public.topics
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "question_sources_select_admin" on public.question_sources;
create policy "question_sources_select_admin"
on public.question_sources
for select
using (
  public.is_admin()
);

drop policy if exists "question_sources_write_admin" on public.question_sources;
create policy "question_sources_write_admin"
on public.question_sources
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "questions_select_published_or_admin" on public.questions;
create policy "questions_select_published_or_admin"
on public.questions
for select
using (
  status = 'published'
  or public.is_admin()
);

drop policy if exists "questions_write_admin" on public.questions;
create policy "questions_write_admin"
on public.questions
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "question_options_select_published_or_admin" on public.question_options;
create policy "question_options_select_published_or_admin"
on public.question_options
for select
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_options.question_id
      and (
        questions.status = 'published'
        or public.is_admin()
      )
  )
);

drop policy if exists "question_options_write_admin" on public.question_options;
create policy "question_options_write_admin"
on public.question_options
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "question_explanations_select_published_or_admin" on public.question_explanations;
create policy "question_explanations_select_published_or_admin"
on public.question_explanations
for select
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_explanations.question_id
      and (
        questions.status = 'published'
        or public.is_admin()
      )
  )
);

drop policy if exists "question_explanations_write_admin" on public.question_explanations;
create policy "question_explanations_write_admin"
on public.question_explanations
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "question_tags_select_published_or_admin" on public.question_tags;
create policy "question_tags_select_published_or_admin"
on public.question_tags
for select
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_tags.question_id
      and (
        questions.status = 'published'
        or public.is_admin()
      )
  )
);

drop policy if exists "question_tags_write_admin" on public.question_tags;
create policy "question_tags_write_admin"
on public.question_tags
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "exam_templates_select_published_or_admin" on public.exam_templates;
create policy "exam_templates_select_published_or_admin"
on public.exam_templates
for select
using (
  status = 'published'
  or public.is_admin()
);

drop policy if exists "exam_templates_write_admin" on public.exam_templates;
create policy "exam_templates_write_admin"
on public.exam_templates
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "exam_template_items_select_published_or_admin" on public.exam_template_items;
create policy "exam_template_items_select_published_or_admin"
on public.exam_template_items
for select
using (
  exists (
    select 1
    from public.exam_templates
    where exam_templates.id = exam_template_items.exam_template_id
      and (
        exam_templates.status = 'published'
        or public.is_admin()
      )
  )
);

drop policy if exists "exam_template_items_write_admin" on public.exam_template_items;
create policy "exam_template_items_write_admin"
on public.exam_template_items
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "attempts_select_own_or_admin" on public.attempts;
create policy "attempts_select_own_or_admin"
on public.attempts
for select
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "attempts_insert_own_or_admin" on public.attempts;
create policy "attempts_insert_own_or_admin"
on public.attempts
for insert
with check (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "attempts_update_own_or_admin" on public.attempts;
create policy "attempts_update_own_or_admin"
on public.attempts
for update
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "attempt_items_select_own_or_admin" on public.attempt_items;
create policy "attempt_items_select_own_or_admin"
on public.attempt_items
for select
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_items.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "attempt_items_write_admin" on public.attempt_items;
create policy "attempt_items_write_admin"
on public.attempt_items
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "answers_select_own_or_admin" on public.answers;
create policy "answers_select_own_or_admin"
on public.answers
for select
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = answers.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "answers_insert_own_or_admin" on public.answers;
create policy "answers_insert_own_or_admin"
on public.answers
for insert
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = answers.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "answers_update_own_or_admin" on public.answers;
create policy "answers_update_own_or_admin"
on public.answers
for update
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = answers.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.attempts
    where attempts.id = answers.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "attempt_results_select_own_or_admin" on public.attempt_results;
create policy "attempt_results_select_own_or_admin"
on public.attempt_results
for select
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_results.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "attempt_results_write_admin" on public.attempt_results;
create policy "attempt_results_write_admin"
on public.attempt_results
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

do $$
begin
  -- Local cold databases can exist briefly before Storage creates its tables.
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
      'payment-proofs',
      'payment-proofs',
      false,
      5242880,
      array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
    )
    on conflict (id) do update
    set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute $policy$
      drop policy if exists "payment_proofs_select_own_or_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "payment_proofs_select_own_or_admin"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'payment-proofs'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.is_admin()
        )
      )
    $policy$;

    execute $policy$
      drop policy if exists "payment_proofs_insert_own" on storage.objects
    $policy$;
    execute $policy$
      create policy "payment_proofs_insert_own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'payment-proofs'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;

    execute $policy$
      drop policy if exists "payment_proofs_delete_own_or_admin" on storage.objects
    $policy$;
    execute $policy$
      create policy "payment_proofs_delete_own_or_admin"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'payment-proofs'
        and (
          public.is_admin()
          or (
            (storage.foldername(name))[1] = auth.uid()::text
            and not exists (
              select 1
              from public.payment_submissions
              where payment_proof_path = name
            )
          )
        )
      )
    $policy$;
  end if;
end
$$;
