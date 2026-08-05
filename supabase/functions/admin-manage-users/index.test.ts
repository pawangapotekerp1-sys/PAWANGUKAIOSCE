import { describe, expect, test, vi } from "vitest";
import {
  HandlerHttpError,
  handleAdminManageUsersRequest,
  type AdminManageUsersDeps,
} from "./handler";

function makeRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/functions/v1/admin-manage-users", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: method === "OPTIONS" ? undefined : JSON.stringify(body),
  });
}

function createDeps(overrides: Partial<AdminManageUsersDeps> = {}): AdminManageUsersDeps {
  const inviteUserByEmail = vi.fn();
  const updateUserById = vi.fn();
  const serviceUpdateEq = vi.fn();
  const serviceRpc = vi.fn();
  const userClientUpdateEq = vi.fn();
  const userClientRpc = vi.fn();

  return {
    handleCors: vi.fn(() => null),
    jsonResponse: (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    requireAdmin: vi.fn(async () => ({
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
      profile: {
        id: "admin-1",
        role: "admin",
      },
      userClient: {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: userClientUpdateEq,
          })),
        })),
        rpc: userClientRpc,
      },
      service: {
        auth: {
          admin: {
            inviteUserByEmail,
            updateUserById,
          },
        },
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: serviceUpdateEq,
          })),
        })),
        rpc: serviceRpc,
      },
    })),
    ...overrides,
  };
}

describe("admin-manage-users function", () => {
  test("rejects non-admin callers", async () => {
    const response = await handleAdminManageUsersRequest(
      makeRequest({
        action: "create_user",
        email: "baru@example.com",
        role: "pro",
      }),
      createDeps({
        requireAdmin: vi.fn(async () => {
          throw new HandlerHttpError(403, "FORBIDDEN", "Fungsi ini hanya bisa diakses admin.");
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  test("routes create_user requests through the admin auth API", async () => {
    const deps = createDeps();
    const service = await deps.requireAdmin(makeRequest({}));
    const inviteUserByEmail = service.service.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>;
    const updateUserById = service.service.auth.admin.updateUserById as ReturnType<typeof vi.fn>;
    const userClientFrom = service.userClient.from as ReturnType<typeof vi.fn>;
    const updateEq = userClientFrom().update().eq as ReturnType<typeof vi.fn>;

    inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "baru@example.com",
        },
      },
      error: null,
    });
    updateUserById.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
        },
      },
      error: null,
    });
    updateEq.mockResolvedValue({
      error: null,
    });

    const response = await handleAdminManageUsersRequest(
      makeRequest({
        action: "create_user",
        email: "baru@example.com",
        fullName: "Peserta Baru",
        role: "pendaftar_baru",
      }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "baru@example.com",
      expect.objectContaining({
        data: expect.objectContaining({
          full_name: "Peserta Baru",
        }),
      }),
    );
    expect(updateUserById).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({
        app_metadata: {
          role: "pendaftar_baru",
        },
      }),
    );
    expect(updateEq).toHaveBeenCalledWith("id", "user-2");
  });

  test("keeps shared auth errors from requireAdmin as original http responses", async () => {
    const response = await handleAdminManageUsersRequest(
      makeRequest({
        action: "create_user",
        email: "mentor@example.com",
        role: "mentor",
      }),
      createDeps({
        requireAdmin: vi.fn(async () => {
          throw Object.assign(new Error("Fungsi ini hanya bisa diakses admin."), {
            status: 403,
            code: "FORBIDDEN",
          });
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "FORBIDDEN",
      message: "Fungsi ini hanya bisa diakses admin.",
    });
  });

  test("creates users through the admin caller database client when service-role database writes are unavailable", async () => {
    const deps = createDeps();
    const service = await deps.requireAdmin(makeRequest({}));
    const inviteUserByEmail = service.service.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>;
    const updateUserById = service.service.auth.admin.updateUserById as ReturnType<typeof vi.fn>;
    const serviceFrom = service.service.from as ReturnType<typeof vi.fn>;
    const userClientFrom = service.userClient.from as ReturnType<typeof vi.fn>;
    const serviceUpdateEq = serviceFrom().update().eq as ReturnType<typeof vi.fn>;
    const userClientUpdateEq = userClientFrom().update().eq as ReturnType<typeof vi.fn>;

    inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: "user-fallback",
          email: "mentor@example.com",
        },
      },
      error: null,
    });
    updateUserById.mockResolvedValue({
      data: {
        user: {
          id: "user-fallback",
        },
      },
      error: null,
    });
    serviceUpdateEq.mockResolvedValue({
      error: {
        message: "An invalid response was received from the upstream server",
      },
    });
    userClientUpdateEq.mockResolvedValue({
      error: null,
    });

    const response = await handleAdminManageUsersRequest(
      makeRequest({
        action: "create_user",
        email: "mentor@example.com",
        fullName: "Mentor Klinis",
        role: "mentor",
      }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(serviceUpdateEq).not.toHaveBeenCalled();
    expect(userClientUpdateEq).toHaveBeenCalledWith("id", "user-fallback");
  });

  test("accepts mentor as a managed role", async () => {
    const deps = createDeps();
    const service = await deps.requireAdmin(makeRequest({}));
    const inviteUserByEmail = service.service.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>;
    const updateUserById = service.service.auth.admin.updateUserById as ReturnType<typeof vi.fn>;
    const userClientFrom = service.userClient.from as ReturnType<typeof vi.fn>;
    const updateEq = userClientFrom().update().eq as ReturnType<typeof vi.fn>;

    inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: "user-mentor",
          email: "mentor@example.com",
        },
      },
      error: null,
    });
    updateUserById.mockResolvedValue({
      data: {
        user: {
          id: "user-mentor",
        },
      },
      error: null,
    });
    updateEq.mockResolvedValue({
      error: null,
    });

    const response = await handleAdminManageUsersRequest(
      makeRequest({
        action: "create_user",
        email: "mentor@example.com",
        fullName: "Mentor Klinis",
        role: "mentor",
      }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith(
      "user-mentor",
      expect.objectContaining({
        app_metadata: {
          role: "mentor",
        },
      }),
    );
  });

  test("uses the caller app origin for invite redirect links", async () => {
    const deps = createDeps();
    const service = await deps.requireAdmin(makeRequest({}));
    const inviteUserByEmail = service.service.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>;
    const updateUserById = service.service.auth.admin.updateUserById as ReturnType<typeof vi.fn>;
    const userClientFrom = service.userClient.from as ReturnType<typeof vi.fn>;
    const updateEq = userClientFrom().update().eq as ReturnType<typeof vi.fn>;

    inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: "user-origin",
          email: "mentor@example.com",
        },
      },
      error: null,
    });
    updateUserById.mockResolvedValue({
      data: {
        user: {
          id: "user-origin",
        },
      },
      error: null,
    });
    updateEq.mockResolvedValue({
      error: null,
    });

    const response = await handleAdminManageUsersRequest(
      new Request("https://project-ref.functions.supabase.co/admin-manage-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.pawang.com",
        },
        body: JSON.stringify({
          action: "create_user",
          email: "mentor@example.com",
          fullName: "Mentor Klinis",
          role: "mentor",
        }),
      }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(inviteUserByEmail).toHaveBeenCalledWith(
      "mentor@example.com",
      expect.objectContaining({
        redirectTo: "https://app.pawang.com/auth/reset-password",
      }),
    );
  });

  test("routes update_role requests through the SQL helper", async () => {
    const deps = createDeps();
    const service = await deps.requireAdmin(makeRequest({}));
    const rpc = service.userClient.rpc as ReturnType<typeof vi.fn>;

    rpc.mockResolvedValue({
      data: {
        id: "user-2",
        role: "admin",
      },
      error: null,
    });

    const response = await handleAdminManageUsersRequest(
      makeRequest({
        action: "update_role",
        userId: "user-2",
        role: "admin",
      }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("admin_update_user_role", {
      target_role: "admin",
      target_user_id: "user-2",
    });
  });
});
