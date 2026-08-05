import { describe, expect, test, vi } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  createManagedUser,
  getAdminDashboardOverview,
  listManagedUsers,
  updateManagedUserRole,
} from "./admin-api";

describe("admin-api", () => {
  test("admin dashboard shows live pending payment count, total users, and total attempts without AI metrics", async () => {
    const pendingPaymentEq = vi.fn().mockResolvedValue({
      count: 12,
      error: null,
    });
    const profilesSelect = vi.fn().mockResolvedValue({
      count: 842,
      error: null,
    });
    const attemptsSelect = vi.fn().mockResolvedValue({
      count: 1284,
      error: null,
    });
    const paymentOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "submission-1",
          package_code: "pro_30_hari",
          created_at: "2026-05-01T08:14:00.000Z",
          status: "pending_review",
          profile: {
            full_name: "Nadira Puspandari",
            email: "nadira@example.com",
          },
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "payment_submissions") {
          return {
            select: vi.fn((fields?: string) => {
              if (typeof fields === "string" && fields.includes("profiles")) {
                return {
                  eq: vi.fn(() => ({
                    order: paymentOrder,
                  })),
                };
              }

              return {
                eq: pendingPaymentEq,
              };
            }),
          };
        }

        if (table === "profiles") {
          return {
            select: profilesSelect,
          };
        }

        if (table === "attempts") {
          return {
            select: attemptsSelect,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await getAdminDashboardOverview(client as never);

    expect(result.metrics[0]).toMatchObject({
      label: "Pembayaran menunggu",
      value: "12 pembayaran",
    });
    expect(result.metrics[1]).toMatchObject({
      label: "Pengguna aktif",
      value: "842 pengguna",
    });
    expect(result.metrics[2]).toMatchObject({
      label: "Sesi tercatat",
      value: "1.284 sesi",
    });
    expect(result.paymentQueuePreview[0]).toMatchObject({
      name: "Nadira Puspandari",
      packageName: "Pro 30 Hari",
      statusLabel: "Pending",
    });
    expect(result.reviewQueueSummary).toEqual([]);
  });

  test("lists admin-managed users from the SQL helper", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "user-3",
          email: "mentor@example.com",
          full_name: "Mentor Klinis",
          leaderboard_alias: null,
          role: "mentor",
          created_at: "2026-05-07T02:00:00.000Z",
        },
        {
          id: "user-2",
          email: "pro@example.com",
          full_name: "Peserta Pro",
          leaderboard_alias: "FarmasiPro",
          role: "pro",
          created_at: "2026-05-07T01:00:00.000Z",
        },
      ],
      error: null,
    });
    const client = {
      rpc,
    };

    await expect(listManagedUsers(client as never)).resolves.toEqual([
      expect.objectContaining({
        email: "mentor@example.com",
        role: "mentor",
        filterLabel: "user_aktif",
      }),
      expect.objectContaining({
        email: "pro@example.com",
        role: "pro",
        filterLabel: "user_aktif",
      }),
    ]);
  });

  test("creates a user through the privileged admin function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        action: "create_user",
        user: {
          id: "user-3",
          email: "baru@example.com",
          role: "pendaftar_baru",
        },
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(
      createManagedUser(
        {
          email: "baru@example.com",
          fullName: "Peserta Baru",
          role: "pendaftar_baru",
        },
        client as never,
      ),
    ).resolves.toMatchObject({
      user: {
        email: "baru@example.com",
        role: "pendaftar_baru",
      },
    });

    expect(invoke).toHaveBeenCalledWith("admin-manage-users", {
      body: {
        action: "create_user",
        email: "baru@example.com",
        fullName: "Peserta Baru",
        role: "pendaftar_baru",
      },
    });
  });

  test("creates a mentor user through the privileged admin function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        action: "create_user",
        user: {
          id: "user-4",
          email: "mentor@example.com",
          role: "mentor",
        },
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(
      createManagedUser(
        {
          email: "mentor@example.com",
          fullName: "Mentor Klinis",
          role: "mentor",
        },
        client as never,
      ),
    ).resolves.toMatchObject({
      user: {
        email: "mentor@example.com",
        role: "mentor",
      },
    });
  });

  test("surfaces the edge function json message when managed user creation fails", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(
        new Response(
          JSON.stringify({
            error: "FORBIDDEN",
            message: "Fungsi ini hanya bisa diakses admin.",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(
      createManagedUser(
        {
          email: "mentor@example.com",
          fullName: "Mentor Klinis",
          role: "mentor",
        },
        client as never,
      ),
    ).rejects.toThrow("Fungsi ini hanya bisa diakses admin.");
  });

  test("updates a managed user's role through the privileged admin function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        action: "update_role",
        profile: {
          id: "user-2",
          role: "admin",
        },
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(
      updateManagedUserRole(
        {
          userId: "user-2",
          role: "admin",
        },
        client as never,
      ),
    ).resolves.toMatchObject({
      profile: {
        id: "user-2",
        role: "admin",
      },
    });

    expect(invoke).toHaveBeenCalledWith("admin-manage-users", {
      body: {
        action: "update_role",
        userId: "user-2",
        role: "admin",
      },
    });
  });
});
