do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_state'
  ) then
    create type public.subscription_state as enum (
      'pending_review',
      'active',
      'rejected',
      'expired'
    );
  end if;
end
$$;

create or replace function public.subscription_package_duration_days(package_code text)
returns integer
language plpgsql
immutable
as $$
begin
  case package_code
    when 'sprint_14_hari' then
      return 14;
    when 'pro_30_hari' then
      return 30;
    else
      raise exception 'Kode paket langganan tidak valid.'
        using errcode = '22023';
  end case;
end;
$$;

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_code text not null,
  payment_proof_path text not null,
  proof_file_name text,
  status public.subscription_state not null default 'pending_review',
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.payment_submissions
  drop constraint if exists payment_submissions_review_metadata_check;

alter table public.payment_submissions
  add constraint payment_submissions_review_metadata_check
  check (
    (
      status = 'pending_review'
      and reviewer_id is null
      and reviewed_at is null
      and reviewer_notes is null
    )
    or (
      status <> 'pending_review'
      and reviewer_id is not null
      and reviewed_at is not null
    )
  );

alter table public.payment_submissions
  drop constraint if exists payment_submissions_package_code_check;

alter table public.payment_submissions
  add constraint payment_submissions_package_code_check
  check (package_code in ('sprint_14_hari', 'pro_30_hari'));

create index if not exists payment_submissions_user_id_created_at_idx
  on public.payment_submissions (user_id, created_at desc);

create index if not exists payment_submissions_status_created_at_idx
  on public.payment_submissions (status, created_at asc);

drop trigger if exists set_payment_submissions_updated_at on public.payment_submissions;
create trigger set_payment_submissions_updated_at
before update on public.payment_submissions
for each row
execute function public.set_updated_at();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_code text not null,
  state public.subscription_state not null default 'pending_review',
  starts_at timestamptz,
  ends_at timestamptz,
  payment_submission_id uuid references public.payment_submissions (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_active_window_check check (
    state <> 'active'
    or (
      starts_at is not null
      and ends_at is not null
      and ends_at > starts_at
    )
  )
);

alter table public.subscriptions
  drop constraint if exists subscriptions_package_code_check;

alter table public.subscriptions
  add constraint subscriptions_package_code_check
  check (package_code in ('sprint_14_hari', 'pro_30_hari'));

create index if not exists subscriptions_user_id_created_at_idx
  on public.subscriptions (user_id, created_at desc);

create index if not exists subscriptions_state_idx
  on public.subscriptions (state);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_actor_created_at_idx
  on public.audit_logs (actor_user_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.review_payment_submission(
  submission_id uuid,
  review_decision text,
  reviewer_notes text default null
)
returns public.payment_submissions
language plpgsql
set search_path = public
as $$
declare
  submission_row public.payment_submissions%rowtype;
  normalized_notes text;
  review_status public.subscription_state;
  duration_days integer;
  current_access_ends_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu.'
      using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Aksi ini hanya tersedia untuk admin.'
      using errcode = '42501';
  end if;

  if review_decision not in ('approve', 'reject') then
    raise exception 'Keputusan review tidak valid.'
      using errcode = '22023';
  end if;

  normalized_notes := nullif(btrim(reviewer_notes), '');
  review_status := case
    when review_decision = 'approve' then 'active'::public.subscription_state
    else 'rejected'::public.subscription_state
  end;

  update public.payment_submissions
  set
    status = review_status,
    reviewer_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    reviewer_notes = normalized_notes
  where id = submission_id
    and status = 'pending_review'
  returning * into submission_row;

  if not found then
    if exists (
      select 1
      from public.payment_submissions
      where id = submission_id
    ) then
      raise exception 'Submission pembayaran ini sudah direview.'
        using errcode = 'P0001';
    end if;

    raise exception 'Submission pembayaran tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  duration_days := public.subscription_package_duration_days(submission_row.package_code);

  select max(ends_at)
  into current_access_ends_at
  from public.subscriptions
  where user_id = submission_row.user_id
    and state = 'active'
    and ends_at > submission_row.reviewed_at;

  if review_decision = 'approve' then
    insert into public.subscriptions (
      user_id,
      package_code,
      state,
      starts_at,
      ends_at,
      payment_submission_id,
      reviewed_by
    )
    values (
      submission_row.user_id,
      submission_row.package_code,
      'active',
      submission_row.reviewed_at,
      coalesce(current_access_ends_at, submission_row.reviewed_at) + make_interval(days => duration_days),
      submission_row.id,
      auth.uid()
    );

    update public.profiles
    set role = 'pro'
    where id = submission_row.user_id
      and role = 'pendaftar_baru';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    case
      when review_decision = 'approve' then 'payment_submission.approved'
      else 'payment_submission.rejected'
    end,
    'payment_submission',
    submission_row.id,
    jsonb_build_object(
      'submission_id', submission_row.id,
      'user_id', submission_row.user_id,
      'package_code', submission_row.package_code,
      'decision', review_decision,
      'notes', normalized_notes
    )
  );

  return submission_row;
end;
$$;

revoke all on function public.review_payment_submission(uuid, text, text) from public;
grant execute on function public.review_payment_submission(uuid, text, text) to authenticated;
grant execute on function public.review_payment_submission(uuid, text, text) to service_role;
