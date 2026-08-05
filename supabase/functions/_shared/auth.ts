import { createClient } from "npm:@supabase/supabase-js@2";
import { readEdgeEnv } from "./env.ts";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createUserClient(req: Request) {
  const env = readEdgeEnv();
  const authorization = req.headers.get("Authorization");

  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: authorization
      ? {
        headers: {
          Authorization: authorization,
        },
      }
      : undefined,
  });
}

export function createServiceClient() {
  const env = readEdgeEnv();

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAuthenticatedUser(req: Request) {
  const userClient = createUserClient(req);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "UNAUTHORIZED", "Kamu perlu login untuk mengakses fungsi ini.");
  }

  return user;
}

export async function requireAdmin(req: Request) {
  const user = await requireAuthenticatedUser(req);
  const userClient = createUserClient(req);
  const service = createServiceClient();
  const { data: profile, error } = await userClient
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "Fungsi ini hanya bisa diakses admin.");
  }

  return {
    user,
    profile,
    userClient,
    service,
  };
}

export async function requireQuestionBankManager(req: Request) {
  const user = await requireAuthenticatedUser(req);
  const service = createServiceClient();
  const { data: profile, error } = await service
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || (profile.role !== "admin" && profile.role !== "mentor")) {
    throw new HttpError(403, "FORBIDDEN", "Fungsi ini hanya bisa diakses admin atau mentor.");
  }

  return {
    user,
    profile,
    service,
  };
}
