alter table public.profiles
add column if not exists leaderboard_alias text;

create or replace function public.list_admin_users()
returns table (
  id uuid,
  email text,
  full_name text,
  leaderboard_alias text,
  role public.app_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Aksi ini hanya tersedia untuk admin.'
      using errcode = '42501';
  end if;

  return query
  select
    profiles.id,
    profiles.email,
    profiles.full_name,
    profiles.leaderboard_alias,
    profiles.role,
    profiles.created_at
  from public.profiles
  order by profiles.created_at desc, profiles.id desc;
end;
$$;

revoke all on function public.list_admin_users() from public;
grant execute on function public.list_admin_users() to authenticated;
grant execute on function public.list_admin_users() to service_role;

create or replace function public.admin_update_user_role(
  target_user_id uuid,
  target_role public.app_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu.'
      using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Aksi ini hanya tersedia untuk admin.'
      using errcode = '42501';
  end if;

  update public.profiles
  set role = target_role
  where id = target_user_id
  returning *
  into updated_profile;

  if not found then
    raise exception 'Pengguna tidak ditemukan.'
      using errcode = 'P0002';
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
    'profile.role_updated',
    'profile',
    updated_profile.id,
    jsonb_build_object(
      'target_user_id', updated_profile.id,
      'target_role', target_role
    )
  );

  return updated_profile;
end;
$$;

revoke all on function public.admin_update_user_role(uuid, public.app_role) from public;
grant execute on function public.admin_update_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_update_user_role(uuid, public.app_role) to service_role;
