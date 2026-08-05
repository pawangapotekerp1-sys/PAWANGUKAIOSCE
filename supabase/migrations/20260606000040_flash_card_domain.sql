create table if not exists public.flashcard_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  academic_group text not null,
  status text not null default 'draft',
  global_summary text,
  processing_error text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint flashcard_materials_academic_group_check check (
    academic_group in (
      'pharmaceutical_science',
      'clinical_science',
      'social_behavioral_and_administration'
    )
  ),
  constraint flashcard_materials_status_check check (
    status in ('draft', 'processing', 'ready_for_review', 'published', 'failed')
  )
);

create index if not exists flashcard_materials_created_by_idx
  on public.flashcard_materials (created_by, created_at desc);

create index if not exists flashcard_materials_status_idx
  on public.flashcard_materials (status, academic_group, published_at desc nulls last);

drop trigger if exists set_flashcard_materials_updated_at on public.flashcard_materials;
create trigger set_flashcard_materials_updated_at
before update on public.flashcard_materials
for each row
execute function public.set_updated_at();

create table if not exists public.flashcard_source_files (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.flashcard_materials (id) on delete cascade,
  file_kind text not null,
  storage_bucket text not null,
  storage_path text not null unique,
  original_file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  extraction_status text not null default 'pending',
  delete_after_publish boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint flashcard_source_files_file_kind_check check (
    file_kind in ('transcript', 'slide_pdf')
  ),
  constraint flashcard_source_files_extraction_status_check check (
    extraction_status in ('pending', 'processing', 'completed', 'failed', 'deleted')
  ),
  constraint flashcard_source_files_size_bytes_check check (
    size_bytes >= 0
  )
);

create index if not exists flashcard_source_files_material_id_idx
  on public.flashcard_source_files (material_id, file_kind);

drop trigger if exists set_flashcard_source_files_updated_at on public.flashcard_source_files;
create trigger set_flashcard_source_files_updated_at
before update on public.flashcard_source_files
for each row
execute function public.set_updated_at();

create table if not exists public.flashcard_subtopics (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.flashcard_materials (id) on delete cascade,
  title text not null,
  summary text not null,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint flashcard_subtopics_sort_order_check check (
    sort_order >= 1
  )
);

create unique index if not exists flashcard_subtopics_material_order_uidx
  on public.flashcard_subtopics (material_id, sort_order);

create index if not exists flashcard_subtopics_material_id_idx
  on public.flashcard_subtopics (material_id);

drop trigger if exists set_flashcard_subtopics_updated_at on public.flashcard_subtopics;
create trigger set_flashcard_subtopics_updated_at
before update on public.flashcard_subtopics
for each row
execute function public.set_updated_at();

create table if not exists public.flashcard_cards (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.flashcard_subtopics (id) on delete cascade,
  front_text text not null,
  back_text text not null,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint flashcard_cards_sort_order_check check (
    sort_order >= 1
  )
);

create unique index if not exists flashcard_cards_subtopic_order_uidx
  on public.flashcard_cards (subtopic_id, sort_order);

create index if not exists flashcard_cards_subtopic_id_idx
  on public.flashcard_cards (subtopic_id);

drop trigger if exists set_flashcard_cards_updated_at on public.flashcard_cards;
create trigger set_flashcard_cards_updated_at
before update on public.flashcard_cards
for each row
execute function public.set_updated_at();

create table if not exists public.student_flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.flashcard_cards (id) on delete cascade,
  difficulty text not null,
  last_reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint student_flashcard_progress_difficulty_check check (
    difficulty in ('easy', 'medium', 'hard')
  ),
  constraint student_flashcard_progress_user_card_uidx unique (user_id, card_id)
);

create index if not exists student_flashcard_progress_user_id_idx
  on public.student_flashcard_progress (user_id, last_reviewed_at desc);

create index if not exists student_flashcard_progress_card_id_idx
  on public.student_flashcard_progress (card_id);

drop trigger if exists set_student_flashcard_progress_updated_at on public.student_flashcard_progress;
create trigger set_student_flashcard_progress_updated_at
before update on public.student_flashcard_progress
for each row
execute function public.set_updated_at();

alter table public.flashcard_materials enable row level security;
alter table public.flashcard_source_files enable row level security;
alter table public.flashcard_subtopics enable row level security;
alter table public.flashcard_cards enable row level security;
alter table public.student_flashcard_progress enable row level security;

drop policy if exists "flashcard_materials_select_published_or_manager" on public.flashcard_materials;
create policy "flashcard_materials_select_published_or_manager"
on public.flashcard_materials
for select
using (
  status = 'published'
  or (
    created_by = auth.uid()
    and public.can_manage_question_bank()
  )
);

drop policy if exists "flashcard_materials_manage_owner" on public.flashcard_materials;
create policy "flashcard_materials_manage_owner"
on public.flashcard_materials
for all
using (
  created_by = auth.uid()
  and public.can_manage_question_bank()
)
with check (
  created_by = auth.uid()
  and public.can_manage_question_bank()
);

drop policy if exists "flashcard_source_files_manage_owner" on public.flashcard_source_files;
create policy "flashcard_source_files_manage_owner"
on public.flashcard_source_files
for all
using (
  exists (
    select 1
    from public.flashcard_materials
    where flashcard_materials.id = flashcard_source_files.material_id
      and flashcard_materials.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
)
with check (
  exists (
    select 1
    from public.flashcard_materials
    where flashcard_materials.id = flashcard_source_files.material_id
      and flashcard_materials.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
);

drop policy if exists "flashcard_subtopics_select_published_or_manager" on public.flashcard_subtopics;
create policy "flashcard_subtopics_select_published_or_manager"
on public.flashcard_subtopics
for select
using (
  exists (
    select 1
    from public.flashcard_materials
    where flashcard_materials.id = flashcard_subtopics.material_id
      and (
        flashcard_materials.status = 'published'
        or (
          flashcard_materials.created_by = auth.uid()
          and public.can_manage_question_bank()
        )
      )
  )
);

drop policy if exists "flashcard_subtopics_manage_owner" on public.flashcard_subtopics;
create policy "flashcard_subtopics_manage_owner"
on public.flashcard_subtopics
for all
using (
  exists (
    select 1
    from public.flashcard_materials
    where flashcard_materials.id = flashcard_subtopics.material_id
      and flashcard_materials.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
)
with check (
  exists (
    select 1
    from public.flashcard_materials
    where flashcard_materials.id = flashcard_subtopics.material_id
      and flashcard_materials.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
);

drop policy if exists "flashcard_cards_select_published_or_manager" on public.flashcard_cards;
create policy "flashcard_cards_select_published_or_manager"
on public.flashcard_cards
for select
using (
  exists (
    select 1
    from public.flashcard_subtopics
    inner join public.flashcard_materials
      on public.flashcard_materials.id = public.flashcard_subtopics.material_id
    where public.flashcard_subtopics.id = flashcard_cards.subtopic_id
      and (
        public.flashcard_materials.status = 'published'
        or (
          public.flashcard_materials.created_by = auth.uid()
          and public.can_manage_question_bank()
        )
      )
  )
);

drop policy if exists "flashcard_cards_manage_owner" on public.flashcard_cards;
create policy "flashcard_cards_manage_owner"
on public.flashcard_cards
for all
using (
  exists (
    select 1
    from public.flashcard_subtopics
    inner join public.flashcard_materials
      on public.flashcard_materials.id = public.flashcard_subtopics.material_id
    where public.flashcard_subtopics.id = flashcard_cards.subtopic_id
      and public.flashcard_materials.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
)
with check (
  exists (
    select 1
    from public.flashcard_subtopics
    inner join public.flashcard_materials
      on public.flashcard_materials.id = public.flashcard_subtopics.material_id
    where public.flashcard_subtopics.id = flashcard_cards.subtopic_id
      and public.flashcard_materials.created_by = auth.uid()
      and public.can_manage_question_bank()
  )
);

drop policy if exists "student_flashcard_progress_select_own" on public.student_flashcard_progress;
create policy "student_flashcard_progress_select_own"
on public.student_flashcard_progress
for select
using (
  user_id = auth.uid()
);

drop policy if exists "student_flashcard_progress_upsert_own" on public.student_flashcard_progress;
create policy "student_flashcard_progress_upsert_own"
on public.student_flashcard_progress
for all
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

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
      'flash-card-sources',
      'flash-card-sources',
      false,
      52428800,
      array[
        'text/plain',
        'text/markdown',
        'application/pdf'
      ]
    )
    on conflict (id) do update
    set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute $policy$
      drop policy if exists "flash_card_sources_select_owner" on storage.objects
    $policy$;
    execute $policy$
      create policy "flash_card_sources_select_owner"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'flash-card-sources'
        and public.can_manage_question_bank()
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;

    execute $policy$
      drop policy if exists "flash_card_sources_insert_owner" on storage.objects
    $policy$;
    execute $policy$
      create policy "flash_card_sources_insert_owner"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'flash-card-sources'
        and public.can_manage_question_bank()
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;

    execute $policy$
      drop policy if exists "flash_card_sources_delete_owner" on storage.objects
    $policy$;
    execute $policy$
      create policy "flash_card_sources_delete_owner"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'flash-card-sources'
        and public.can_manage_question_bank()
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    $policy$;
  end if;
end
$$;
