import { getSupabaseBrowserClient } from "../supabase/browser-client";

export type AdminBlocksClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from">;

export type AdminBlockRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  icon_name: string | null;
  color_theme: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminTopicRow = {
  id: string;
  block_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminBlock = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  iconName: string | null;
  colorTheme: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTopic = {
  id: string;
  blockId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminBlockInput = {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
  sort_order?: number;
  iconName?: string | null;
  icon_name?: string | null;
  colorTheme?: string | null;
  color_theme?: string | null;
  isActive?: boolean;
  is_active?: boolean;
};

export type UpdateAdminBlockInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  sort_order?: number;
  iconName?: string | null;
  icon_name?: string | null;
  colorTheme?: string | null;
  color_theme?: string | null;
  isActive?: boolean;
  is_active?: boolean;
};

export type CreateAdminTopicInput = {
  blockId?: string;
  block_id?: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
  sort_order?: number;
  isActive?: boolean;
  is_active?: boolean;
};

export type UpdateAdminTopicInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  sort_order?: number;
  isActive?: boolean;
  is_active?: boolean;
};

export function mapAdminBlock(row: AdminBlockRow): AdminBlock {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    iconName: row.icon_name ?? null,
    colorTheme: row.color_theme ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAdminTopic(row: AdminTopicRow): AdminTopic {
  return {
    id: row.id,
    blockId: row.block_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAdminBlocks(
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<AdminBlock[]> {
  const { data, error } = await client
    .from("blocks")
    .select("id, name, slug, description, sort_order, is_active, icon_name, color_theme, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdminBlockRow[]).map(mapAdminBlock);
}

export async function createAdminBlock(
  data: CreateAdminBlockInput,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<AdminBlock> {
  const payload = {
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    sort_order: data.sortOrder ?? data.sort_order ?? 0,
    icon_name: data.iconName ?? data.icon_name ?? null,
    color_theme: data.colorTheme ?? data.color_theme ?? null,
    is_active: data.isActive ?? data.is_active ?? true,
  };

  const { data: result, error } = await client
    .from("blocks")
    .insert(payload)
    .select("id, name, slug, description, sort_order, is_active, icon_name, color_theme, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminBlock(result as AdminBlockRow);
}

export async function updateAdminBlock(
  id: string,
  data: UpdateAdminBlockInput,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<AdminBlock> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.description !== undefined) payload.description = data.description;
  if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
  else if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
  if (data.iconName !== undefined) payload.icon_name = data.iconName;
  else if (data.icon_name !== undefined) payload.icon_name = data.icon_name;
  if (data.colorTheme !== undefined) payload.color_theme = data.colorTheme;
  else if (data.color_theme !== undefined) payload.color_theme = data.color_theme;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  else if (data.is_active !== undefined) payload.is_active = data.is_active;

  const { data: result, error } = await client
    .from("blocks")
    .update(payload)
    .eq("id", id)
    .select("id, name, slug, description, sort_order, is_active, icon_name, color_theme, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminBlock(result as AdminBlockRow);
}

export async function deleteAdminBlock(
  id: string,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<void> {
  const { error } = await client
    .from("blocks")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAdminTopics(
  blockId: string,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<AdminTopic[]> {
  const { data, error } = await client
    .from("topics")
    .select("id, block_id, name, slug, description, sort_order, is_active, created_at, updated_at")
    .eq("block_id", blockId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdminTopicRow[]).map(mapAdminTopic);
}

export async function createAdminTopic(
  data: CreateAdminTopicInput,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<AdminTopic> {
  const blockId = data.blockId ?? data.block_id;
  if (!blockId) {
    throw new Error("blockId (or block_id) is required to create a topic.");
  }

  const payload = {
    block_id: blockId,
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    sort_order: data.sortOrder ?? data.sort_order ?? 0,
    is_active: data.isActive ?? data.is_active ?? true,
  };

  const { data: result, error } = await client
    .from("topics")
    .insert(payload)
    .select("id, block_id, name, slug, description, sort_order, is_active, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminTopic(result as AdminTopicRow);
}

export async function updateAdminTopic(
  id: string,
  data: UpdateAdminTopicInput,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<AdminTopic> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.description !== undefined) payload.description = data.description;
  if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
  else if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  else if (data.is_active !== undefined) payload.is_active = data.is_active;

  const { data: result, error } = await client
    .from("topics")
    .update(payload)
    .eq("id", id)
    .select("id, block_id, name, slug, description, sort_order, is_active, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminTopic(result as AdminTopicRow);
}

export async function deleteAdminTopic(
  id: string,
  client: AdminBlocksClient = getSupabaseBrowserClient(),
): Promise<void> {
  const { error } = await client
    .from("topics")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
