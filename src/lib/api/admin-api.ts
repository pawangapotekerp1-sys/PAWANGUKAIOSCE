import { getSupabaseBrowserClient } from "../supabase/browser-client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  mapAdminDashboardViewModel,
  type AdminDashboardViewModel,
} from "../mappers/admin-mappers";

export type AdminClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from" | "functions" | "rpc">;

type PaymentPreviewRow = {
  id: string;
  package_code: string;
  created_at: string;
  status: "pending_review" | "active" | "rejected" | "expired";
  profile?: {
    full_name: string | null;
    email: string | null;
  } | Array<{
    full_name: string | null;
    email: string | null;
  }> | null;
};

type ManagedUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  leaderboard_alias: string | null;
  role: "pendaftar_baru" | "pro" | "mentor" | "admin";
  created_at: string;
};

export type ManagedUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  leaderboardAlias: string | null;
  role: ManagedUserRow["role"];
  createdAt: string;
  filterLabel: "user_aktif" | "belum_bayar" | "admin";
};

export type CreateManagedUserInput = {
  email: string;
  fullName?: string;
  role: ManagedUserRow["role"];
};

export type UpdateManagedUserRoleInput = {
  userId: string;
  role: ManagedUserRow["role"];
};

function resolveManagedUserFilterLabel(role: ManagedUserRow["role"]): ManagedUser["filterLabel"] {
  if (role === "admin") {
    return "admin";
  }

  if (role === "pro") {
    return "user_aktif";
  }

  if (role === "mentor") {
    return "user_aktif";
  }

  return "belum_bayar";
}

function mapManagedUser(row: ManagedUserRow): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    leaderboardAlias: row.leaderboard_alias,
    role: row.role,
    createdAt: row.created_at,
    filterLabel: resolveManagedUserFilterLabel(row.role),
  };
}

async function normalizeFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json() as {
        message?: string;
        error?: string;
      };
      const message = payload.message?.trim() || payload.error?.trim();

      if (message) {
        return new Error(message);
      }
    } catch {
      // Fall back to the generic Supabase error when the body is not valid JSON.
    }
  }

  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof error.message === "string"
    && error.message.trim().length > 0
  ) {
    return new Error(error.message);
  }

  return error instanceof Error
    ? error
    : new Error("Admin edge function request failed.");
}

export async function invokeAdminFunction<TData>(
  client: Pick<AdminClient, "functions">,
  functionName: string,
  body: Record<string, unknown>,
): Promise<TData> {
  const { data, error } = await client.functions.invoke(functionName, {
    body,
  });

  if (error) {
    throw await normalizeFunctionError(error);
  }

  return data as TData;
}

function resolveProfile(
  profile: PaymentPreviewRow["profile"],
): { fullName: string | null; email: string | null } {
  if (Array.isArray(profile)) {
    return {
      fullName: profile[0]?.full_name ?? null,
      email: profile[0]?.email ?? null,
    };
  }

  return {
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null,
  };
}

async function getPendingPaymentCount(client: AdminClient) {
  const { count, error } = await client
    .from("payment_submissions")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("status", "pending_review");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getTotalUsersCount(client: AdminClient) {
  const { count, error } = await client
    .from("profiles")
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getTotalAttemptsCount(client: AdminClient) {
  const { count, error } = await client
    .from("attempts")
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getPaymentQueuePreview(client: AdminClient) {
  const { data, error } = await client
    .from("payment_submissions")
    .select("id, package_code, created_at, status, profile:profiles!payment_submissions_user_id_fkey(full_name, email)")
    .eq("status", "pending_review")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as PaymentPreviewRow[] | null) ?? []).map((item) => {
    const profile = resolveProfile(item.profile);

    return {
      id: item.id,
      fullName: profile.fullName,
      email: profile.email,
      packageCode: item.package_code,
      createdAt: item.created_at,
      status: item.status,
    };
  });
}

export async function getAdminDashboardOverview(
  client: AdminClient = getSupabaseBrowserClient(),
): Promise<AdminDashboardViewModel> {
  const [
    pendingPaymentCount,
    totalUsers,
    totalAttempts,
    paymentQueuePreview,
  ] = await Promise.all([
    getPendingPaymentCount(client),
    getTotalUsersCount(client),
    getTotalAttemptsCount(client),
    getPaymentQueuePreview(client),
  ]);

  return mapAdminDashboardViewModel({
    pendingPaymentCount,
    totalUsers,
    totalAttempts,
    paymentQueuePreview,
  });
}

export async function listManagedUsers(
  client: Pick<AdminClient, "rpc"> = getSupabaseBrowserClient(),
): Promise<ManagedUser[]> {
  const { data, error } = await client.rpc("list_admin_users");

  if (error) {
    throw new Error(error.message);
  }

  return ((data as ManagedUserRow[] | null) ?? []).map(mapManagedUser);
}

export async function createManagedUser(
  input: CreateManagedUserInput,
  client: Pick<AdminClient, "functions"> = getSupabaseBrowserClient(),
) {
  return invokeAdminFunction<{
    action: "create_user";
    user: {
      id: string;
      email: string;
      role: ManagedUserRow["role"];
      fullName: string | null;
    };
  }>(client, "admin-manage-users", {
    action: "create_user",
    ...input,
  });
}

export async function updateManagedUserRole(
  input: UpdateManagedUserRoleInput,
  client: Pick<AdminClient, "functions"> = getSupabaseBrowserClient(),
) {
  return invokeAdminFunction<{
    action: "update_role";
    profile: {
      id: string;
      role: ManagedUserRow["role"];
    };
  }>(client, "admin-manage-users", {
    action: "update_role",
    userId: input.userId,
    role: input.role,
  });
}
