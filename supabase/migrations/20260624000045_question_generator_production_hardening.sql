update public.generator_user_settings
set secret_hint = coalesce(nullif(btrim(secret_hint), ''), 'configured')
where secret_hint is null
   or btrim(secret_hint) = '';

alter table public.generator_user_settings
  alter column secret_hint set not null;

alter table public.question_generation_references
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.question_generation_references
  drop constraint if exists question_generation_references_reference_order_check;

alter table public.question_generation_references
  add constraint question_generation_references_reference_order_check check (
    reference_order >= 1
  );

drop trigger if exists set_question_generation_references_updated_at on public.question_generation_references;
create trigger set_question_generation_references_updated_at
before update on public.question_generation_references
for each row
execute function public.set_updated_at();

drop index if exists public.question_generation_references_batch_id_idx;
create index if not exists question_generation_references_batch_id_idx
  on public.question_generation_references (batch_id);

create unique index if not exists question_generation_references_batch_order_uidx
  on public.question_generation_references (batch_id, reference_order);

update public.question_generation_items
set draft_question_id = null
where draft_question_id is not null
  and not exists (
    select 1
    from public.question_upload_items
    where question_upload_items.id = question_generation_items.draft_question_id
  );

alter table public.question_generation_items
  drop constraint if exists question_generation_items_status_check;

alter table public.question_generation_items
  add constraint question_generation_items_status_check check (
    status in ('draft_generated', 'draft_edited')
  );

alter table public.question_generation_items
  drop constraint if exists question_generation_items_draft_question_id_fkey;

alter table public.question_generation_items
  add constraint question_generation_items_draft_question_id_fkey
  foreign key (draft_question_id)
  references public.question_upload_items (id)
  on delete set null;

drop index if exists public.question_generation_items_batch_id_idx;
create index if not exists question_generation_items_batch_id_idx
  on public.question_generation_items (batch_id);

create unique index if not exists question_generation_items_batch_order_uidx
  on public.question_generation_items (batch_id, item_order);

create index if not exists question_generation_items_draft_question_id_idx
  on public.question_generation_items (draft_question_id);

create index if not exists question_generation_deliveries_item_id_idx
  on public.question_generation_deliveries (generation_item_id, created_at desc);

create unique index if not exists question_generation_deliveries_item_bank_destination_uidx
  on public.question_generation_deliveries (generation_item_id, block_id, topic_id)
  where destination_type = 'question_bank';

create unique index if not exists question_generation_deliveries_item_event_destination_uidx
  on public.question_generation_deliveries (generation_item_id, destination_event_id)
  where destination_type = 'scheduled_event';

drop policy if exists "generator_user_settings_select_own" on public.generator_user_settings;
drop policy if exists "generator_user_settings_write_own" on public.generator_user_settings;
drop policy if exists "question_generation_batches_select_own" on public.question_generation_batches;
drop policy if exists "question_generation_batches_write_own" on public.question_generation_batches;
drop policy if exists "question_generation_references_select_own" on public.question_generation_references;
drop policy if exists "question_generation_references_write_own" on public.question_generation_references;
drop policy if exists "question_generation_items_select_own" on public.question_generation_items;
drop policy if exists "question_generation_items_write_own" on public.question_generation_items;
drop policy if exists "question_generation_deliveries_select_own" on public.question_generation_deliveries;
drop policy if exists "question_generation_deliveries_write_own" on public.question_generation_deliveries;

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
