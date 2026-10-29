-- Migration: Create live_classes table with RLS and constraints

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  zoom_link text not null,
  target_roles public.app_role[] not null default array['pro', 'osce_pro']::public.app_role[],
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_live_class_time_order check (end_time > start_time)
);

-- Index for ordering by start_time
create index if not exists idx_live_classes_start_time on public.live_classes(start_time asc);

-- Enable Row Level Security
alter table public.live_classes enable row level security;

-- Drop existing policies if any
drop policy if exists "Mentors and admins have full access to live_classes" on public.live_classes;
drop policy if exists "Students can view live_classes targeted to their role" on public.live_classes;

-- Policy for Mentors and Admins (ALL operations)
create policy "Mentors and admins have full access to live_classes"
  on public.live_classes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'mentor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'mentor')
    )
  );

-- Policy for Students (SELECT only matching target_roles)
create policy "Students can view live_classes targeted to their role"
  on public.live_classes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role in ('admin', 'mentor')
          or profiles.role = any(live_classes.target_roles)
        )
    )
  );
