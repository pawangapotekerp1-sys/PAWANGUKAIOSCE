import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  HttpError,
  createServiceClient,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  generateGeminiText,
  isGeminiCredentialError,
  testGeminiConnection,
} from "../_shared/gemini-client.ts";

type UserAiCredentialRow = {
  id: string;
  model: string;
  secret_id: string | null;
  last_validated_at: string | null;
  last_error: string | null;
};

type BlockPerformanceRow = {
  block_name: string;
  accuracy: number;
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
};

type TopicPerformanceRow = {
  topic_name: string;
  block_name: string;
  accuracy: number;
  wrong_answers: number;
  total_questions: number;
};

async function readStudentCredential(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await service
    .from("user_ai_credentials")
    .select("id, model, secret_id, last_validated_at, last_error")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "BYOK_READ_FAILED", error.message);
  }

  return (data as UserAiCredentialRow | null) ?? null;
}

function mapStudentStatus(credential: UserAiCredentialRow | null) {
  return {
    hasCredential: Boolean(credential?.secret_id),
    model: credential?.model ?? null,
    lastValidatedAt: credential?.last_validated_at ?? null,
    lastError: credential?.last_error ?? null,
  };
}

async function createVaultSecret(
  service: ReturnType<typeof createServiceClient>,
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

async function readVaultSecret(service: ReturnType<typeof createServiceClient>, secretId: string) {
  const { data, error } = await service
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", secretId)
    .maybeSingle();

  if (error || !data?.decrypted_secret) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret BYOK belum tersedia.");
  }

  return data.decrypted_secret as string;
}

async function writeUsageLog(
  service: ReturnType<typeof createServiceClient>,
  {
    userId,
    credentialId,
    model,
    requestKind,
    status,
    errorMessage,
    metadata,
  }: {
    userId: string;
    credentialId: string | null;
    model: string;
    requestKind: "student_test" | "student_insight";
    status: "success" | "error";
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await service.from("ai_usage_logs").insert({
    user_id: userId,
    credential_id: credentialId,
    request_kind: requestKind,
    model,
    status,
    error_message: errorMessage ?? null,
    metadata: metadata ?? {},
  });
}

async function fetchAnalyticsContext(service: ReturnType<typeof createServiceClient>, userId: string) {
  const [{ data: blocks, error: blocksError }, { data: topics, error: topicsError }] = await Promise.all([
    service
      .from("user_block_performance")
      .select("block_name, accuracy, correct_answers, wrong_answers, total_questions")
      .eq("user_id", userId)
      .order("accuracy", { ascending: true }),
    service
      .from("user_topic_performance")
      .select("topic_name, block_name, accuracy, wrong_answers, total_questions")
      .eq("user_id", userId)
      .order("accuracy", { ascending: true })
      .limit(3),
  ]);

  if (blocksError || topicsError) {
    throw new HttpError(
      500,
      "ANALYTICS_CONTEXT_FAILED",
      blocksError?.message ?? topicsError?.message ?? "Analytics context unavailable.",
    );
  }

  return {
    blocks: (blocks as BlockPerformanceRow[] | null) ?? [],
    topics: (topics as TopicPerformanceRow[] | null) ?? [],
  };
}

function buildRulesFallback(
  blocks: BlockPerformanceRow[],
  topics: TopicPerformanceRow[],
) {
  const strongestBlock = [...blocks].sort((left, right) => right.accuracy - left.accuracy)[0] ?? null;
  const weakestBlock = blocks[0] ?? null;
  const focusAreas = topics.slice(0, 3).map((topic, index) => ({
    blockName: topic.block_name,
    topicName: topic.topic_name,
    reason: `${topic.topic_name} masih menahan ${topic.block_name} dengan akurasi ${Math.round(topic.accuracy)}%.`,
    priority: (index + 1) as 1 | 2 | 3,
  }));

  return {
    strengths: strongestBlock
      ? [`${strongestBlock.block_name} masih paling stabil di antara blok yang sudah dikerjakan.`]
      : ["Belum ada blok kuat yang cukup jelas untuk diringkas."],
    focusAreas,
    nextActions: focusAreas.length > 0
      ? focusAreas.map((item) => `Buka ulang ${item.topicName ?? item.blockName} sebagai pembuka review berikutnya.`)
      : ["Jalankan satu try out lagi agar AI punya cukup konteks untuk menyusun prioritas."],
    weakestBlockName: weakestBlock?.block_name ?? null,
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  const service = createServiceClient();

  try {
    const user = await requireAuthenticatedUser(req);
    const payload = await req.json();
    const credential = await readStudentCredential(service, user.id);

    if (payload.action === "get-status") {
      return jsonResponse({
        status: mapStudentStatus(credential),
      });
    }

    if (payload.action === "save-credential") {
      if (typeof payload.apiKey !== "string" || payload.apiKey.trim().length === 0) {
        throw new HttpError(400, "BYOK_REQUIRED", "Gemini API key pribadi wajib diisi.");
      }

      const nextSecretId = await createVaultSecret(
        service,
        payload.apiKey.trim(),
        `student-byok-${user.id}-${Date.now()}`,
        `Student BYOK for ${user.id}`,
      );
      const writePayload = {
        user_id: user.id,
        provider: "gemini",
        model: typeof payload.model === "string" && payload.model ? payload.model : "gemini-2.5-flash",
        secret_id: nextSecretId,
        secret_hint: `••••${payload.apiKey.trim().slice(-4)}`,
        last_error: null,
      };

      if (credential?.id) {
        const { error } = await service
          .from("user_ai_credentials")
          .update(writePayload)
          .eq("id", credential.id);

        if (error) {
          throw new HttpError(500, "BYOK_WRITE_FAILED", error.message);
        }
      } else {
        const { error } = await service
          .from("user_ai_credentials")
          .insert(writePayload);

        if (error) {
          throw new HttpError(500, "BYOK_WRITE_FAILED", error.message);
        }
      }

      return jsonResponse({
        status: mapStudentStatus(await readStudentCredential(service, user.id)),
      });
    }

    if (payload.action === "delete-credential") {
      if (credential?.id) {
        const { error } = await service
          .from("user_ai_credentials")
          .delete()
          .eq("id", credential.id);

        if (error) {
          throw new HttpError(500, "BYOK_DELETE_FAILED", error.message);
        }
      }

      return jsonResponse({
        status: mapStudentStatus(null),
      });
    }

    if (payload.action === "test-credential") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK yang bisa dites.");
      }

      const apiKey = await readVaultSecret(service, credential.secret_id);

      try {
        const testResult = await testGeminiConnection(apiKey, credential.model);
        await service
          .from("user_ai_credentials")
          .update({
            last_validated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", credential.id);
        await writeUsageLog(service, {
          userId: user.id,
          credentialId: credential.id,
          model: credential.model,
          requestKind: "student_test",
          status: "success",
          metadata: {
            latencyMs: testResult.latencyMs ?? null,
          },
        });

        return jsonResponse({
          status: mapStudentStatus(await readStudentCredential(service, user.id)),
          testResult,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "BYOK test failed.";
        await service
          .from("user_ai_credentials")
          .update({
            last_error: message,
          })
          .eq("id", credential.id);
        await writeUsageLog(service, {
          userId: user.id,
          credentialId: credential.id,
          model: credential.model,
          requestKind: "student_test",
          status: "error",
          errorMessage: message,
        });

        if (isGeminiCredentialError(error)) {
          throw new HttpError(400, "BYOK_INVALID", message);
        }

        throw error;
      }
    }

    if (payload.action === "generate") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan.");
      }

      const apiKey = await readVaultSecret(service, credential.secret_id);
      const analyticsContext = await fetchAnalyticsContext(service, user.id);
      const rulesFallback = buildRulesFallback(analyticsContext.blocks, analyticsContext.topics);

      try {
        const summary = await generateGeminiText({
          apiKey,
          model: credential.model,
          prompt: [
            "Kamu adalah asisten belajar singkat untuk mahasiswa farmasi.",
            "Tulis ringkasan 3-4 kalimat dalam Bahasa Indonesia yang langsung ke area lemah, tanpa mengulang data mentah terlalu banyak.",
            `Blok terlemah: ${rulesFallback.weakestBlockName ?? "belum ada"}.`,
            `Topik prioritas: ${analyticsContext.topics.map((item) => `${item.topic_name} (${Math.round(item.accuracy)}%)`).join(", ") || "belum ada"}.`,
            `Blok stabil: ${rulesFallback.strengths.join(" ")}`,
          ].join("\n"),
          maxOutputTokens: 220,
        });

        await service
          .from("user_ai_credentials")
          .update({
            last_validated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", credential.id);
        await writeUsageLog(service, {
          userId: user.id,
          credentialId: credential.id,
          model: credential.model,
          requestKind: "student_insight",
          status: "success",
        });

        return jsonResponse({
          insight: {
            source: "ai",
            generatedAt: new Date().toISOString(),
            summary,
            strengths: rulesFallback.strengths,
            focusAreas: rulesFallback.focusAreas,
            nextActions: rulesFallback.nextActions,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Student AI insight failed.";
        await service
          .from("user_ai_credentials")
          .update({
            last_error: message,
          })
          .eq("id", credential.id);
        await writeUsageLog(service, {
          userId: user.id,
          credentialId: credential.id,
          model: credential.model,
          requestKind: "student_insight",
          status: "error",
          errorMessage: message,
        });

        if (isGeminiCredentialError(error)) {
          throw new HttpError(400, "BYOK_INVALID", message);
        }

        throw error;
      }
    }

    throw new HttpError(400, "INVALID_ACTION", "Aksi student AI insight tidak dikenali.");
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
        message: error instanceof Error ? error.message : "Unexpected student AI error.",
      },
      500,
    );
  }
});
