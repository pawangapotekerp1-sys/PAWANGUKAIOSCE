import { describe, expect, test, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Use the local dev service role key and url
const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe("20260725000001_material_drive migration", () => {
  let mentorId: string;
  let mentorClient: any;

  beforeAll(async () => {
    // Ensure we have a mentor user to own the folders and links
    const email = `test_mentor_${Date.now()}@example.com`;
    const password = "password123";
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'mentor' }
    });
    
    if (userError) {
      console.error("Error creating test mentor:", userError);
      throw userError;
    }
    
    mentorId = user.user.id;
    // Update role in profiles table so RLS rules pass
    await supabase.from("profiles").update({ role: 'mentor' }).eq("id", mentorId);
    
    // Sign in to get session
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    
    mentorClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0", {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`
        }
      }
    });
  });

  test("RPC material_drive_clone_item recursively clones folders and links", async () => {
    // 1. Insert a parent folder
    const { data: folderA, error: f1Error } = await mentorClient
      .from("material_folders")
      .insert({ name: "Folder A", drive_type: "VIDEO", created_by: mentorId })
      .select()
      .single();
    expect(f1Error).toBeNull();
    
    // 2. Insert a child link
    const { data: linkA, error: l1Error } = await mentorClient
      .from("material_links")
      .insert({ folder_id: folderA.id, title: "Link A", url: "http://example.com/a", embed_url: "http://example.com/a", drive_type: "VIDEO", created_by: mentorId })
      .select()
      .single();
    expect(l1Error).toBeNull();

    // 3. Call clone RPC
    const { data: newId, error: cloneError } = await mentorClient
      .rpc('material_drive_clone_item', {
        p_item_id: folderA.id,
        p_item_type: 'folder'
      });
      
    expect(cloneError).toBeNull();
    expect(newId).toBeTruthy();
    expect(newId).not.toBe(folderA.id);

    // 4. Verify cloned folder
    const { data: clonedFolder, error: cfError } = await mentorClient
      .from("material_folders")
      .select("*")
      .eq("id", newId)
      .single();
      
    expect(cfError).toBeNull();
    expect(clonedFolder.name).toBe("Folder A (Copy)");
    expect(clonedFolder.parent_id).toBeNull();
    expect(clonedFolder.drive_type).toBe("VIDEO");

    // 5. Verify cloned link inside the new folder
    const { data: clonedLinks, error: clError } = await mentorClient
      .from("material_links")
      .select("*")
      .eq("folder_id", newId);
      
    expect(clError).toBeNull();
    expect(clonedLinks.length).toBe(1);
    expect(clonedLinks[0].title).toBe("Link A"); // Only root item gets ' (Copy)'
    expect(clonedLinks[0].url).toBe("http://example.com/a");
  });

  test("RPC material_drive_move_item updates parent_id", async () => {
    // 1. Create two folders
    const { data: folderSrc, error: fSrcError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Source Folder", drive_type: "PPT", created_by: mentorId })
      .select()
      .single();
    expect(fSrcError).toBeNull();

    const { data: folderDest, error: fDestError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Destination Folder", drive_type: "PPT", created_by: mentorId })
      .select()
      .single();
    expect(fDestError).toBeNull();

    // 2. Call move RPC
    const { error: moveError } = await mentorClient
      .rpc('material_drive_move_item', {
        p_item_id: folderSrc.id,
        p_item_type: 'folder',
        p_new_parent_id: folderDest.id
      });
    
    expect(moveError).toBeNull();

    // 3. Verify it was moved
    const { data: movedFolder, error: mfError } = await mentorClient
      .from("material_folders")
      .select("*")
      .eq("id", folderSrc.id)
      .single();
      
    expect(mfError).toBeNull();
    expect(movedFolder.parent_id).toBe(folderDest.id);
  });
  
  test("RLS prevents unauthenticated users from reading", async () => {
    // Create an unauthenticated client
    const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");
    
    // Try to read folders
    const { data, error } = await anonClient.from("material_folders").select("*");
    
    // Wait, the policy says: "on public.material_folders for select to authenticated using (true)"
    // So unauthenticated should return 0 rows or error.
    expect(error).toBeNull();
    expect(data.length).toBe(0);
  });

  test("RLS prevents regular authenticated users from mutating data and calling RPCs", async () => {
    const email = `test_student_${Date.now()}@example.com`;
    const password = "password123";
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student' }
    });
    expect(userError).toBeNull();
    
    // Update role in profiles to student so it definitely doesn't match mentor
    await supabase.from("profiles").update({ role: 'student' }).eq("id", user.user.id);
    
    // Sign in to get session
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    expect(authError).toBeNull();
    
    const studentClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0", {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`
        }
      }
    });

    // 1. Try to insert folder
    const { error: insertError } = await studentClient
      .from("material_folders")
      .insert({ name: "Hacked Folder", drive_type: "VIDEO", created_by: user.user.id });
    expect(insertError).not.toBeNull();

    // Create a folder as mentor to use for RPC tests
    const { data: mentorFolder, error: mError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Mentor Folder for RPC", drive_type: "VIDEO", created_by: mentorId })
      .select().single();
    expect(mError).toBeNull();

    // Create another folder to act as destination
    const { data: destFolder, error: dError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Dest Folder for RPC", drive_type: "VIDEO", created_by: mentorId })
      .select().single();
    expect(dError).toBeNull();

    // 2. Try to move it as student (RLS will silently ignore the update since no rows match)
    await studentClient
      .rpc('material_drive_move_item', {
        p_item_id: mentorFolder.id,
        p_item_type: 'folder',
        p_new_parent_id: destFolder.id
      });

    // Verify it was NOT moved
    const { data: checkFolder, error: checkError } = await mentorClient
      .from("material_folders")
      .select("parent_id")
      .eq("id", mentorFolder.id)
      .single();
    expect(checkError).toBeNull();
    expect(checkFolder.parent_id).toBeNull();

    // 3. Try to clone it as student
    const { error: cloneError } = await studentClient
      .rpc('material_drive_clone_item', {
        p_item_id: mentorFolder.id,
        p_item_type: 'folder'
      });
    expect(cloneError).not.toBeNull();
  });

  test("RPC material_drive_move_item prevents moving into a descendant", async () => {
    // 1. Create a hierarchy: Parent -> Child -> Grandchild
    const { data: parentFolder, error: pError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Parent", drive_type: "PPT", created_by: mentorId })
      .select().single();
    expect(pError).toBeNull();

    const { data: childFolder, error: cError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Child", parent_id: parentFolder.id, drive_type: "PPT", created_by: mentorId })
      .select().single();
    expect(cError).toBeNull();

    const { data: grandchildFolder, error: gError } = await mentorClient
      .from("material_folders")
      .insert({ name: "Grandchild", parent_id: childFolder.id, drive_type: "PPT", created_by: mentorId })
      .select().single();
    expect(gError).toBeNull();

    // 2. Try to move Parent into Grandchild
    const { error: moveError } = await mentorClient
      .rpc('material_drive_move_item', {
        p_item_id: parentFolder.id,
        p_item_type: 'folder',
        p_new_parent_id: grandchildFolder.id
      });
    
    // Should fail
    expect(moveError).not.toBeNull();
    expect(moveError.message).toContain("Cannot move a folder into its descendant");

    // 3. Try to move Parent into itself
    const { error: selfMoveError } = await mentorClient
      .rpc('material_drive_move_item', {
        p_item_id: parentFolder.id,
        p_item_type: 'folder',
        p_new_parent_id: parentFolder.id
      });
    
    // Should fail
    expect(selfMoveError).not.toBeNull();
    expect(selfMoveError.message).toContain("Cannot move a folder into itself");
  });
});
