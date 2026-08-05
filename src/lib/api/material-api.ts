import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../supabase/browser-client";

export type MaterialDriveType = "VIDEO" | "PPT";

export interface MaterialFolder {
  id: string;
  name: string;
  parent_id: string | null;
  drive_type: MaterialDriveType;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialLink {
  id: string;
  folder_id: string | null;
  title: string;
  url: string;
  embed_url: string;
  drive_type: MaterialDriveType;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function getFolders({
  client = getSupabaseBrowserClient(),
  driveType,
  parentId,
}: {
  client?: SupabaseClient;
  driveType: MaterialDriveType;
  parentId?: string | null;
}): Promise<MaterialFolder[]> {
  let query = client
    .from("material_folders")
    .select("*")
    .eq("drive_type", driveType);
    
  if (parentId !== undefined) {
    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as MaterialFolder[];
}

export async function getLinks({
  client = getSupabaseBrowserClient(),
  driveType,
  folderId = null,
}: {
  client?: SupabaseClient;
  driveType: MaterialDriveType;
  folderId?: string | null;
}): Promise<MaterialLink[]> {
  let query = client
    .from("material_links")
    .select("*")
    .eq("drive_type", driveType);
    
  if (folderId) {
    query = query.eq("folder_id", folderId);
  } else {
    query = query.is("folder_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as MaterialLink[];
}

export async function createFolder({
  client = getSupabaseBrowserClient(),
  name,
  driveType,
  parentId = null,
}: {
  client?: SupabaseClient;
  name: string;
  driveType: MaterialDriveType;
  parentId?: string | null;
}): Promise<MaterialFolder> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("material_folders")
    .insert({
      name,
      drive_type: driveType,
      parent_id: parentId,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MaterialFolder;
}

export async function createLink({
  client = getSupabaseBrowserClient(),
  title,
  url,
  embedUrl,
  driveType,
  folderId = null,
}: {
  client?: SupabaseClient;
  title: string;
  url: string;
  embedUrl: string;
  driveType: MaterialDriveType;
  folderId?: string | null;
}): Promise<MaterialLink> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("material_links")
    .insert({
      title,
      url,
      embed_url: embedUrl,
      drive_type: driveType,
      folder_id: folderId,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MaterialLink;
}

export async function moveItem({
  client = getSupabaseBrowserClient(),
  itemId,
  itemType,
  newParentId = null,
}: {
  client?: SupabaseClient;
  itemId: string;
  itemType: "folder" | "link";
  newParentId?: string | null;
}): Promise<void> {
  const { error } = await client.rpc("material_drive_move_item", {
    p_item_id: itemId,
    p_item_type: itemType,
    p_new_parent_id: newParentId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function cloneItem({
  client = getSupabaseBrowserClient(),
  itemId,
  itemType,
  newParentId = null,
  isRoot = true,
}: {
  client?: SupabaseClient;
  itemId: string;
  itemType: "folder" | "link";
  newParentId?: string | null;
  isRoot?: boolean;
}): Promise<string> {
  const { data, error } = await client.rpc("material_drive_clone_item", {
    p_item_id: itemId,
    p_item_type: itemType,
    p_new_parent_id: newParentId,
    p_is_root: isRoot,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function deleteFolder({
  client = getSupabaseBrowserClient(),
  id,
}: {
  client?: SupabaseClient;
  id: string;
}): Promise<void> {
  const { error } = await client
    .from("material_folders")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteLink({
  client = getSupabaseBrowserClient(),
  id,
}: {
  client?: SupabaseClient;
  id: string;
}): Promise<void> {
  const { error } = await client
    .from("material_links")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
