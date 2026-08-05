drop policy if exists "question_upload_batches_select_admin" on public.question_upload_batches;
drop policy if exists "question_upload_batches_write_admin" on public.question_upload_batches;

create policy "question_upload_batches_select_question_bank_manager"
on public.question_upload_batches
for select
using (
  public.can_manage_question_bank()
);

create policy "question_upload_batches_write_question_bank_manager"
on public.question_upload_batches
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);

drop policy if exists "question_upload_items_select_admin" on public.question_upload_items;
drop policy if exists "question_upload_items_write_admin" on public.question_upload_items;

create policy "question_upload_items_select_question_bank_manager"
on public.question_upload_items
for select
using (
  public.can_manage_question_bank()
);

create policy "question_upload_items_write_question_bank_manager"
on public.question_upload_items
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);

drop policy if exists "question_draft_references_select_admin" on public.question_draft_references;
drop policy if exists "question_draft_references_write_admin" on public.question_draft_references;

create policy "question_draft_references_select_question_bank_manager"
on public.question_draft_references
for select
using (
  public.can_manage_question_bank()
);

create policy "question_draft_references_write_question_bank_manager"
on public.question_draft_references
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);

drop policy if exists "question_draft_reviews_select_admin" on public.question_draft_reviews;
drop policy if exists "question_draft_reviews_write_admin" on public.question_draft_reviews;

create policy "question_draft_reviews_select_question_bank_manager"
on public.question_draft_reviews
for select
using (
  public.can_manage_question_bank()
);

create policy "question_draft_reviews_write_question_bank_manager"
on public.question_draft_reviews
for all
using (
  public.can_manage_question_bank()
)
with check (
  public.can_manage_question_bank()
);
