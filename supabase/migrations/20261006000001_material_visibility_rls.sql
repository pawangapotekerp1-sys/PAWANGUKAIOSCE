-- Enforce material visibility and OSCE access in the database, not only in the UI.

-- 1. visible_to must always be an explicit list (empty list = hidden from every student).
update public.material_folders set visible_to = array['pro', 'osce_pro']::public.app_role[] where visible_to is null;
update public.material_links   set visible_to = array['pro', 'osce_pro']::public.app_role[] where visible_to is null;
alter table public.material_folders alter column visible_to set not null;
alter table public.material_links   alter column visible_to set not null;

-- 2. Students only read rows shared with their role; mentors/admins read everything.
drop policy if exists "material_folders_select_auth" on public.material_folders;
create policy "material_folders_select_auth" on public.material_folders for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role in ('admin', 'mentor') or p.role = any (visible_to))
  )
);

drop policy if exists "material_links_select_auth" on public.material_links;
create policy "material_links_select_auth" on public.material_links for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role in ('admin', 'mentor') or p.role = any (visible_to))
  )
);

-- 3. Cloning must keep the visibility of the source item (previously reset to the column default).
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
    insert into public.material_links (folder_id, title, url, embed_url, drive_type, created_by, visible_to)
    select case when p_is_root and p_new_parent_id is null then null else coalesce(p_new_parent_id, folder_id) end,
           case when p_is_root then title || ' (Copy)' else title end,
           url, embed_url, drive_type, auth.uid(), visible_to
    from public.material_links
    where id = p_item_id
    returning id into v_new_id;

    if v_new_id is null then return null; end if;

    return v_new_id;
  elsif p_item_type = 'folder' then
    insert into public.material_folders (name, parent_id, drive_type, created_by, visible_to)
    select case when p_is_root then name || ' (Copy)' else name end,
           case when p_is_root and p_new_parent_id is null then null else coalesce(p_new_parent_id, parent_id) end,
           drive_type, auth.uid(), visible_to
    from public.material_folders
    where id = p_item_id
    returning id into v_new_id;

    if v_new_id is null then return null; end if;

    for v_child in select id from public.material_folders where parent_id = p_item_id loop
      perform public.material_drive_clone_item(v_child.id, 'folder', v_new_id, false);
    end loop;

    for v_child in select id from public.material_links where folder_id = p_item_id loop
      perform public.material_drive_clone_item(v_child.id, 'link', v_new_id, false);
    end loop;

    return v_new_id;
  else
    raise exception 'Invalid item type: %', p_item_type;
  end if;
end;
$$;

-- 4. OSCE stations are only readable by Kelas OSCE, mentors and admins (was: anyone, including anon).
drop policy if exists "Anyone can view osce stations" on public.osce_stations;
create policy "osce_stations_select_allowed_roles" on public.osce_stations for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('osce_pro', 'mentor', 'admin')
  )
);
