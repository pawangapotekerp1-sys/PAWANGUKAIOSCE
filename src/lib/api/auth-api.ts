import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../supabase/browser-client";
import type { AppProfile } from "../auth/permissions";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  leaderboard_alias?: string | null;
  role: AppProfile["role"];
  created_at?: string;
  updated_at?: string;
};

type AuthClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "auth" | "from">;

function mapProfileRow(row: ProfileRow): AppProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url ?? null,
    leaderboardAlias: row.leaderboard_alias ?? null,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeAuthErrorMessage(message: string, statusCode?: number) {
  // Prefer status codes when available (resilient to message changes)
  if (statusCode === 400) {
    if (/invalid login credentials/i.test(message)) {
      return "Email atau kata sandi belum cocok.";
    }
    if (/email not confirmed/i.test(message)) {
      return "Email ini belum dikonfirmasi. Cek inbox sebelum mencoba lagi.";
    }
  }

  // Fallback to message matching for backward compatibility
  if (/invalid login credentials/i.test(message)) {
    return "Email atau kata sandi belum cocok.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Email ini belum dikonfirmasi. Cek inbox sebelum mencoba lagi.";
  }

  return message;
}

export async function loginWithPassword(
  {
    client = getSupabaseBrowserClient(),
    email,
    password,
  }: {
    client?: AuthClient;
    email: string;
    password: string;
  },
) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message, (error as any).status));
  }

  if (data.user) {
    await bootstrapProfile({
      client,
      user: data.user,
    });
  }

  return data;
}

export async function logout(
  client: AuthClient = getSupabaseBrowserClient(),
) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function bootstrapProfile(
  {
    client = getSupabaseBrowserClient(),
    user,
  }: {
    client?: AuthClient;
    user: User;
  },
): Promise<AppProfile> {
  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
  };
  const { data, error } = await client
    .from("profiles")
    .upsert(payload, {
      onConflict: "id",
    })
    .select("id, email, full_name, avatar_url, leaderboard_alias, role, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileRow(data as ProfileRow);
}

export async function requestPasswordReset(
  {
    client = getSupabaseBrowserClient(),
    email,
  }: {
    client?: AuthClient;
    email: string;
  },
) {
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message, (error as any).status));
  }
}

export async function updatePasswordAfterRecovery(
  {
    client = getSupabaseBrowserClient(),
    nextPassword,
  }: {
    client?: AuthClient;
    nextPassword: string;
  },
) {
  const { error } = await client.auth.updateUser({
    password: nextPassword,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message, (error as any).status));
  }
}
