import { Client } from 'pg';

const sql = `
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

alter table public.osce_attempts enable row level security;

create policy "Users can view their own osce_attempts" 
on public.osce_attempts for select 
using (auth.uid() = user_id);

create policy "Users can insert their own osce_attempts" 
on public.osce_attempts for insert 
with check (auth.uid() = user_id);

create trigger set_osce_attempts_updated_at
before update on public.osce_attempts
for each row
execute function public.handle_updated_at();

create index if not exists osce_attempts_user_id_idx on public.osce_attempts (user_id);
create index if not exists osce_attempts_station_id_idx on public.osce_attempts (station_id);
create index if not exists osce_attempts_created_at_idx on public.osce_attempts (created_at);
`;

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function run() {
  await client.connect();
  console.log("Connected to local database.");
  try {
    await client.query(sql);
    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
