import { getSupabaseBrowserClient } from "../supabase/browser-client";
import type { UserRole } from "../auth/permissions";

export type LiveClassStatus = "upcoming" | "ongoing" | "ended";

export type LiveClassRoleTarget = "pro" | "osce_pro";

export type LiveClass = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  zoomLink: string;
  targetRoles: LiveClassRoleTarget[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiveClassPayload = {
  title: string;
  startTime: string;
  endTime: string;
  zoomLink: string;
  targetRoles: LiveClassRoleTarget[];
};

type LiveClassRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  zoom_link: string;
  target_roles: LiveClassRoleTarget[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export function computeLiveClassStatus(
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): LiveClassStatus {
  const currentMs = now.getTime();
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  if (currentMs < startMs) {
    return "upcoming";
  }
  if (currentMs > endMs) {
    return "ended";
  }
  return "ongoing";
}

export function formatLiveClassSchedule(startTime: string, endTime: string): string {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const dateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(startDate);

  const startTimeStr = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(startDate);

  const endTimeStr = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(endDate);

  return `${dateStr} • ${startTimeStr} - ${endTimeStr} WIB`;
}

function mapRowToLiveClass(row: LiveClassRow): LiveClass {
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    zoomLink: row.zoom_link,
    targetRoles: row.target_roles ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLiveClasses(
  role?: UserRole | null,
  client = getSupabaseBrowserClient(),
): Promise<LiveClass[]> {
  const query = client
    .from("live_classes")
    .select("*")
    .order("start_time", { ascending: true });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Gagal memuat jadwal live class: ${error.message}`);
  }

  const rows = (data as LiveClassRow[]) ?? [];
  return rows.map(mapRowToLiveClass);
}

export async function createLiveClass(
  payload: LiveClassPayload,
  client = getSupabaseBrowserClient(),
): Promise<LiveClass> {
  const { data, error } = await client
    .from("live_classes")
    .insert({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal membuat jadwal live class: ${error?.message || "Data tidak ditemukan"}`);
  }

  return mapRowToLiveClass(data as LiveClassRow);
}

export async function updateLiveClass(
  id: string,
  payload: LiveClassPayload,
  client = getSupabaseBrowserClient(),
): Promise<LiveClass> {
  const { data, error } = await client
    .from("live_classes")
    .update({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal memperbarui jadwal live class: ${error?.message || "Data tidak ditemukan"}`);
  }

  return mapRowToLiveClass(data as LiveClassRow);
}

export async function deleteLiveClass(
  id: string,
  client = getSupabaseBrowserClient(),
): Promise<void> {
  const { error } = await client
    .from("live_classes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Gagal menghapus jadwal live class: ${error.message}`);
  }
}
