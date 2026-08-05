import { getSupabaseBrowserClient } from "../supabase/browser-client";
import type { AppProfile } from "../auth/permissions";
import { normalizeAuthErrorMessage } from "./auth-api";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  leaderboard_alias: string | null;
  role: AppProfile["role"];
  created_at?: string;
  updated_at?: string;
};

type ProfileClient = Pick<
  ReturnType<typeof getSupabaseBrowserClient>,
  "auth" | "from" | "storage"
>;

function mapProfileRow(row: ProfileRow): AppProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    leaderboardAlias: row.leaderboard_alias,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAvatarFileExtension(file: File) {
  const inputExtension = file.name.split(".").pop()?.toLowerCase();

  if (inputExtension) {
    return inputExtension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "bin";
}

export async function getCurrentProfile(
  client: ProfileClient = getSupabaseBrowserClient(),
): Promise<AppProfile> {
  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, avatar_url, leaderboard_alias, role, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileRow(data as ProfileRow);
}

export async function getProfileAvatarSignedUrl(
  {
    avatarPath,
  }: {
    avatarPath: string;
  },
  client: ProfileClient = getSupabaseBrowserClient(),
) {
  const { data, error } = await client.storage
    .from("profile-avatars")
    .createSignedUrl(avatarPath, 60 * 60);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function updateCurrentProfileName(
  {
    userId,
    fullName,
  }: {
    userId: string;
    fullName: string;
  },
  client: ProfileClient = getSupabaseBrowserClient(),
) {
  const { error: authError } = await client.auth.updateUser({
    data: {
      full_name: fullName,
    },
  });

  if (authError) {
    throw new Error(normalizeAuthErrorMessage(authError.message));
  }

  const { error } = await client
    .from("profiles")
    .update({
      full_name: fullName,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateCurrentLeaderboardAlias(
  {
    userId,
    leaderboardAlias,
  }: {
    userId: string;
    leaderboardAlias: string;
  },
  client: ProfileClient = getSupabaseBrowserClient(),
) {
  const { error } = await client
    .from("profiles")
    .update({
      leaderboard_alias: leaderboardAlias,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateCurrentUserPassword(
  {
    currentPassword,
    nextPassword,
  }: {
    currentPassword: string;
    nextPassword: string;
  },
  client: ProfileClient = getSupabaseBrowserClient(),
) {
  const { error } = await client.auth.updateUser({
    current_password: currentPassword,
    password: nextPassword,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }
}

export async function removeProfileAvatarObject(
  {
    avatarPath,
  }: {
    avatarPath: string;
  },
  client: ProfileClient = getSupabaseBrowserClient(),
) {
  const { error } = await client.storage
    .from("profile-avatars")
    .remove([avatarPath]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadCurrentUserAvatar(
  {
    userId,
    file,
    previousAvatarPath,
  }: {
    userId: string;
    file: File;
    previousAvatarPath?: string | null;
  },
  client: ProfileClient = getSupabaseBrowserClient(),
) {
  const fileExtension = getAvatarFileExtension(file);
  const avatarPath = `${userId}/avatar.${fileExtension}`;
  const { error: uploadError } = await client.storage
    .from("profile-avatars")
    .upload(avatarPath, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({
      avatar_url: avatarPath,
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (previousAvatarPath && previousAvatarPath !== avatarPath) {
    const { error: removeError } = await client.storage
      .from("profile-avatars")
      .remove([previousAvatarPath]);

    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  return {
    avatarUrl: avatarPath,
  };
}
