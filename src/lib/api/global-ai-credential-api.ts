import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../supabase/browser-client";

type AiCredentialClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "functions">;

export type GlobalAiCredentialStatusViewModel = {
  hasCredential: boolean;
  model: string;
  lastValidatedAt: Date | null;
  lastError: string | null;
};

function mapAiCredentialStatus(dto: {
  hasCredential: boolean;
  model: string;
  lastValidatedAt: string | null;
  lastError: string | null;
}): GlobalAiCredentialStatusViewModel {
  return {
    hasCredential: dto.hasCredential,
    model: dto.model,
    lastValidatedAt: dto.lastValidatedAt ? new Date(dto.lastValidatedAt) : null,
    lastError: dto.lastError,
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
      // Fall back
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
    : new Error("AI credential request failed.");
}

async function invokeCredentialManager<TData>(
  body: Record<string, unknown>,
  client: AiCredentialClient = getSupabaseBrowserClient(),
): Promise<TData> {
  // We use flash-card-generator edge function as the backend manager for user_ai_credentials
  const { data, error } = await client.functions.invoke("flash-card-generator", {
    body,
  });

  if (error) {
    throw await normalizeFunctionError(error);
  }

  return data as TData;
}

export async function getGlobalAiCredentialStatus(
  client: AiCredentialClient = getSupabaseBrowserClient(),
): Promise<GlobalAiCredentialStatusViewModel> {
  const data = await invokeCredentialManager<{
    status: Parameters<typeof mapAiCredentialStatus>[0];
  }>({
    action: "get-status",
  }, client);

  return mapAiCredentialStatus(data.status);
}

export async function saveGlobalAiCredential(
  input: {
    apiKey: string;
    model?: string;
  },
  client: AiCredentialClient = getSupabaseBrowserClient(),
): Promise<GlobalAiCredentialStatusViewModel> {
  const data = await invokeCredentialManager<{
    status: Parameters<typeof mapAiCredentialStatus>[0];
  }>({
    action: "save-credential",
    apiKey: input.apiKey,
    model: input.model,
  }, client);

  return mapAiCredentialStatus(data.status);
}

export async function deleteGlobalAiCredential(
  client: AiCredentialClient = getSupabaseBrowserClient(),
): Promise<GlobalAiCredentialStatusViewModel> {
  const data = await invokeCredentialManager<{
    status: Parameters<typeof mapAiCredentialStatus>[0];
  }>({
    action: "delete-credential",
  }, client);

  return mapAiCredentialStatus(data.status);
}

export async function testGlobalAiCredential(
  client: AiCredentialClient = getSupabaseBrowserClient(),
): Promise<{
  status: GlobalAiCredentialStatusViewModel;
  testResult: {
    ok: boolean;
    message: string;
    latencyMs: number | null;
  };
}> {
  const data = await invokeCredentialManager<{
    status: Parameters<typeof mapAiCredentialStatus>[0];
    testResult: {
      ok: boolean;
      message: string;
      latencyMs: number | null;
    };
  }>({
    action: "test-credential",
  }, client);

  return {
    status: mapAiCredentialStatus(data.status),
    testResult: data.testResult,
  };
}

export async function getRawAiCredentialKey(
  client: AiCredentialClient = getSupabaseBrowserClient(),
): Promise<string> {
  const data = await invokeCredentialManager<{
    apiKey: string;
  }>({
    action: "export-credential",
  }, client);

  return data.apiKey;
}
