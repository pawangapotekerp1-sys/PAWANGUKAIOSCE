alter table public.questions
drop constraint if exists questions_status_check;

alter table public.questions
add constraint questions_status_check
check (
  status in (
    'draft',
    'draft_ready',
    'needs_enrichment',
    'needs_review',
    'approved',
    'published',
    'archived',
    'rejected',
    'enrichment_failed'
  )
);

create table if not exists public.question_upload_batches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  input_format text not null,
  source_file_name text,
  status text not null default 'processing',
  total_items integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_upload_batches_input_format_check check (
    input_format in ('pdf', 'docx', 'csv', 'xlsx', 'manual')
  ),
  constraint question_upload_batches_status_check check (
    status in ('processing', 'completed', 'completed_with_issues', 'failed')
  )
);

create index if not exists question_upload_batches_status_created_idx
  on public.question_upload_batches (status, created_at desc);

drop trigger if exists set_question_upload_batches_updated_at on public.question_upload_batches;
create trigger set_question_upload_batches_updated_at
before update on public.question_upload_batches
for each row
execute function public.set_updated_at();

create table if not exists public.question_upload_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.question_upload_batches (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  source_row_number integer,
  stem text,
  options_snapshot jsonb not null default '[]'::jsonb,
  correct_option_key text,
  explanation text,
  explanation_source text,
  block_id uuid references public.blocks (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  suggested_topic_id uuid references public.topics (id) on delete set null,
  topic_suggestion_confidence numeric(5,4),
  topic_suggestion_reason text,
  text_extraction_mode text,
  ocr_confidence numeric(5,4),
  parse_confidence numeric(5,4),
  raw_payload jsonb not null default '{}'::jsonb,
  parse_error text,
  workflow_status text not null default 'needs_review',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_upload_items_text_extraction_mode_check check (
    text_extraction_mode is null
    or text_extraction_mode in ('direct_text', 'ocr')
  ),
  constraint question_upload_items_workflow_status_check check (
    workflow_status in (
      'draft_ready',
      'needs_enrichment',
      'needs_review',
      'approved',
      'published',
      'rejected',
      'enrichment_failed'
    )
  ),
  constraint question_upload_items_correct_option_key_check check (
    correct_option_key is null or char_length(correct_option_key) = 1
  )
);

create index if not exists question_upload_items_batch_status_idx
  on public.question_upload_items (batch_id, workflow_status);

create index if not exists question_upload_items_suggested_topic_idx
  on public.question_upload_items (suggested_topic_id, topic_suggestion_confidence desc);

create index if not exists question_upload_items_created_by_idx
  on public.question_upload_items (created_by, created_at desc);

drop trigger if exists set_question_upload_items_updated_at on public.question_upload_items;
create trigger set_question_upload_items_updated_at
before update on public.question_upload_items
for each row
execute function public.set_updated_at();

alter table public.question_upload_batches enable row level security;
alter table public.question_upload_items enable row level security;

drop policy if exists "question_upload_batches_select_admin" on public.question_upload_batches;
create policy "question_upload_batches_select_admin"
on public.question_upload_batches
for select
using (
  public.is_admin()
);

drop policy if exists "question_upload_batches_write_admin" on public.question_upload_batches;
create policy "question_upload_batches_write_admin"
on public.question_upload_batches
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "question_upload_items_select_admin" on public.question_upload_items;
create policy "question_upload_items_select_admin"
on public.question_upload_items
for select
using (
  public.is_admin()
);

drop policy if exists "question_upload_items_write_admin" on public.question_upload_items;
create policy "question_upload_items_write_admin"
on public.question_upload_items
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
