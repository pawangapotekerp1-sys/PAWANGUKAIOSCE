create table if not exists public.question_draft_references (
  id uuid primary key default gen_random_uuid(),
  upload_item_id uuid not null references public.question_upload_items (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  reference_document_id uuid references public.reference_documents (id) on delete set null,
  reference_origin text not null,
  reference_label text not null,
  reference_url text,
  reference_excerpt text,
  confidence numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint question_draft_references_origin_check check (
    reference_origin in (
      'upload_original',
      'reference_library',
      'curated_external_ai',
      'manual_editor'
    )
  )
);

create index if not exists question_draft_references_item_created_idx
  on public.question_draft_references (upload_item_id, created_at desc);

create table if not exists public.question_draft_reviews (
  id uuid primary key default gen_random_uuid(),
  upload_item_id uuid not null references public.question_upload_items (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  decision text not null,
  notes text,
  previous_workflow_status text,
  next_workflow_status text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint question_draft_reviews_decision_check check (
    decision in ('approve', 'reject', 'request_changes', 'publish')
  )
);

create index if not exists question_draft_reviews_item_created_idx
  on public.question_draft_reviews (upload_item_id, created_at desc);

create or replace view public.admin_question_batch_overview
with (security_invoker = true)
as
select
  batch.id,
  batch.title,
  batch.input_format,
  batch.source_file_name,
  batch.status,
  batch.total_items,
  batch.created_by,
  batch.created_at,
  batch.updated_at,
  count(item.id) filter (where item.workflow_status = 'draft_ready') as draft_ready_count,
  count(item.id) filter (where item.workflow_status = 'needs_enrichment') as needs_enrichment_count,
  count(item.id) filter (where item.workflow_status = 'needs_review') as needs_review_count,
  count(item.id) filter (where item.workflow_status = 'enrichment_failed') as enrichment_failed_count,
  count(item.id) filter (where item.text_extraction_mode = 'ocr') as ocr_item_count
from public.question_upload_batches as batch
left join public.question_upload_items as item
  on item.batch_id = batch.id
group by
  batch.id,
  batch.title,
  batch.input_format,
  batch.source_file_name,
  batch.status,
  batch.total_items,
  batch.created_by,
  batch.created_at,
  batch.updated_at;

create or replace view public.admin_question_enrichment_queue
with (security_invoker = true)
as
select
  item.id,
  item.batch_id,
  batch.title as batch_title,
  batch.input_format,
  item.question_id,
  item.stem,
  item.workflow_status,
  item.text_extraction_mode,
  item.ocr_confidence,
  item.parse_confidence,
  item.topic_suggestion_confidence,
  suggested_topic.name as suggested_topic_name,
  item.topic_suggestion_reason,
  count(reference.id) as reference_count,
  max(review.created_at) as last_reviewed_at,
  item.created_at,
  item.updated_at
from public.question_upload_items as item
join public.question_upload_batches as batch
  on batch.id = item.batch_id
left join public.topics as suggested_topic
  on suggested_topic.id = item.suggested_topic_id
left join public.question_draft_references as reference
  on reference.upload_item_id = item.id
left join public.question_draft_reviews as review
  on review.upload_item_id = item.id
where item.workflow_status in ('needs_enrichment', 'needs_review', 'enrichment_failed')
group by
  item.id,
  item.batch_id,
  batch.title,
  batch.input_format,
  item.question_id,
  item.stem,
  item.workflow_status,
  item.text_extraction_mode,
  item.ocr_confidence,
  item.parse_confidence,
  item.topic_suggestion_confidence,
  suggested_topic.name,
  item.topic_suggestion_reason,
  item.created_at,
  item.updated_at;

alter table public.question_draft_references enable row level security;
alter table public.question_draft_reviews enable row level security;

drop policy if exists "question_draft_references_select_admin" on public.question_draft_references;
create policy "question_draft_references_select_admin"
on public.question_draft_references
for select
using (
  public.is_admin()
);

drop policy if exists "question_draft_references_write_admin" on public.question_draft_references;
create policy "question_draft_references_write_admin"
on public.question_draft_references
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "question_draft_reviews_select_admin" on public.question_draft_reviews;
create policy "question_draft_reviews_select_admin"
on public.question_draft_reviews
for select
using (
  public.is_admin()
);

drop policy if exists "question_draft_reviews_write_admin" on public.question_draft_reviews;
create policy "question_draft_reviews_write_admin"
on public.question_draft_reviews
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
