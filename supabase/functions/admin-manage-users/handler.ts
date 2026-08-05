type ManagedRole = "pendaftar_baru" | "pro" | "mentor" | "admin";
type ManageUserAction = "create_user" | "update_role";

type CreateUserPayload = {
  action: "create_user";
  email?: string;
  fullName?: string;
  role?: ManagedRole;
};

type UpdateRolePayload = {
  action: "update_role";
  userId?: string;
  role?: ManagedRole;
};

type ManageUsersPayload = CreateUserPayload | UpdateRolePayload;

type DatabaseClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{
        error: {
          message: string;
        } | null;
      }>;
    };
  };
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: {
      message: string;
    } | null;
  }>;
};

type ServiceClient = {
  auth: {
    admin: {
      inviteUserByEmail: (
        email: string,
        options?: {
          data?: Record<string, unknown>;
          redirectTo?: string;
        },
      ) => Promise<{
        data: {
          user: {
            id: string;
            email?: string | null;
          } | null;
        };
        error: {
          message: string;
        } | null;
      }>;
      updateUserById: (
        userId: string,
        attributes: Record<string, unknown>,
      ) => Promise<{
        data: {
          user: {
            id: string;
          } | null;
        };
        error: {
          message: string;
        } | null;
      }>;
    };
  };
};

type HttpErrorLike = {
  status: number;
  code: string;
  message: string;
};

export type AdminManageUsersDeps = {
  handleCors: (req: Request) => Response | null;
  jsonResponse: (body: unknown, status?: number) => Response;
  requireAdmin: (req: Request) => Promise<{
    user: {
      id: string;
      email?: string | null;
    };
    profile: {
      id: string;
      role: string;
    };
    userClient: DatabaseClient;
    service: ServiceClient;
  }>;
};

export class HandlerHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isManagedRole(value: unknown): value is ManagedRole {
  return value === "pendaftar_baru" || value === "pro" || value === "mentor" || value === "admin";
}

function isManageUserAction(value: unknown): value is ManageUserAction {
  return value === "create_user" || value === "update_role";
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return typeof error === "object"
    && error !== null
    && typeof (error as HttpErrorLike).status === "number"
    && typeof (error as HttpErrorLike).code === "string"
    && typeof (error as HttpErrorLike).message === "string";
}

function resolveRequestOrigin(req: Request) {
  const originHeader = req.headers.get("origin")?.trim();

  if (originHeader && originHeader.toLowerCase() !== "null") {
    return originHeader;
  }

  const refererHeader = req.headers.get("referer")?.trim();

  if (refererHeader) {
    try {
      return new URL(refererHeader).origin;
    } catch {
      // Fall back to the request URL origin when the referer header is malformed.
    }
  }

  return new URL(req.url).origin;
}

function buildRedirectTo(req: Request) {
  return `${resolveRequestOrigin(req)}/auth/reset-password`;
}

async function handleCreateUser(
  req: Request,
  userClient: DatabaseClient,
  service: ServiceClient,
  payload: CreateUserPayload,
) {
  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.fullName?.trim() || null;

  if (!email) {
    throw new HandlerHttpError(400, "EMAIL_REQUIRED", "email wajib diisi.");
  }

  if (!isManagedRole(payload.role)) {
    throw new HandlerHttpError(400, "ROLE_INVALID", "role wajib bernilai pendaftar_baru, pro, mentor, atau admin.");
  }

  const { data: inviteData, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    email,
    {
      data: fullName
        ? {
          full_name: fullName,
        }
        : undefined,
      redirectTo: buildRedirectTo(req),
    },
  );

  if (inviteError || !inviteData.user) {
    throw new HandlerHttpError(
      500,
      "INVITE_FAILED",
      inviteError?.message ?? "Undangan akun belum berhasil dibuat.",
    );
  }

  const invitedUser = inviteData.user;
  const { error: updateAuthError } = await service.auth.admin.updateUserById(
    invitedUser.id,
    {
      app_metadata: {
        role: payload.role,
      },
      user_metadata: fullName
        ? {
          full_name: fullName,
        }
        : undefined,
    },
  );

  if (updateAuthError) {
    throw new HandlerHttpError(500, "AUTH_USER_UPDATE_FAILED", updateAuthError.message);
  }

  const { error: profileUpdateError } = await userClient
    .from("profiles")
    .update({
      full_name: fullName,
      role: payload.role,
    })
    .eq("id", invitedUser.id);

  if (profileUpdateError) {
    throw new HandlerHttpError(500, "PROFILE_SYNC_FAILED", profileUpdateError.message);
  }

  return {
    action: payload.action,
    user: {
      id: invitedUser.id,
      email: invitedUser.email ?? email,
      role: payload.role,
      fullName,
    },
  };
}

async function handleUpdateRole(
  userClient: DatabaseClient,
  payload: UpdateRolePayload,
) {
  if (!payload.userId?.trim()) {
    throw new HandlerHttpError(400, "USER_ID_REQUIRED", "userId wajib diisi.");
  }

  if (!isManagedRole(payload.role)) {
    throw new HandlerHttpError(400, "ROLE_INVALID", "role wajib bernilai pendaftar_baru, pro, mentor, atau admin.");
  }

  const { data, error } = await userClient.rpc("admin_update_user_role", {
    target_user_id: payload.userId,
    target_role: payload.role,
  });

  if (error) {
    throw new HandlerHttpError(500, "ROLE_UPDATE_FAILED", error.message);
  }

  return {
    action: payload.action,
    profile: data,
  };
}

export async function handleAdminManageUsersRequest(
  req: Request,
  deps: AdminManageUsersDeps,
) {
  const corsResponse = deps.handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { userClient, service } = await deps.requireAdmin(req);
    const payload = await req.json() as ManageUsersPayload;

    if (!isManageUserAction(payload.action)) {
      throw new HandlerHttpError(400, "ACTION_INVALID", "action wajib bernilai create_user atau update_role.");
    }

    if (payload.action === "create_user") {
      const result = await handleCreateUser(req, userClient, service, payload);
      return deps.jsonResponse(result);
    }

    const result = await handleUpdateRole(userClient, payload);
    return deps.jsonResponse(result);
  } catch (error) {
    if (error instanceof HandlerHttpError || isHttpErrorLike(error)) {
      return deps.jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    return deps.jsonResponse(
      {
        error: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : "Unexpected admin user management error.",
      },
      500,
    );
  }
}
