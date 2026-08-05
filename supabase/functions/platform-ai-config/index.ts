import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { testGeminiConnection } from "../_shared/gemini-client.ts";
import { resolvePlatformTestConfig } from "../_shared/platform-ai-config.ts";

type PlatformConfigRow = {
  id: string;
  provider: "gemini" | "disabled";
  enabled: boolean;
  model: string;
  prompt_version: string | null;
  insight_mode: "rules" | "hybrid" | "ai";
  platform_secret_id: string | null;
  last_tested_at: string | null;
  updated_at: string | null;
};

function buildConfigOverview(row: PlatformConfigRow | null) {
  if (!row) {
    return {
      provider: "disabled" as const,
      enabled: false,
      model: "gemini-3.6-flash",
      promptVersion: "phase1-v1",
      insightMode: "rules" as const,
      hasSecret: false,
      lastTestedAt: null,
      updatedAt: null,
    };
  }

  return {
    provider: row.provider,
    enabled: row.enabled,
    model: row.model,
    promptVersion: row.prompt_version,
    insightMode: row.insight_mode,
    hasSecret: Boolean(row.platform_secret_id),
    lastTestedAt: row.last_tested_at,
    updatedAt: row.updated_at,
  };
}

async function readLatestPlatformConfig(service: Awaited<ReturnType<typeof requireAdmin>>["service"]) {
  const { data, error } = await service
    .from("ai_provider_configs")
    .select("id, provider, enabled, model, prompt_version, insight_mode, platform_secret_id, last_tested_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "CONFIG_READ_FAILED", error.message);
  }

  return (data as PlatformConfigRow | null) ?? null;
}

async function createVaultSecret(
  service: Awaited<ReturnType<typeof requireAdmin>>["service"],
  apiKey: string,
  name: string,
  description: string,
) {
  const { data, error } = await service
    .schema("vault")
    .rpc("create_secret", {
      secret: apiKey,
      name,
      description,
    });

  if (error) {
    throw new HttpError(500, "VAULT_WRITE_FAILED", error.message);
  }

  return data as string;
}

async function readVaultSecret(
  service: Awaited<ReturnType<typeof requireAdmin>>["service"],
  secretId: string,
) {
  const { data, error } = await service
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", secretId)
    .maybeSingle();

  if (error || !data?.decrypted_secret) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret platform belum tersedia.");
  }

  return data.decrypted_secret as string;
}

async function writeUsageLog(
  service: Awaited<ReturnType<typeof requireAdmin>>["service"],
  {
    userId,
    configId,
    model,
    status,
    errorMessage,
    metadata,
  }: {
    userId: string;
    configId: string | null;
    model: string;
    status: "success" | "error";
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await service.from("ai_usage_logs").insert({
    user_id: userId,
    config_id: configId,
    request_kind: "platform_test",
    model,
    status,
    error_message: errorMessage ?? null,
    metadata: metadata ?? {},
  });
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, service } = await requireAdmin(req);
    const payload = await req.json();
    const latestConfig = await readLatestPlatformConfig(service);

    if (payload.action === "get") {
      return jsonResponse({
        config: buildConfigOverview(latestConfig),
      });
    }

    if (payload.action === "update") {
      const nextSecretId = typeof payload.apiKey === "string" && payload.apiKey.trim().length > 0
        ? await createVaultSecret(
          service,
          payload.apiKey.trim(),
          `platform-gemini-${Date.now()}`,
          "Platform Gemini key for Pawang Masuk Apoteker",
        )
        : latestConfig?.platform_secret_id ?? null;
      const writePayload = {
        provider: payload.provider === "gemini" ? "gemini" : "disabled",
        enabled: Boolean(payload.enabled),
        model: typeof payload.model === "string" && payload.model ? payload.model : "gemini-3.6-flash",
        prompt_version: typeof payload.promptVersion === "string" ? payload.promptVersion : null,
        insight_mode: payload.insightMode === "ai" || payload.insightMode === "hybrid" ? payload.insightMode : "rules",
        platform_secret_id: nextSecretId,
        secret_hint: nextSecretId && typeof payload.apiKey === "string" && payload.apiKey.length >= 4
          ? `••••${payload.apiKey.slice(-4)}`
          : latestConfig?.platform_secret_id
            ? "Vault tersimpan"
            : null,
        created_by: user.id,
      };

      if (latestConfig?.id) {
        const { error } = await service
          .from("ai_provider_configs")
          .update(writePayload)
          .eq("id", latestConfig.id);

        if (error) {
          throw new HttpError(500, "CONFIG_WRITE_FAILED", error.message);
        }
      } else {
        const { error } = await service
          .from("ai_provider_configs")
          .insert(writePayload);

        if (error) {
          throw new HttpError(500, "CONFIG_WRITE_FAILED", error.message);
        }
      }

      return jsonResponse({
        config: buildConfigOverview(await readLatestPlatformConfig(service)),
      });
    }

    if (payload.action === "test") {
      if (!latestConfig?.platform_secret_id) {
        throw new HttpError(400, "MISSING_PLATFORM_KEY", "Belum ada key platform yang tersimpan untuk dites.");
      }

      const resolvedTestConfig = resolvePlatformTestConfig(
        {
          model: latestConfig.model,
          platformSecretId: latestConfig.platform_secret_id,
        },
        {
          apiKey: typeof payload.apiKey === "string" ? payload.apiKey : undefined,
          model: typeof payload.model === "string" ? payload.model : undefined,
        },
      );
      const apiKey = resolvedTestConfig.apiKey ?? await readVaultSecret(service, latestConfig.platform_secret_id);
      const testResult = await testGeminiConnection(apiKey, resolvedTestConfig.model);

      if (resolvedTestConfig.shouldPersistLastTestedAt) {
        await service
          .from("ai_provider_configs")
          .update({
            last_tested_at: new Date().toISOString(),
            last_test_status: "success",
            last_test_message: testResult.message,
          })
          .eq("id", latestConfig.id);
      }

      await writeUsageLog(service, {
        userId: user.id,
        configId: latestConfig.id,
        model: resolvedTestConfig.model,
        status: "success",
        metadata: {
          latencyMs: testResult.latencyMs ?? null,
          secretSource: resolvedTestConfig.secretSource,
        },
      });

      return jsonResponse({
        config: buildConfigOverview(await readLatestPlatformConfig(service)),
        testResult,
      });
    }

    throw new HttpError(400, "INVALID_ACTION", "Aksi platform AI config tidak dikenali.");
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    return jsonResponse(
      {
        error: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : "Unexpected platform AI error.",
      },
      500,
    );
  }
});
