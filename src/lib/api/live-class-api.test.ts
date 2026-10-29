import { describe, expect, it, vi } from "vitest";
import {
  computeLiveClassStatus,
  formatLiveClassSchedule,
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
} from "./live-class-api";

describe("live-class-api helpers", () => {
  it("computes status correctly based on current time", () => {
    const start = "2026-10-30T10:00:00Z";
    const end = "2026-10-30T12:00:00Z";

    // Before start: upcoming
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T09:59:59Z"))).toBe("upcoming");
    // At start: ongoing
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T10:00:00Z"))).toBe("ongoing");
    // During session: ongoing
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T11:00:00Z"))).toBe("ongoing");
    // At end: ongoing
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T12:00:00Z"))).toBe("ongoing");
    // After end: ended
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T12:00:01Z"))).toBe("ended");
  });

  it("formats schedule into readable Indonesian string", () => {
    const formatted = formatLiveClassSchedule("2026-10-30T10:00:00Z", "2026-10-30T12:00:00Z");
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });
});

describe("live-class-api database queries", () => {
  it("calls select and orders by start_time asc", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "class-1",
          title: "Sesi 1",
          start_time: "2026-10-30T10:00:00Z",
          end_time: "2026-10-30T12:00:00Z",
          zoom_link: "https://zoom.us/j/123",
          target_roles: ["pro", "osce_pro"],
          created_at: "2026-10-29T10:00:00Z",
          updated_at: "2026-10-29T10:00:00Z",
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    const mockClient = { from };

    const result = await getLiveClasses(undefined, mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("start_time", { ascending: true });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Sesi 1");
  });

  it("throws error when getLiveClasses fails", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" },
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    const mockClient = { from };

    await expect(getLiveClasses(undefined, mockClient as never)).rejects.toThrow(
      "Gagal memuat jadwal live class: Database connection failed",
    );
  });

  it("calls insert for createLiveClass", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "new-id",
        title: "Kelas Baru",
        start_time: "2026-10-30T10:00:00Z",
        end_time: "2026-10-30T12:00:00Z",
        zoom_link: "https://zoom.us/j/123",
        target_roles: ["pro"],
        created_at: "2026-10-30T10:00:00Z",
        updated_at: "2026-10-30T10:00:00Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const mockClient = { from };

    const payload = {
      title: "Kelas Baru",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T12:00:00Z",
      zoomLink: "https://zoom.us/j/123",
      targetRoles: ["pro"] as ("pro" | "osce_pro")[],
    };

    const res = await createLiveClass(payload, mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(insert).toHaveBeenCalledWith({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
    });
    expect(res.id).toBe("new-id");
  });

  it("throws error when createLiveClass fails", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Invalid payload" },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const mockClient = { from };

    const payload = {
      title: "Kelas Baru",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T12:00:00Z",
      zoomLink: "https://zoom.us/j/123",
      targetRoles: ["pro"] as ("pro" | "osce_pro")[],
    };

    await expect(createLiveClass(payload, mockClient as never)).rejects.toThrow(
      "Gagal membuat jadwal live class: Invalid payload",
    );
  });

  it("calls update for updateLiveClass", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "edit-id",
        title: "Kelas Diedit",
        start_time: "2026-10-30T10:00:00Z",
        end_time: "2026-10-30T12:00:00Z",
        zoom_link: "https://zoom.us/j/123",
        target_roles: ["pro"],
        created_at: "2026-10-30T10:00:00Z",
        updated_at: "2026-10-30T10:00:00Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const mockClient = { from };

    const payload = {
      title: "Kelas Diedit",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T12:00:00Z",
      zoomLink: "https://zoom.us/j/123",
      targetRoles: ["pro"] as ("pro" | "osce_pro")[],
    };

    const res = await updateLiveClass("edit-id", payload, mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(update).toHaveBeenCalledWith({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
      updated_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith("id", "edit-id");
    expect(res.id).toBe("edit-id");
  });

  it("throws error when updateLiveClass fails", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Update denied" },
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const mockClient = { from };

    const payload = {
      title: "Kelas Diedit",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T12:00:00Z",
      zoomLink: "https://zoom.us/j/123",
      targetRoles: ["pro"] as ("pro" | "osce_pro")[],
    };

    await expect(updateLiveClass("edit-id", payload, mockClient as never)).rejects.toThrow(
      "Gagal memperbarui jadwal live class: Update denied",
    );
  });

  it("calls delete for deleteLiveClass", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    const mockClient = { from };

    await deleteLiveClass("delete-id", mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "delete-id");
  });

  it("throws error when deleteLiveClass fails", async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: "Delete denied" } });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    const mockClient = { from };

    await expect(deleteLiveClass("delete-id", mockClient as never)).rejects.toThrow(
      "Gagal menghapus jadwal live class: Delete denied",
    );
  });
});
