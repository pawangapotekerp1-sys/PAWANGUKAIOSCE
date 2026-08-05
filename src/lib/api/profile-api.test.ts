import { describe, expect, test, vi } from "vitest";
import {
  getCurrentProfile,
  updateCurrentProfileName,
  updateCurrentLeaderboardAlias,
  updateCurrentUserPassword,
  uploadCurrentUserAvatar,
} from "./profile-api";

describe("profile-api", () => {
  test("maps avatar_url from profile rows into the app profile shape", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        email: "nadira@example.com",
        full_name: "Nadira Apoteker",
        avatar_url: "user-1/avatar.webp",
        leaderboard_alias: "FarmasiNad",
        role: "admin",
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      error: null,
    });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          single,
        })),
      })),
    };

    await expect(getCurrentProfile(client as never)).resolves.toMatchObject({
      avatarUrl: "user-1/avatar.webp",
      leaderboardAlias: "FarmasiNad",
    });
  });

  test("updates display name in auth metadata and profiles", async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });
    const updateEq = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        email: "nadira@example.com",
        full_name: "Nadira Apoteker",
        avatar_url: null,
        role: "admin",
      },
      error: null,
    });
    const client = {
      auth: {
        updateUser,
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: updateEq,
        })),
      })),
    };

    await updateCurrentProfileName(
      {
        userId: "user-1",
        fullName: "Nadira Apoteker",
      },
      client as never,
    );

    expect(updateUser).toHaveBeenCalledWith({
      data: {
        full_name: "Nadira Apoteker",
      },
    });
    expect(updateEq).toHaveBeenCalledWith("id", "user-1");
  });

  test("updates password with current_password", async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: {},
      error: null,
    });
    const client = {
      auth: {
        updateUser,
      },
    };

    await updateCurrentUserPassword(
      {
        currentPassword: "old-pass",
        nextPassword: "new-pass-123",
      },
      client as never,
    );

    expect(updateUser).toHaveBeenCalledWith({
      current_password: "old-pass",
      password: "new-pass-123",
    });
  });

  test("updates leaderboard alias in the profiles table", async () => {
    const updateEq = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        leaderboard_alias: "FarmasiNad",
      },
      error: null,
    });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: updateEq,
        })),
      })),
    };

    await updateCurrentLeaderboardAlias(
      {
        userId: "user-1",
        leaderboardAlias: "FarmasiNad",
      },
      client as never,
    );

    expect(updateEq).toHaveBeenCalledWith("id", "user-1");
  });

  test("uploads avatar into the current user's folder and persists avatar_url", async () => {
    const upload = vi.fn().mockResolvedValue({
      data: {
        path: "user-1/avatar.webp",
      },
      error: null,
    });
    const updateEq = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        email: "nadira@example.com",
        full_name: "Nadira Apoteker",
        avatar_url: "user-1/avatar.webp",
        role: "admin",
      },
      error: null,
    });
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
          remove: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: updateEq,
        })),
      })),
    };
    const file = new File(["avatar"], "avatar.webp", {
      type: "image/webp",
    });

    await uploadCurrentUserAvatar(
      {
        userId: "user-1",
        file,
      },
      client as never,
    );

    expect(upload).toHaveBeenCalledWith(
      "user-1/avatar.webp",
      file,
      expect.objectContaining({
        contentType: "image/webp",
        upsert: true,
      }),
    );
    expect(updateEq).toHaveBeenCalledWith("id", "user-1");
  });
});
