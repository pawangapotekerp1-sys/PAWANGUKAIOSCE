import { describe, expect, test, vi } from "vitest";
import {
  getFolders,
  getLinks,
  createFolder,
  createLink,
  moveItem,
  cloneItem,
  deleteFolder,
  deleteLink,
} from "./material-api";

describe("material-api", () => {
  test("getFolders with parentId", async () => {
    const finalResult = {
      data: [{ id: "folder-1", name: "Folder 1" }],
      error: null,
    };
    const eq2 = vi.fn().mockReturnValue(finalResult);
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from };

    await expect(
      getFolders({
        client: client as never,
        driveType: "VIDEO",
        parentId: "parent-1",
      }),
    ).resolves.toMatchObject([{ id: "folder-1", name: "Folder 1" }]);

    expect(from).toHaveBeenCalledWith("material_folders");
    expect(eq1).toHaveBeenCalledWith("drive_type", "VIDEO");
    expect(eq2).toHaveBeenCalledWith("parent_id", "parent-1");
  });

  test("getFolders without parentId", async () => {
    const is = vi.fn().mockReturnValue({
      data: [{ id: "folder-1", name: "Folder 1" }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ is });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from };

    await expect(
      getFolders({
        client: client as never,
        driveType: "VIDEO",
      }),
    ).resolves.toMatchObject([{ id: "folder-1", name: "Folder 1" }]);

    expect(eq).toHaveBeenCalledWith("drive_type", "VIDEO");
    expect(is).toHaveBeenCalledWith("parent_id", null);
  });

  test("getLinks with folderId", async () => {
    const finalResult = {
      data: [{ id: "link-1", title: "Link 1" }],
      error: null,
    };
    const eq2 = vi.fn().mockReturnValue(finalResult);
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from };

    await expect(
      getLinks({
        client: client as never,
        driveType: "PPT",
        folderId: "folder-1",
      }),
    ).resolves.toMatchObject([{ id: "link-1", title: "Link 1" }]);

    expect(from).toHaveBeenCalledWith("material_links");
    expect(eq1).toHaveBeenCalledWith("drive_type", "PPT");
    expect(eq2).toHaveBeenCalledWith("folder_id", "folder-1");
  });

  test("createFolder", async () => {
    const single = vi.fn().mockReturnValue({
      data: { id: "new-folder", name: "New Folder" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const getUser = vi.fn().mockReturnValue({ data: { user: { id: "user-1" } } });
    const client = { from, auth: { getUser } };

    await expect(
      createFolder({
        client: client as never,
        name: "New Folder",
        driveType: "VIDEO",
        parentId: "parent-1",
      }),
    ).resolves.toMatchObject({ id: "new-folder", name: "New Folder" });

    expect(insert).toHaveBeenCalledWith({
      name: "New Folder",
      drive_type: "VIDEO",
      parent_id: "parent-1",
      created_by: "user-1",
    });
  });

  test("createLink", async () => {
    const single = vi.fn().mockReturnValue({
      data: { id: "new-link", title: "New Link" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const getUser = vi.fn().mockReturnValue({ data: { user: { id: "user-1" } } });
    const client = { from, auth: { getUser } };

    await expect(
      createLink({
        client: client as never,
        title: "New Link",
        url: "https://example.com",
        embedUrl: "https://example.com/embed",
        driveType: "PPT",
        folderId: "folder-1",
      }),
    ).resolves.toMatchObject({ id: "new-link", title: "New Link" });

    expect(insert).toHaveBeenCalledWith({
      title: "New Link",
      url: "https://example.com",
      embed_url: "https://example.com/embed",
      drive_type: "PPT",
      folder_id: "folder-1",
      created_by: "user-1",
    });
  });

  test("moveItem", async () => {
    const rpc = vi.fn().mockReturnValue({ error: null });
    const client = { rpc };

    await moveItem({
      client: client as never,
      itemId: "item-1",
      itemType: "folder",
      newParentId: "parent-2",
    });

    expect(rpc).toHaveBeenCalledWith("material_drive_move_item", {
      p_item_id: "item-1",
      p_item_type: "folder",
      p_new_parent_id: "parent-2",
    });
  });

  test("cloneItem", async () => {
    const rpc = vi.fn().mockReturnValue({ data: "new-item-id", error: null });
    const client = { rpc };

    const result = await cloneItem({
      client: client as never,
      itemId: "item-1",
      itemType: "link",
      newParentId: "parent-1",
      isRoot: false,
    });

    expect(result).toBe("new-item-id");
    expect(rpc).toHaveBeenCalledWith("material_drive_clone_item", {
      p_item_id: "item-1",
      p_item_type: "link",
      p_new_parent_id: "parent-1",
      p_is_root: false,
    });
  });

  test("deleteFolder", async () => {
    const eq = vi.fn().mockReturnValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    const client = { from };

    await deleteFolder({
      client: client as never,
      id: "folder-1",
    });

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "folder-1");
  });

  test("deleteLink", async () => {
    const eq = vi.fn().mockReturnValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    const client = { from };

    await deleteLink({
      client: client as never,
      id: "link-1",
    });

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "link-1");
  });
});
