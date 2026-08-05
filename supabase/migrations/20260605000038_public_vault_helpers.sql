create or replace function public.create_vault_secret(
  secret text,
  name text,
  description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_secret_id uuid;
begin
  select vault.create_secret(secret, name, description) into created_secret_id;
  return created_secret_id;
end;
$$;

create or replace function public.read_vault_secret(
  target_secret_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_value text;
begin
  select decrypted_secret
  into secret_value
  from vault.decrypted_secrets
  where id = target_secret_id;

  return secret_value;
end;
$$;

create or replace function public.delete_vault_secret(
  target_secret_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets
  where id = target_secret_id;
end;
$$;

revoke all on function public.create_vault_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.read_vault_secret(uuid) from public, anon, authenticated;
revoke all on function public.delete_vault_secret(uuid) from public, anon, authenticated;

grant execute on function public.create_vault_secret(text, text, text) to service_role;
grant execute on function public.read_vault_secret(uuid) to service_role;
grant execute on function public.delete_vault_secret(uuid) to service_role;
