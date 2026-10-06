-- Trigger to cascade visibility changes from a folder to all its children (links and subfolders).

create or replace function public.material_folder_visibility_cascade()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.visible_to is distinct from old.visible_to then
    -- Cascade to child folders
    update public.material_folders
    set visible_to = new.visible_to
    where parent_id = new.id
      and visible_to is distinct from new.visible_to;

    -- Cascade to child links
    update public.material_links
    set visible_to = new.visible_to
    where folder_id = new.id
      and visible_to is distinct from new.visible_to;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_material_folder_visibility_cascade on public.material_folders;
create trigger trigger_material_folder_visibility_cascade
  after update of visible_to on public.material_folders
  for each row
  execute function public.material_folder_visibility_cascade();
