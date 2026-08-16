create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'disabled' check (provider in ('gemini', 'disabled')),
  enabled boolean not null default false,
  model text not null default 'gemini-3.7-flash',
  prompt_version text,
  insight_mode text not null default 'rules' check (insight_mode in ('rules', 'hybrid', 'ai')),
  platform_secret_id uuid,
  secret_hint text,
  last_tested_at timestamptz,
  last_test_status text check (last_test_status in ('success', 'error')),
  last_test_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_ai_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  provider text not null default 'gemini' check (provider in ('gemini')),
  model text not null default 'gemini-3.7-flash',
  secret_id uuid,
  secret_hint text,
  last_validated_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  config_id uuid references public.ai_provider_configs(id) on delete set null,
  credential_id uuid references public.user_ai_credentials(id) on delete set null,
  request_kind text not null check (request_kind in ('platform_test', 'student_test', 'student_insight')),
  source text not null default 'edge_function',
  model text,
  status text not null check (status in ('success', 'error')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_usage_logs_user_id_created_at_idx
  on public.ai_usage_logs (user_id, created_at desc);

create index if not exists ai_usage_logs_request_kind_created_at_idx
  on public.ai_usage_logs (request_kind, created_at desc);

drop trigger if exists set_ai_provider_configs_updated_at on public.ai_provider_configs;
create trigger set_ai_provider_configs_updated_at
before update on public.ai_provider_configs
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_ai_credentials_updated_at on public.user_ai_credentials;
create trigger set_user_ai_credentials_updated_at
before update on public.user_ai_credentials
for each row
execute function public.set_updated_at();

alter table public.ai_provider_configs enable row level security;
alter table public.user_ai_credentials enable row level security;
alter table public.ai_usage_logs enable row level security;

insert into public.ai_provider_configs (
  provider,
  enabled,
  model,
  prompt_version,
  insight_mode,
  secret_hint
)
select
  'disabled',
  false,
  'gemini-3.7-flash',
  'phase1-v1',
  'rules',
  null
where not exists (
  select 1
  from public.ai_provider_configs
);
