import { describe, expect, test, vi } from "vitest";
import {
  createAdminBlock,
  createAdminTopic,
  deleteAdminBlock,
  deleteAdminTopic,
  getAdminBlocks,
  getAdminTopics,
  mapAdminBlock,
  mapAdminTopic,
  updateAdminBlock,
  updateAdminTopic,
} from "./admin-blocks-api";

describe("admin-blocks-api", () => {
  test("mapAdminBlock maps DB row to camelCase AdminBlock", () => {
    const row = {
      id: "block-1",
      name: "Farmakologi",
      slug: "farmakologi",
      description: "Blok farmakologi",
      sort_order: 1,
      is_active: true,
      icon_name: "Pill",
      color_theme: "teal",
      created_at: "2026-08-05T00:00:00Z",
      updated_at: "2026-08-05T00:00:00Z",
    };

    const mapped = mapAdminBlock(row);
    expect(mapped).toEqual({
      id: "block-1",
      name: "Farmakologi",
      slug: "farmakologi",
      description: "Blok farmakologi",
      sortOrder: 1,
      isActive: true,
      iconName: "Pill",
      colorTheme: "teal",
      createdAt: "2026-08-05T00:00:00Z",
      updatedAt: "2026-08-05T00:00:00Z",
    });
  });

  test("mapAdminTopic maps DB row to camelCase AdminTopic", () => {
    const row = {
      id: "topic-1",
      block_id: "block-1",
      name: "Kardiovaskular",
      slug: "kardiovaskular",
      description: "Topik kardiovaskular",
      sort_order: 2,
      is_active: true,
      created_at: "2026-08-05T00:00:00Z",
      updated_at: "2026-08-05T00:00:00Z",
    };

    const mapped = mapAdminTopic(row);
    expect(mapped).toEqual({
      id: "topic-1",
      blockId: "block-1",
      name: "Kardiovaskular",
      slug: "kardiovaskular",
      description: "Topik kardiovaskular",
      sortOrder: 2,
      isActive: true,
      createdAt: "2026-08-05T00:00:00Z",
      updatedAt: "2026-08-05T00:00:00Z",
    });
  });

  test("getAdminBlocks fetches and maps blocks sorted by sort_order and created_at", async () => {
    const orderFn2 = vi.fn().mockResolvedValue({
      data: [
        {
          id: "b-1",
          name: "Block A",
          slug: "block-a",
          description: null,
          sort_order: 1,
          is_active: true,
          icon_name: "Heart",
          color_theme: "rose",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    const orderFn1 = vi.fn().mockReturnValue({ order: orderFn2 });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn1 });

    const client = {
      from: vi.fn().mockReturnValue({ select: selectFn }),
    };

    const result = await getAdminBlocks(client as never);
    expect(client.from).toHaveBeenCalledWith("blocks");
    expect(result).toHaveLength(1);
    expect(result[0].iconName).toBe("Heart");
  });

  test("createAdminBlock inserts block and maps return payload", async () => {
    const singleFn = vi.fn().mockResolvedValue({
      data: {
        id: "b-2",
        name: "Block B",
        slug: "block-b",
        description: "Desc",
        sort_order: 10,
        is_active: true,
        icon_name: "Book",
        color_theme: "blue",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });

    const client = {
      from: vi.fn().mockReturnValue({ insert: insertFn }),
    };

    const result = await createAdminBlock(
      {
        name: "Block B",
        slug: "block-b",
        description: "Desc",
        sortOrder: 10,
        iconName: "Book",
        colorTheme: "blue",
      },
      client as never,
    );

    expect(insertFn).toHaveBeenCalledWith({
      name: "Block B",
      slug: "block-b",
      description: "Desc",
      sort_order: 10,
      icon_name: "Book",
      color_theme: "blue",
      is_active: true,
    });
    expect(result.id).toBe("b-2");
  });

  test("updateAdminBlock updates block fields", async () => {
    const singleFn = vi.fn().mockResolvedValue({
      data: {
        id: "b-1",
        name: "Updated Block",
        slug: "block-a",
        description: null,
        sort_order: 5,
        is_active: false,
        icon_name: "Shield",
        color_theme: "indigo",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });

    const client = {
      from: vi.fn().mockReturnValue({ update: updateFn }),
    };

    const result = await updateAdminBlock(
      "b-1",
      {
        name: "Updated Block",
        sortOrder: 5,
        iconName: "Shield",
        colorTheme: "indigo",
        isActive: false,
      },
      client as never,
    );

    expect(updateFn).toHaveBeenCalledWith({
      name: "Updated Block",
      sort_order: 5,
      icon_name: "Shield",
      color_theme: "indigo",
      is_active: false,
    });
    expect(eqFn).toHaveBeenCalledWith("id", "b-1");
    expect(result.name).toBe("Updated Block");
  });

  test("deleteAdminBlock removes block by id", async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    const client = {
      from: vi.fn().mockReturnValue({ delete: deleteFn }),
    };

    await deleteAdminBlock("b-1", client as never);
    expect(client.from).toHaveBeenCalledWith("blocks");
    expect(eqFn).toHaveBeenCalledWith("id", "b-1");
  });

  test("getAdminTopics filters by block_id", async () => {
    const orderFn2 = vi.fn().mockResolvedValue({
      data: [
        {
          id: "t-1",
          block_id: "b-1",
          name: "Topic 1",
          slug: "topic-1",
          description: null,
          sort_order: 1,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    const orderFn1 = vi.fn().mockReturnValue({ order: orderFn2 });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn1 });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

    const client = {
      from: vi.fn().mockReturnValue({ select: selectFn }),
    };

    const topics = await getAdminTopics("b-1", client as never);
    expect(eqFn).toHaveBeenCalledWith("block_id", "b-1");
    expect(topics).toHaveLength(1);
    expect(topics[0].blockId).toBe("b-1");
  });

  test("createAdminTopic inserts topic for block", async () => {
    const singleFn = vi.fn().mockResolvedValue({
      data: {
        id: "t-2",
        block_id: "b-1",
        name: "Topic 2",
        slug: "topic-2",
        description: "Desc",
        sort_order: 3,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });

    const client = {
      from: vi.fn().mockReturnValue({ insert: insertFn }),
    };

    const topic = await createAdminTopic(
      {
        blockId: "b-1",
        name: "Topic 2",
        slug: "topic-2",
        description: "Desc",
        sortOrder: 3,
      },
      client as never,
    );

    expect(insertFn).toHaveBeenCalledWith({
      block_id: "b-1",
      name: "Topic 2",
      slug: "topic-2",
      description: "Desc",
      sort_order: 3,
      is_active: true,
    });
    expect(topic.name).toBe("Topic 2");
  });

  test("updateAdminTopic updates topic by id", async () => {
    const singleFn = vi.fn().mockResolvedValue({
      data: {
        id: "t-1",
        block_id: "b-1",
        name: "Updated Topic",
        slug: "topic-1",
        description: "New desc",
        sort_order: 1,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });

    const client = {
      from: vi.fn().mockReturnValue({ update: updateFn }),
    };

    const topic = await updateAdminTopic(
      "t-1",
      {
        name: "Updated Topic",
        description: "New desc",
      },
      client as never,
    );

    expect(eqFn).toHaveBeenCalledWith("id", "t-1");
    expect(topic.name).toBe("Updated Topic");
  });

  test("deleteAdminTopic deletes topic by id", async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    const client = {
      from: vi.fn().mockReturnValue({ delete: deleteFn }),
    };

    await deleteAdminTopic("t-1", client as never);
    expect(client.from).toHaveBeenCalledWith("topics");
    expect(eqFn).toHaveBeenCalledWith("id", "t-1");
  });
});
