import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const anonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const admin = createClient(supabaseUrl, serviceKey);

async function createUserClient(role: "mentor" | "pro" | "osce_pro"): Promise<{ id: string; client: SupabaseClient }> {
  const email = `vis_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = "password123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
  if (roleError) throw roleError;

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: auth, error: authError } = await authClient.auth.signInWithPassword({ email, password });
  if (authError) throw authError;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
  });
  return { id: data.user.id, client };
}

describe("material visibility + OSCE access enforced in the database", () => {
  let mentor: { id: string; client: SupabaseClient };
  let pro: { id: string; client: SupabaseClient };
  let oscePro: { id: string; client: SupabaseClient };
  let osceOnlyFolderId: string;
  let sharedFolderId: string;
  let hiddenFolderId: string;

  beforeAll(async () => {
    [mentor, pro, oscePro] = await Promise.all([
      createUserClient("mentor"),
      createUserClient("pro"),
      createUserClient("osce_pro"),
    ]);

    const insert = async (name: string, visible_to: string[]) => {
      const { data, error } = await mentor.client
        .from("material_folders")
        .insert({ name, drive_type: "PPT", created_by: mentor.id, visible_to })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    };

    osceOnlyFolderId = await insert("RLS OSCE only", ["osce_pro"]);
    sharedFolderId = await insert("RLS shared", ["pro", "osce_pro"]);
    hiddenFolderId = await insert("RLS hidden", []);
  });

  const visibleIds = async (client: SupabaseClient) => {
    const { data, error } = await client
      .from("material_folders")
      .select("id")
      .in("id", [osceOnlyFolderId, sharedFolderId, hiddenFolderId]);
    expect(error).toBeNull();
    return (data ?? []).map((row) => row.id).sort();
  };

  test("pro student cannot read folders restricted to osce_pro or hidden", async () => {
    expect(await visibleIds(pro.client)).toEqual([sharedFolderId].sort());
  });

  test("osce_pro student reads only folders shared with osce_pro", async () => {
    expect(await visibleIds(oscePro.client)).toEqual([osceOnlyFolderId, sharedFolderId].sort());
  });

  test("mentor reads every folder including hidden ones", async () => {
    expect(await visibleIds(mentor.client)).toEqual([osceOnlyFolderId, sharedFolderId, hiddenFolderId].sort());
  });

  test("visible_to cannot be null", async () => {
    const { error } = await mentor.client
      .from("material_folders")
      .insert({ name: "RLS null", drive_type: "PPT", created_by: mentor.id, visible_to: null });
    expect(error).not.toBeNull();
  });

  test("cloning keeps the visibility of the folder and its children", async () => {
    const { data: child, error: childError } = await mentor.client
      .from("material_links")
      .insert({
        folder_id: osceOnlyFolderId,
        title: "RLS child link",
        url: "http://example.com/x",
        embed_url: "http://example.com/x",
        drive_type: "PPT",
        created_by: mentor.id,
        visible_to: ["osce_pro"],
      })
      .select("id")
      .single();
    expect(childError).toBeNull();
    expect(child).toBeTruthy();

    const { data: newId, error: cloneError } = await mentor.client.rpc("material_drive_clone_item", {
      p_item_id: osceOnlyFolderId,
      p_item_type: "folder",
    });
    expect(cloneError).toBeNull();

    const { data: clonedFolder } = await mentor.client
      .from("material_folders").select("visible_to").eq("id", newId).single();
    expect(clonedFolder?.visible_to).toEqual(["osce_pro"]);

    const { data: clonedLinks } = await mentor.client
      .from("material_links").select("visible_to").eq("folder_id", newId);
    expect(clonedLinks?.map((l) => l.visible_to)).toEqual([["osce_pro"]]);
  });

  test("pro student cannot read OSCE stations, osce_pro can", async () => {
    const { data: station, error } = await admin
      .from("osce_stations")
      .insert({ title: "RLS station", type: "komunikasi", duration_minutes: 5, instructions: "x" })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: proRows } = await pro.client.from("osce_stations").select("id").eq("id", station!.id);
    expect(proRows).toEqual([]);

    const { data: osceRows } = await oscePro.client.from("osce_stations").select("id").eq("id", station!.id);
    expect(osceRows).toHaveLength(1);
  });
});
