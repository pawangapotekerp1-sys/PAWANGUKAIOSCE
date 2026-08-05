create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists blocks_sort_order_idx
  on public.blocks (sort_order);

drop trigger if exists set_blocks_updated_at on public.blocks;
create trigger set_blocks_updated_at
before update on public.blocks
for each row
execute function public.set_updated_at();

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks (id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists topics_block_id_idx
  on public.topics (block_id);

create unique index if not exists topics_block_sort_order_idx
  on public.topics (block_id, sort_order);

drop trigger if exists set_topics_updated_at on public.topics;
create trigger set_topics_updated_at
before update on public.topics
for each row
execute function public.set_updated_at();

create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null default 'manual',
  reference_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_question_sources_updated_at on public.question_sources;
create trigger set_question_sources_updated_at
before update on public.question_sources
for each row
execute function public.set_updated_at();

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  stem text not null,
  block_id uuid not null references public.blocks (id) on delete restrict,
  topic_id uuid references public.topics (id) on delete set null,
  source_id uuid references public.question_sources (id) on delete set null,
  difficulty_level smallint,
  status text not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint questions_status_check check (status in ('draft', 'published', 'archived'))
);

create index if not exists questions_block_id_status_idx
  on public.questions (block_id, status);

create index if not exists questions_topic_id_idx
  on public.questions (topic_id);

drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_key text not null,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order smallint not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_options_key_check check (char_length(option_key) = 1)
);

create unique index if not exists question_options_question_key_idx
  on public.question_options (question_id, option_key);

create unique index if not exists question_options_question_sort_idx
  on public.question_options (question_id, sort_order);

drop trigger if exists set_question_options_updated_at on public.question_options;
create trigger set_question_options_updated_at
before update on public.question_options
for each row
execute function public.set_updated_at();

create table if not exists public.question_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  explanation text not null,
  explanation_source text not null default 'manual',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_question_explanations_updated_at on public.question_explanations;
create trigger set_question_explanations_updated_at
before update on public.question_explanations
for each row
execute function public.set_updated_at();

create table if not exists public.question_tags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists question_tags_question_tag_idx
  on public.question_tags (question_id, tag);
