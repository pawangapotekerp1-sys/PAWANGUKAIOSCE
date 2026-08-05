-- supabase/migrations/20260725000001_material_drive.sql
create type public.material_drive_type as enum ('VIDEO', 'PPT');

create table if not exists public.material_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.material_folders (id) on delete cascade,
  drive_type public.material_drive_type not null,
  created_by uuid references auth.users (id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.material_links (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.material_folders (id) on delete cascade,
  title text not null,
  url text not null,
  embed_url text not null,
  drive_type public.material_drive_type not null,
  created_by uuid references auth.users (id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_material_folders_updated_at on public.material_folders;
create trigger set_material_folders_updated_at
  before update on public.material_folders
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_material_links_updated_at on public.material_links;
create trigger set_material_links_updated_at
  before update on public.material_links
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.material_folders enable row level security;
alter table public.material_links enable row level security;

-- Global Read for Authenticated
create policy "material_folders_select_auth" on public.material_folders for select to authenticated using (true);
create policy "material_links_select_auth" on public.material_links for select to authenticated using (true);

-- Admin/Mentor Write Policies
create policy "material_folders_insert_mentor" on public.material_folders for insert to authenticated with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'))
);
create policy "material_folders_update_mentor" on public.material_folders for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'))
);
create policy "material_folders_delete_mentor" on public.material_folders for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'))
);

create policy "material_links_insert_mentor" on public.material_links for insert to authenticated with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'))
);
create policy "material_links_update_mentor" on public.material_links for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'))
);
create policy "material_links_delete_mentor" on public.material_links for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'))
);

-- RPC for cloning item
create or replace function public.material_drive_clone_item(
  p_item_id uuid,
  p_item_type text,
  p_new_parent_id uuid default null,
  p_is_root boolean default true
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_id uuid;
  v_child record;
begin
  if p_item_type = 'link' then
    insert into public.material_links (folder_id, title, url, embed_url, drive_type, created_by)
    select case when p_is_root and p_new_parent_id is null then null else coalesce(p_new_parent_id, folder_id) end,
           case when p_is_root then title || ' (Copy)' else title end,
           url, embed_url, drive_type, auth.uid()
    from public.material_links
    where id = p_item_id
    returning id into v_new_id;
    
    if v_new_id is null then return null; end if;
    
    return v_new_id;
  elsif p_item_type = 'folder' then
    insert into public.material_folders (name, parent_id, drive_type, created_by)
    select case when p_is_root then name || ' (Copy)' else name end,
           case when p_is_root and p_new_parent_id is null then null else coalesce(p_new_parent_id, parent_id) end, drive_type, auth.uid()
    from public.material_folders
    where id = p_item_id
    returning id into v_new_id;

    if v_new_id is null then return null; end if;

    -- recursively clone children folders
    for v_child in select id from public.material_folders where parent_id = p_item_id loop
      perform public.material_drive_clone_item(v_child.id, 'folder', v_new_id, false);
    end loop;

    -- recursively clone children links
    for v_child in select id from public.material_links where folder_id = p_item_id loop
      perform public.material_drive_clone_item(v_child.id, 'link', v_new_id, false);
    end loop;

    return v_new_id;
  else
    raise exception 'Invalid item type: %', p_item_type;
  end if;
end;
$$;

-- RPC for moving item
create or replace function public.material_drive_move_item(
  p_item_id uuid,
  p_item_type text,
  p_new_parent_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_item_type = 'link' then
    update public.material_links
    set folder_id = p_new_parent_id, updated_at = now()
    where id = p_item_id;
  elsif p_item_type = 'folder' then
    if p_new_parent_id is not null then
      if p_new_parent_id = p_item_id then
        raise exception 'Cannot move a folder into itself';
      end if;

      declare
        v_is_descendant boolean;
      begin
        with recursive tree as (
          select id, parent_id from public.material_folders where id = p_new_parent_id
          union all
          select f.id, f.parent_id from public.material_folders f
          inner join tree t on f.id = t.parent_id
        )
        select exists (
          select 1 from tree where id = p_item_id
        ) into v_is_descendant;

        if v_is_descendant then
          raise exception 'Cannot move a folder into its descendant';
        end if;
      end;
    end if;

    update public.material_folders
    set parent_id = p_new_parent_id, updated_at = now()
    where id = p_item_id;
  else
    raise exception 'Invalid item type: %', p_item_type;
  end if;
end;
$$;
