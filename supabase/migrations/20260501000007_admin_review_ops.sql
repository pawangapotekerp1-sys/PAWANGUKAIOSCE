create table if not exists public.reference_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  state text not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reference_documents_state_check check (state in ('active', 'inactive'))
);

drop trigger if exists set_reference_documents_updated_at on public.reference_documents;
create trigger set_reference_documents_updated_at
before update on public.reference_documents
for each row
execute function public.set_updated_at();

create table if not exists public.reference_document_versions (
  id uuid primary key default gen_random_uuid(),
  reference_document_id uuid not null references public.reference_documents (id) on delete cascade,
  version_label text not null,
  file_name text not null,
  storage_path text,
  is_active boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reference_document_versions_document_idx
  on public.reference_document_versions (reference_document_id, created_at desc);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  reference_document_id uuid references public.reference_documents (id) on delete set null,
  job_mode text not null default 'verification',
  status text not null default 'queued',
  error_message text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ingestion_jobs_mode_check check (job_mode in ('verification', 'generation')),
  constraint ingestion_jobs_status_check check (status in ('queued', 'processing', 'needs_review', 'completed', 'failed'))
);

drop trigger if exists set_ingestion_jobs_updated_at on public.ingestion_jobs;
create trigger set_ingestion_jobs_updated_at
before update on public.ingestion_jobs
for each row
execute function public.set_updated_at();

create table if not exists public.ingested_question_candidates (
  id uuid primary key default gen_random_uuid(),
  ingestion_job_id uuid not null references public.ingestion_jobs (id) on delete cascade,
  title text not null,
  block_label text not null,
  topic_label text,
  candidate_status text not null default 'needs_review',
  evidence_summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ingested_question_candidates_status_check check (candidate_status in ('needs_review', 'conflict_found', 'approved', 'rejected', 'failed'))
);

drop trigger if exists set_ingested_question_candidates_updated_at on public.ingested_question_candidates;
create trigger set_ingested_question_candidates_updated_at
before update on public.ingested_question_candidates
for each row
execute function public.set_updated_at();

create table if not exists public.candidate_verifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.ingested_question_candidates (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  decision text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint candidate_verifications_decision_check check (decision in ('approve', 'reject', 'retry'))
);

create index if not exists candidate_verifications_candidate_created_idx
  on public.candidate_verifications (candidate_id, created_at desc);

create or replace view public.review_queue
with (security_invoker = true)
as
select
  candidate.id,
  candidate.title,
  candidate.block_label,
  candidate.topic_label,
  candidate.candidate_status,
  candidate.evidence_summary,
  ingestion_job.status as ingestion_status,
  ingestion_job.job_mode,
  ingestion_job.error_message,
  reference_document.title as reference_title,
  latest_verification.decision as latest_decision,
  latest_verification.notes as latest_notes,
  candidate.created_at
from public.ingested_question_candidates as candidate
join public.ingestion_jobs as ingestion_job
  on ingestion_job.id = candidate.ingestion_job_id
left join public.reference_documents as reference_document
  on reference_document.id = ingestion_job.reference_document_id
left join lateral (
  select
    verification.decision,
    verification.notes
  from public.candidate_verifications as verification
  where verification.candidate_id = candidate.id
  order by verification.created_at desc
  limit 1
) as latest_verification
  on true;

alter table public.reference_documents enable row level security;
alter table public.reference_document_versions enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.ingested_question_candidates enable row level security;
alter table public.candidate_verifications enable row level security;

drop policy if exists "reference_documents_select_admin" on public.reference_documents;
create policy "reference_documents_select_admin"
on public.reference_documents
for select
using (
  public.is_admin()
);

drop policy if exists "reference_documents_write_admin" on public.reference_documents;
create policy "reference_documents_write_admin"
on public.reference_documents
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "reference_document_versions_select_admin" on public.reference_document_versions;
create policy "reference_document_versions_select_admin"
on public.reference_document_versions
for select
using (
  public.is_admin()
);

drop policy if exists "reference_document_versions_write_admin" on public.reference_document_versions;
create policy "reference_document_versions_write_admin"
on public.reference_document_versions
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "ingestion_jobs_select_admin" on public.ingestion_jobs;
create policy "ingestion_jobs_select_admin"
on public.ingestion_jobs
for select
using (
  public.is_admin()
);

drop policy if exists "ingestion_jobs_write_admin" on public.ingestion_jobs;
create policy "ingestion_jobs_write_admin"
on public.ingestion_jobs
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "ingested_question_candidates_select_admin" on public.ingested_question_candidates;
create policy "ingested_question_candidates_select_admin"
on public.ingested_question_candidates
for select
using (
  public.is_admin()
);

drop policy if exists "ingested_question_candidates_write_admin" on public.ingested_question_candidates;
create policy "ingested_question_candidates_write_admin"
on public.ingested_question_candidates
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "candidate_verifications_select_admin" on public.candidate_verifications;
create policy "candidate_verifications_select_admin"
on public.candidate_verifications
for select
using (
  public.is_admin()
);

drop policy if exists "candidate_verifications_write_admin" on public.candidate_verifications;
create policy "candidate_verifications_write_admin"
on public.candidate_verifications
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
