alter type public.attempt_status add value if not exists 'paused' after 'in_progress';

alter table public.attempts
  add column if not exists elapsed_seconds integer not null default 0,
  add column if not exists last_resumed_at timestamptz,
  add column if not exists paused_at timestamptz;

update public.attempts
set last_resumed_at = started_at
where status = 'in_progress'
  and last_resumed_at is null;

update public.attempts
set elapsed_seconds = greatest(
  0,
  least(
    time_limit_seconds,
    extract(epoch from (submitted_at - started_at))::integer
  )
)
where status = 'submitted'
  and submitted_at is not null
  and elapsed_seconds = 0;
