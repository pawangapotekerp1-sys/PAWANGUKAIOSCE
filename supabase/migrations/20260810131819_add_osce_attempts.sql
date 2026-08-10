create table if not exists public.osce_attempts (
    id uuid primary key default gen_random_uuid(),
    station_id uuid not null references public.osce_stations (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    total_score numeric not null,
    max_score numeric not null,
    transcript jsonb not null default '[]'::jsonb,
    form_data text,
    rubric_results jsonb not null default '[]'::jsonb,
    feedback text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- Enable RLS
alter table public.osce_attempts enable row level security;

-- Policies for osce_attempts
create policy "Users can view their own osce_attempts" 
on public.osce_attempts for select 
using (auth.uid() = user_id OR public.is_admin());

create policy "Users can insert their own osce_attempts" 
on public.osce_attempts for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own osce_attempts" 
on public.osce_attempts for update 
using (auth.uid() = user_id OR public.is_admin());

create policy "Users can delete their own osce_attempts" 
on public.osce_attempts for delete 
using (auth.uid() = user_id OR public.is_admin());

-- Create updated_at trigger
create trigger set_osce_attempts_updated_at
before update on public.osce_attempts
for each row
execute function public.set_updated_at();

-- Indexes for performance
create index if not exists osce_attempts_user_id_idx on public.osce_attempts (user_id);
create index if not exists osce_attempts_station_id_idx on public.osce_attempts (station_id);
create index if not exists osce_attempts_created_at_idx on public.osce_attempts (created_at);
