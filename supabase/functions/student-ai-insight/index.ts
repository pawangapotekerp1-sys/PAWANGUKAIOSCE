import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  HttpError,
  createServiceClient,
  createUserClient,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  DEFAULT_AI_MODEL,
  generateGeminiTextWithUsage,
  isGeminiCredentialError,
  normalizeAiModel,
  testGeminiConnection,
} from "../_shared/gemini-client.ts";
import { DIAGNOSIS_CONFIG, ENGINE_VERSION } from "../_shared/diagnosis-engine/config.ts";
import { PersonalWeaknessDiagnosisDataSchema } from "../_shared/diagnosis-engine/schemas.ts";
import { runDiagnosisEngine } from "../_shared/diagnosis-engine/engine.ts";
import { EvidenceRowSchema } from "../_shared/diagnosis-engine/validate.ts";
import {
  buildDiagnosisNarrationPrompt,
  decorateNarrativeWithDeterministicBadges,
  validateNarrative,
} from "../_shared/diagnosis-engine/narrative.ts";

export function resolveModelToUse(model: string | null | undefined): string {
  return normalizeAiModel(model);
}

export async function computeDiagnosisInputHash(params: {
  userId: string;
  engineVersion: string;
  unreleasedScheduledAttemptsCount: number;
  attempts: Array<{ id: string; submittedAt: string }>;
}): Promise<string> {
  const normalized = {
    userId: params.userId,
    engineVersion: params.engineVersion,
    unreleasedScheduledAttemptsCount: params.unreleasedScheduledAttemptsCount,
    attempts: [...params.attempts]
      .map((a) => ({ id: a.id, submittedAt: a.submittedAt }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(normalized));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildInsightLogPayload(params: {
  userId: string;
  credentialId: string | null;
  model?: string;
  requestKind?: "student_test" | "student_insight";
  status?: "success" | "error";
  errorMessage?: string | null;
  usage?: {
    isAvailable?: boolean;
    promptTokenCount?: number | null;
    candidatesTokenCount?: number | null;
    totalTokenCount?: number | null;
    thoughtsTokenCount?: number | null;
    statusText?: string;
  };
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}): {
  user_id: string;
  credential_id: string | null;
  model: string;
  request_kind: "student_test" | "student_insight";
  status: "success" | "error";
  error_message: string | null;
  metadata: Record<string, unknown>;
} {
  const metadata: Record<string, unknown> = {
    ...(params.metadata ?? {}),
    promptTokenCount: params.usage?.promptTokenCount ?? null,
    candidatesTokenCount: params.usage?.candidatesTokenCount ?? null,
    totalTokenCount: params.usage?.totalTokenCount ?? null,
    thoughtsTokenCount: params.usage?.thoughtsTokenCount ?? null,
    latencyMs: params.latencyMs ?? (typeof params.metadata?.latencyMs === "number" ? params.metadata.latencyMs : null),
  };

  return {
    user_id: params.userId,
    credential_id: params.credentialId,
    model: resolveModelToUse(params.model),
    request_kind: params.requestKind ?? "student_insight",
    status: params.status ?? "success",
    error_message: params.errorMessage ?? null,
    metadata,
  };
}

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
  const { data, error } = await service.rpc("create_vault_secret", {
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
  const { data, error } = await service.rpc("read_vault_secret", {
    target_secret_id: secretId,
  });

  if (error || typeof data !== "string" || data.length === 0) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret BYOK belum tersedia.");
  }

  return data;
}

async function writeUsageLog(
  service: ReturnType<typeof createServiceClient>,
  params: Parameters<typeof buildInsightLogPayload>[0],
) {
  await service.from("ai_usage_logs").insert(buildInsightLogPayload(params));
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

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
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
    const userClient = createUserClient(req);

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
        model: resolveModelToUse(typeof payload.model === "string" ? payload.model : undefined),
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
      const modelToUse = resolveModelToUse(credential.model);

      try {
        const testResult = await testGeminiConnection(apiKey, modelToUse);
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
          model: modelToUse,
          requestKind: "student_test",
          status: "success",
          latencyMs: testResult.latencyMs ?? undefined,
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
          model: modelToUse,
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
      const modelToUse = resolveModelToUse(credential.model);

      try {
        const result = await generateGeminiTextWithUsage({
          apiKey,
          model: modelToUse,
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
          model: modelToUse,
          requestKind: "student_insight",
          status: "success",
          usage: result.usage,
          latencyMs: result.latencyMs,
        });

        return jsonResponse({
          insight: {
            source: "ai",
            generatedAt: new Date().toISOString(),
            summary: result.text,
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
          model: modelToUse,
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

    if (payload.action === "generate-range-insight") {
      if (typeof payload.dateFrom !== "string" || typeof payload.dateTo !== "string") {
        throw new HttpError(400, "INVALID_DATE_RANGE", "Rentang tanggal tidak valid.");
      }

      const limitAttempts =
        typeof payload.limitAttempts === "number" && payload.limitAttempts > 0
          ? payload.limitAttempts
          : null;

      // 1. Fetch RPCs in parallel: get_personal_weakness_diagnosis and get_attempt_evidence
      const [diagnosisRes, evidenceRes] = await Promise.all([
        userClient.rpc("get_personal_weakness_diagnosis", {
          date_from: payload.dateFrom,
          date_to: payload.dateTo,
          user_timezone: payload.timezone ?? "UTC",
          limit_attempts: limitAttempts,
        }),
        userClient.rpc("get_attempt_evidence", {
          date_from: payload.dateFrom,
          date_to: payload.dateTo,
          user_timezone: payload.timezone ?? "UTC",
          limit_attempts: limitAttempts,
        }),
      ]);

      if (diagnosisRes.error) {
        throw new Error(diagnosisRes.error.message);
      }

      const parseResult = PersonalWeaknessDiagnosisDataSchema.safeParse(diagnosisRes.data);
      if (!parseResult.success) {
        console.error("Diagnosis RPC schema mismatch:", parseResult.error.format());
        throw new HttpError(
          500,
          "DIAGNOSIS_SCHEMA_MISMATCH",
          `Struktur data diagnosis tidak sesuai skema: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
        );
      }
      const diagnosis = parseResult.data;

      const eligibleSubtopics = diagnosis.subtopicRankings || [];
      if (eligibleSubtopics.length === 0) {
        throw new HttpError(
          400,
          "INSUFFICIENT_DATA",
          "Dibutuhkan minimal 1 subtopik berstatus indikatif atau utama (minimal 10 soal terjawab) untuk analisis AI.",
        );
      }

      if (evidenceRes.error) {
        throw new Error(evidenceRes.error.message);
      }

      const evidenceParse = EvidenceRowSchema.array().safeParse(evidenceRes.data ?? []);
      if (!evidenceParse.success) {
        console.error("Evidence RPC schema mismatch:", evidenceParse.error.format());
        throw new HttpError(
          500,
          "EVIDENCE_SCHEMA_MISMATCH",
          `Struktur data evidence tidak sesuai skema: ${evidenceParse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
        );
      }
      const evidenceRows = evidenceParse.data;

      // Compute input hash based on eligible attempts and query parameters
      const uniqueAttemptsMap = new Map<string, string>();
      for (const row of evidenceRows) {
        if (!uniqueAttemptsMap.has(row.attempt_id)) {
          uniqueAttemptsMap.set(row.attempt_id, row.submitted_at);
        }
      }
      const attemptItems = Array.from(uniqueAttemptsMap.entries()).map(([id, submittedAt]) => ({
        id,
        submittedAt,
      }));

      const unreleasedScheduledAttemptsCount = Math.max(
        0,
        ...evidenceRows.map((r) => r.unreleased_scheduled_attempts ?? 0),
      );

      const inputHash = await computeDiagnosisInputHash({
        userId: user.id,
        engineVersion: ENGINE_VERSION,
        unreleasedScheduledAttemptsCount,
        attempts: attemptItems,
      });

      // Resolve API key (BYOK)
      let apiKey: string | null = null;
      if (credential?.secret_id) {
        try {
          apiKey = await readVaultSecret(service, credential.secret_id);
        } catch {
          apiKey = null;
        }
      }

      // Check cache in ai_insight_reports
      const { data: cachedReport } = await service
        .from("ai_insight_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("input_hash", inputHash)
        .eq("engine_version", ENGINE_VERSION)
        .maybeSingle();

      if (cachedReport) {
        const canUpgradeToGemini = cachedReport.source === "fallback" && Boolean(apiKey);
        if (!canUpgradeToGemini) {
          return jsonResponse({
            insight: {
              summary: cachedReport.summary,
              narrative: cachedReport.narrative,
              report: cachedReport.report,
              source: cachedReport.source,
              model: cachedReport.model,
              fallbackReason: cachedReport.fallback_reason ?? null,
              engineVersion: cachedReport.engine_version,
              generatedAt: cachedReport.created_at,
            },
          });
        }
      }

      // 2. Run deterministic diagnosis engine
      const report = runDiagnosisEngine(evidenceRows, DIAGNOSIS_CONFIG);

      if (!apiKey) {
        const fallbackNarrative = report.fallbackMarkdown;
        await service
          .from("ai_insight_reports")
          .upsert(
            {
              user_id: user.id,
              input_hash: inputHash,
              engine_version: ENGINE_VERSION,
              report,
              narrative: fallbackNarrative,
              summary: fallbackNarrative,
              source: "fallback",
              fallback_reason: "no_key",
              model: "deterministic-engine",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,input_hash,engine_version" },
          );

        return jsonResponse({
          insight: {
            summary: fallbackNarrative,
            narrative: fallbackNarrative,
            report,
            source: "fallback",
            fallbackReason: "no_key",
            model: "deterministic-engine",
            engineVersion: ENGINE_VERSION,
            generatedAt: new Date().toISOString(),
          },
        });
      }

      // 4. Rate limit check (cooldown 30s) when invoking Gemini AI
      const { data: lastUsage } = await service
        .from("ai_usage_logs")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("request_kind", "student_insight")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastUsage?.created_at) {
        const elapsedSeconds = (Date.now() - new Date(lastUsage.created_at).getTime()) / 1000;
        if (elapsedSeconds < DIAGNOSIS_CONFIG.rateLimits.cooldownSeconds) {
          const waitSeconds = Math.ceil(DIAGNOSIS_CONFIG.rateLimits.cooldownSeconds - elapsedSeconds);
          throw new HttpError(429, "COOLDOWN_ACTIVE", `Harap tunggu ${waitSeconds} detik sebelum membuat analisis AI baru.`);
        }
      }

      const modelToUse = resolveModelToUse(credential.model);
      const prompt = buildDiagnosisNarrationPrompt(report);
      let narrative = report.fallbackMarkdown;
      let source: "gemini" | "fallback" = "fallback";
      let usageResult = null;
      let latencyMs = 0;

      try {
        // Call 1
        let geminiResult = await generateGeminiTextWithUsage({
          apiKey,
          model: modelToUse,
          prompt,
          temperature: DIAGNOSIS_CONFIG.ai.temperature, // 0.2
          maxOutputTokens: DIAGNOSIS_CONFIG.ai.maxOutputTokens, // 1800 explicitly passed!
        });
        latencyMs = geminiResult.latencyMs ?? 0;
        usageResult = geminiResult.usage;

        let validation = validateNarrative(geminiResult.text, report);

        // If invalid, retry ONCE
        let fallbackReason: "validation_failed" | "gemini_error" | null = null;
        if (!validation.valid) {
          console.warn(`[DIAGNOSIS_VALIDATION_REJECT] code=${validation.code} details=${validation.invalidNumbers?.join(",") || validation.invalidIds?.join(",") || "missing_indikatif"}`);
          const retryPrompt = [
            prompt,
            "",
            `PERINGATAN VALIDASI: Narasi sebelumnya ditolak karena memuat data di luar laporan (${validation.reason}).`,
            "Tulis ulang narasi dengan HANYA menggunakan angka dan data yang tercantum persis di data laporan resmi di atas!",
          ].join("\n");

          const retryResult = await generateGeminiTextWithUsage({
            apiKey,
            model: modelToUse,
            prompt: retryPrompt,
            temperature: DIAGNOSIS_CONFIG.ai.temperature,
            maxOutputTokens: DIAGNOSIS_CONFIG.ai.maxOutputTokens,
          });
          latencyMs += retryResult.latencyMs ?? 0;
          usageResult = retryResult.usage;

          validation = validateNarrative(retryResult.text, report);
          if (validation.valid) {
            narrative = retryResult.text;
            source = "gemini";
            fallbackReason = null;
          } else {
            console.warn(`[DIAGNOSIS_VALIDATION_REJECT] code=${validation.code} details=${validation.invalidNumbers?.join(",") || validation.invalidIds?.join(",") || "missing_indikatif"}`);
            narrative = report.fallbackMarkdown;
            source = "fallback";
            fallbackReason = "validation_failed";
          }
        } else {
          narrative = geminiResult.text;
          source = "gemini";
          fallbackReason = null;
        }

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
          model: modelToUse,
          requestKind: "student_insight",
          status: source === "gemini" ? "success" : "error",
          usage: usageResult ?? undefined,
          latencyMs,
          metadata: {
            dateFrom: payload.dateFrom,
            dateTo: payload.dateTo,
            source,
          },
        });

        const finalNarrative =
          source === "gemini"
            ? decorateNarrativeWithDeterministicBadges(narrative, report)
            : narrative;

        const resolvedModel = source === "gemini" ? modelToUse : "deterministic-engine";

        await service
          .from("ai_insight_reports")
          .upsert(
            {
              user_id: user.id,
              input_hash: inputHash,
              engine_version: ENGINE_VERSION,
              report,
              narrative: finalNarrative,
              summary: finalNarrative,
              source,
              fallback_reason: fallbackReason,
              model: resolvedModel,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,input_hash,engine_version" },
          );

        return jsonResponse({
          insight: {
            summary: finalNarrative,
            narrative: finalNarrative,
            report,
            source,
            fallbackReason,
            model: resolvedModel,
            engineVersion: ENGINE_VERSION,
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (geminiError) {
        console.error("Gemini call failed during diagnosis narration:", geminiError);
        const message = geminiError instanceof Error ? geminiError.message : "Diagnosis Gemini narration failed.";

        await service
          .from("user_ai_credentials")
          .update({
            last_error: message,
          })
          .eq("id", credential.id);

        await writeUsageLog(service, {
          userId: user.id,
          credentialId: credential.id,
          model: modelToUse,
          requestKind: "student_insight",
          status: "error",
          errorMessage: message,
          metadata: {
            dateFrom: payload.dateFrom,
            dateTo: payload.dateTo,
            source: "fallback",
          },
        });

        if (isGeminiCredentialError(geminiError)) {
          throw new HttpError(400, "BYOK_INVALID", message);
        }

        const fallbackNarrative = report.fallbackMarkdown;
        await service
          .from("ai_insight_reports")
          .upsert(
            {
              user_id: user.id,
              input_hash: inputHash,
              engine_version: ENGINE_VERSION,
              report,
              narrative: fallbackNarrative,
              summary: fallbackNarrative,
              source: "fallback",
              fallback_reason: "gemini_error",
              model: "deterministic-engine",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,input_hash,engine_version" },
          );

        return jsonResponse({
          insight: {
            summary: fallbackNarrative,
            narrative: fallbackNarrative,
            report,
            source: "fallback",
            fallbackReason: "gemini_error",
            model: "deterministic-engine",
            engineVersion: ENGINE_VERSION,
            generatedAt: new Date().toISOString(),
          },
        });
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
}
