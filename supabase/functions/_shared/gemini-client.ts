import { readEdgeEnv } from "./env.ts";

export const SUPPORTED_AI_MODELS = ["gemini-3.8-flash"] as const;
export type SupportedAiModel = (typeof SUPPORTED_AI_MODELS)[number];
export const DEFAULT_AI_MODEL: SupportedAiModel = "gemini-3.8-flash";

const DEPRECATED_AI_MODELS = new Set([
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
]);

export function normalizeAiModel(model: string | null | undefined): string {
  if (typeof model !== "string") {
    return DEFAULT_AI_MODEL;
  }

  const trimmed = model.trim();
  if (!trimmed || DEPRECATED_AI_MODELS.has(trimmed.toLowerCase())) {
    return DEFAULT_AI_MODEL;
  }

  return trimmed;
}

export type GeminiUsageMetadata = {
  isAvailable: boolean;
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  totalTokenCount: number | null;
  thoughtsTokenCount: number | null;
  statusText?: string;
};

export type GeminiRequest = {
  apiKey: string;
  model: string;
  prompt: string;
  parts?: Array<
    | {
      text: string;
    }
    | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    }
  >;
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  thinkingLevel?: "low" | "medium" | "high";
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
};

const GEMINI_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const GEMINI_CAPACITY_MESSAGE_PATTERNS = [
  "resource_exhausted",
  "overloaded",
  "try again later",
];
const GEMINI_TRANSIENT_RETRY_DELAY_MS = 200;
const GEMINI_TEXT_MAX_ATTEMPTS = 3;
const GEMINI_STRUCTURED_MAX_ATTEMPTS = 2;
const GEMINI_STRUCTURED_RETRY_TOKEN_MULTIPLIER = 2;
const GEMINI_STRUCTURED_RETRY_MIN_TOKENS = 8192;

export type GeminiErrorCategory =
  | "GEMINI_RATE_LIMITED"
  | "GEMINI_QUOTA_EXHAUSTED"
  | "GEMINI_TOKEN_LIMITED"
  | "GEMINI_MODEL_UNAVAILABLE"
  | "GEMINI_PROVIDER_UNAVAILABLE"
  | "GEMINI_REQUEST_INVALID"
  | "GEMINI_AUTHENTICATION_FAILED"
  | "GEMINI_MAX_TOKENS"
  | "GEMINI_INVALID_JSON";

export type GeminiRequestErrorCode = GeminiErrorCategory | string;

export type GeminiErrorDiagnostics = {
  category?: GeminiErrorCategory;
  isRetryable?: boolean;
  retryAfterSeconds?: number | null;
  rawStatus?: number;
  originalMessage?: string;
};

export class GeminiRequestError extends Error {
  status: number;
  code: GeminiRequestErrorCode | null;
  diagnostics?: GeminiErrorDiagnostics;

  constructor(
    status: number,
    message: string,
    code: GeminiRequestErrorCode | null = null,
    diagnostics?: GeminiErrorDiagnostics,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

function extractGeminiText(payload: Record<string, unknown>) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate = candidates[0] as {
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  } | undefined;
  const parts = firstCandidate?.content?.parts ?? [];

  return parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function stripJsonCodeFence(value: string) {
  const trimmedValue = value.trim();
  const fencedMatch = trimmedValue.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return (fencedMatch?.[1] ?? trimmedValue).trim();
}

function extractLikelyJsonBlock(value: string) {
  const normalizedValue = stripJsonCodeFence(value);
  const objectStart = normalizedValue.indexOf("{");
  const arrayStart = normalizedValue.indexOf("[");
  const candidateStarts = [objectStart, arrayStart].filter((index) => index >= 0);

  if (!candidateStarts.length) {
    return normalizedValue;
  }

  const start = Math.min(...candidateStarts);
  const objectEnd = normalizedValue.lastIndexOf("}");
  const arrayEnd = normalizedValue.lastIndexOf("]");
  const end = Math.max(objectEnd, arrayEnd);

  if (end < start) {
    return normalizedValue;
  }

  return normalizedValue.slice(start, end + 1).trim();
}

function repairCommonJsonFormatting(value: string) {
  return value
    .replace(/([}\]"0-9eEl])(\s*)(?="(?:[^"\\]|\\.)+"\s*:)/g, "$1,$2")
    .replace(/,\s*([}\]])/g, "$1");
}

export function parseGeminiStructuredJsonText<TValue>(value: string): TValue {
  const jsonText = extractLikelyJsonBlock(value);

  try {
    return JSON.parse(jsonText) as TValue;
  } catch {
    try {
      return JSON.parse(repairCommonJsonFormatting(jsonText)) as TValue;
    } catch {
      throw new GeminiRequestError(
        502,
        "Gemini mengembalikan format JSON yang belum valid. Coba generate ulang dalam beberapa saat.",
        "GEMINI_INVALID_JSON",
      );
    }
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function extractRetryAfterSeconds(
  headers?: Headers | Record<string, string> | null,
  payload?: any,
): number | null {
  if (headers) {
    let headerVal: string | null = null;
    if (typeof (headers as Headers).get === "function") {
      headerVal = (headers as Headers).get("retry-after") ?? (headers as Headers).get("Retry-After");
    } else if (typeof headers === "object") {
      const record = headers as Record<string, string>;
      headerVal = record["retry-after"] ?? record["Retry-After"] ?? null;
    }
    if (headerVal) {
      const parsedNum = parseFloat(headerVal);
      if (!Number.isNaN(parsedNum) && parsedNum > 0) {
        return Math.round(parsedNum);
      }
      const parsedDate = new Date(headerVal).getTime();
      if (!Number.isNaN(parsedDate)) {
        const diffSec = Math.round((parsedDate - Date.now()) / 1000);
        return diffSec > 0 ? diffSec : null;
      }
    }
  }

  if (payload && typeof payload === "object") {
    const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
    for (const item of details) {
      if (item && typeof item === "object") {
        const typeStr = String(item["@type"] ?? "");
        if (typeStr.includes("RetryInfo") && typeof item.retryDelay === "string") {
          const match = item.retryDelay.match(/([0-9.]+)\s*s?/i);
          if (match) {
            const sec = parseFloat(match[1]);
            if (!Number.isNaN(sec) && sec > 0) {
              return Math.max(1, Math.round(sec));
            }
          }
        }
      }
    }
  }

  return null;
}

export function sanitizeText(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value
    .replace(/AIza[0-9A-Za-z-_]{15,}/gi, "[REDACTED_API_KEY]")
    .replace(/(?:key|token|bearer)=?[^\s&"']+/gi, "[REDACTED]");
}

export type GeminiErrorClassification = {
  category: GeminiErrorCategory;
  isRetryable: boolean;
  userMessage: string;
  retryAfterSeconds?: number | null;
  rawStatus?: number;
  errorCode?: string | number | null;
};

export function classifyGeminiErrorResponse(params: {
  status: number;
  payload?: any;
  headers?: Headers | Record<string, string>;
}): GeminiErrorClassification {
  const { status, payload, headers } = params;
  const rawMessage = typeof payload?.error?.message === "string" ? payload.error.message : "";
  const normalizedMessage = rawMessage.toLowerCase();
  const rawStatus = typeof payload?.error?.status === "string" ? payload.error.status : "";
  const normalizedStatus = rawStatus.toLowerCase();
  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];

  let quotaLimit = "";
  let reason = "";

  for (const detail of details) {
    if (detail && typeof detail === "object") {
      if (typeof detail.reason === "string") {
        reason = detail.reason;
      }
      if (detail.metadata && typeof detail.metadata.quota_limit === "string") {
        quotaLimit = detail.metadata.quota_limit;
      }
    }
  }

  const retryAfterSeconds = extractRetryAfterSeconds(headers, payload);

  // 1. Check Authentication / Credential errors first (HTTP 400 with API key invalid, 401, 403)
  const isAuthError =
    status === 401 ||
    status === 403 ||
    reason === "API_KEY_INVALID" ||
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("api_key") ||
    normalizedMessage.includes("credential") ||
    normalizedMessage.includes("permission_denied") ||
    normalizedStatus === "permission_denied";

  if (isAuthError && (status === 400 || status === 401 || status === 403)) {
    return {
      category: "GEMINI_AUTHENTICATION_FAILED",
      isRetryable: false,
      userMessage: "API key Gemini tidak valid (API key not valid) atau tidak memiliki akses. Periksa konfigurasi API key Anda di Google AI Studio.",
      retryAfterSeconds: null,
      rawStatus: status,
      errorCode: payload?.error?.code ?? status,
    };
  }

  // 2. Check Daily Quota / Billing / RPD exhausted (HTTP 429)
  const isDailyQuota =
    quotaLimit.toLowerCase().includes("perday") ||
    normalizedMessage.includes("daily limit") ||
    normalizedMessage.includes("daily quota") ||
    normalizedMessage.includes("perday") ||
    normalizedMessage.includes("requests per day") ||
    normalizedMessage.includes("tokens per day") ||
    normalizedMessage.includes("free tier daily");

  if (status === 429 && isDailyQuota) {
    return {
      category: "GEMINI_QUOTA_EXHAUSTED",
      isRetryable: false,
      userMessage: "Batas kuota harian Gemini (Daily Quota) terlampaui. Kuota gratis harian Anda telah habis atau project Google AI Studio mencapai limit harian. Silakan ganti API key atau coba besok.",
      retryAfterSeconds,
      rawStatus: status,
      errorCode: payload?.error?.code ?? status,
    };
  }

  // 3. Check Token Limit (TPM)
  const isTokenLimit =
    quotaLimit.toLowerCase().includes("tokensperminute") ||
    normalizedMessage.includes("tokens per minute") ||
    normalizedMessage.includes("token limit") ||
    normalizedMessage.includes("tpm");

  if (status === 429 && isTokenLimit) {
    return {
      category: "GEMINI_TOKEN_LIMITED",
      isRetryable: true,
      userMessage: "Permintaan ke Gemini sedang penuh sementara (Batas token per menit/TPM terlampaui). Coba generate ulang dalam beberapa saat.",
      retryAfterSeconds,
      rawStatus: status,
      errorCode: payload?.error?.code ?? status,
    };
  }

  // 4. Check Rate Limit (RPM / Requests Per Minute)
  const isRateLimit =
    status === 429 ||
    reason === "RATE_LIMIT_EXCEEDED" ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("resource_exhausted") ||
    normalizedStatus === "resource_exhausted";

  if (isRateLimit) {
    return {
      category: "GEMINI_RATE_LIMITED",
      isRetryable: true,
      userMessage: "Permintaan ke Gemini sedang penuh sementara (Batas RPM terlampaui). Coba generate ulang dalam beberapa saat.",
      retryAfterSeconds,
      rawStatus: status,
      errorCode: payload?.error?.code ?? status,
    };
  }

  // 5. Check Service / Provider Unavailable or Model Overload (503, 502, 504, or unavailable)
  const isOverloadOrUnavailable =
    status === 503 ||
    status === 502 ||
    status === 504 ||
    normalizedStatus === "unavailable" ||
    normalizedMessage.includes("overloaded") ||
    normalizedMessage.includes("try again later");

  if (isOverloadOrUnavailable) {
    const rawDetail = sanitizeText(rawMessage);
    const detailSuffix = rawDetail ? ` (${rawDetail})` : "";
    return {
      category: "GEMINI_PROVIDER_UNAVAILABLE",
      isRetryable: true,
      userMessage: `Layanan Gemini mengalami gangguan sementara dari sisi Google${detailSuffix}. Sistem akan mencoba kembali dalam beberapa saat.`,
      retryAfterSeconds,
      rawStatus: status,
      errorCode: payload?.error?.code ?? status,
    };
  }

  // 6. Generic Invalid Request (400)
  if (status === 400) {
    return {
      category: "GEMINI_REQUEST_INVALID",
      isRetryable: false,
      userMessage: "Permintaan ke Gemini tidak valid. Periksa parameter permintaan.",
      retryAfterSeconds: null,
      rawStatus: status,
      errorCode: payload?.error?.code ?? status,
    };
  }

  // 7. Fallback
  return {
    category: "GEMINI_PROVIDER_UNAVAILABLE",
    isRetryable: status >= 500,
    userMessage: sanitizeText(rawMessage) || "Terjadi kesalahan saat berkomunikasi dengan Gemini.",
    retryAfterSeconds,
    rawStatus: status,
    errorCode: payload?.error?.code ?? status,
  };
}

function calculateBackoffDelay(attempt: number, retryAfterSeconds?: number | null): number {
  const isTestEnv = (typeof process !== "undefined" && (process.env?.VITEST || process.env?.NODE_ENV === "test")) ||
    (typeof Deno !== "undefined" && (Deno.env.get("VITEST") === "true" || Deno.env.get("NODE_ENV") === "test"));

  if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
    if (isTestEnv) return 20;
    return Math.min(30000, retryAfterSeconds * 1000);
  }

  if (isTestEnv) {
    return 20 * attempt;
  }

  const baseDelay = 1000 * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * 500);
  return baseDelay + jitter;
}

function isGeminiTransientError(status: number, message: string) {
  if (GEMINI_RETRYABLE_STATUSES.has(status)) {
    return true;
  }

  const normalizedMessage = message.trim().toLowerCase();

  return GEMINI_CAPACITY_MESSAGE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
}

function isGeminiCapacityError(status: number, message: string) {
  if (status === 429) {
    return true;
  }

  const normalizedMessage = message.trim().toLowerCase();

  return GEMINI_CAPACITY_MESSAGE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
}

function toGeminiTransientUserMessage() {
  return "Permintaan ke Gemini sedang penuh sementara (Batas RPM terlampaui). Coba generate ulang dalam beberapa saat.";
}

function shouldRetryStructuredResponseError(error: GeminiRequestError) {
  return error.code === "GEMINI_INVALID_JSON" || error.code === "GEMINI_MAX_TOKENS";
}

function toGeminiMaxTokensMessage() {
  return "Output Gemini terpotong karena batas token. Sistem akan mencoba ulang dengan ruang output lebih besar.";
}

function toRestSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toRestSchema);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      if (key === "type" && typeof entryValue === "string") {
        return [key, entryValue.toUpperCase()];
      }

      return [key, toRestSchema(entryValue)];
    }),
  );
}

function buildStructuredRetryRequest(request: GeminiRequest, error: GeminiRequestError): GeminiRequest {
  const retryInstruction =
    "PENTING: Respons sebelumnya belum valid JSON. Ulangi jawaban hanya sebagai JSON valid yang sesuai schema, tanpa markdown atau prose tambahan.";
  const maxOutputTokens = error.code === "GEMINI_MAX_TOKENS"
    ? Math.max(
      GEMINI_STRUCTURED_RETRY_MIN_TOKENS,
      (request.maxOutputTokens ?? GEMINI_STRUCTURED_RETRY_MIN_TOKENS) * GEMINI_STRUCTURED_RETRY_TOKEN_MULTIPLIER,
    )
    : request.maxOutputTokens;

  if (Array.isArray(request.parts) && request.parts.length > 0) {
    return {
      ...request,
      maxOutputTokens,
      parts: [
        ...request.parts,
        {
          text: retryInstruction,
        },
      ],
    };
  }

  return {
    ...request,
    maxOutputTokens,
    prompt: `${request.prompt}\n\n${retryInstruction}`,
  };
}

function extractGeminiUsage(payload: Record<string, unknown>): GeminiUsageMetadata {
  const usage = payload?.usageMetadata;
  if (!usage || typeof usage !== "object") {
    return {
      isAvailable: false,
      statusText: "NOT_RETURNED_BY_PROVIDER",
      promptTokenCount: null,
      candidatesTokenCount: null,
      totalTokenCount: null,
      thoughtsTokenCount: null,
    };
  }

  const usageRecord = usage as Record<string, unknown>;
  let thoughtsTokenCount: number | null = typeof usageRecord.thoughtsTokenCount === "number"
    ? usageRecord.thoughtsTokenCount
    : null;

  if (thoughtsTokenCount === null && Array.isArray(usageRecord.candidatesTokensDetails)) {
    const thinkingDetail = (usageRecord.candidatesTokensDetails as Array<Record<string, unknown>>).find(
      (detail) => String(detail.modality ?? "").toUpperCase() === "THINKING",
    );
    if (typeof thinkingDetail?.tokenCount === "number") {
      thoughtsTokenCount = thinkingDetail.tokenCount;
    }
  }

  return {
    isAvailable: true,
    promptTokenCount: typeof usageRecord.promptTokenCount === "number" ? usageRecord.promptTokenCount : null,
    candidatesTokenCount: typeof usageRecord.candidatesTokenCount === "number" ? usageRecord.candidatesTokenCount : null,
    totalTokenCount: typeof usageRecord.totalTokenCount === "number" ? usageRecord.totalTokenCount : null,
    thoughtsTokenCount,
  };
}

type GeminiOnceResult = {
  text: string;
  usage: GeminiUsageMetadata;
};

async function generateGeminiTextOnce({
  apiKey,
  model,
  prompt,
  parts,
  temperature = 0.2,
  maxOutputTokens,
  thinkingBudget,
  thinkingLevel,
  responseMimeType,
  responseSchema,
}: GeminiRequest): Promise<GeminiOnceResult> {
  const env = readEdgeEnv();
  const resolvedModel = normalizeAiModel(model);
  const effectiveMaxOutputTokens = typeof maxOutputTokens === "number"
    ? maxOutputTokens
    : (thinkingLevel || typeof thinkingBudget === "number" || responseMimeType === "application/json")
      ? 8192
      : 512;
  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: effectiveMaxOutputTokens,
  };

  if (thinkingLevel) {
    generationConfig.thinkingConfig = {
      thinkingLevel,
    };
  } else if (typeof thinkingBudget === "number") {
    generationConfig.thinkingConfig = {
      thinkingBudget,
    };
  }

  if (responseMimeType) {
    generationConfig.response_mime_type = responseMimeType;
  }
  if (responseSchema) {
    generationConfig.response_schema = toRestSchema(responseSchema);
  }

  const requestParts = Array.isArray(parts) && parts.length > 0
    ? parts
    : [
      {
        text: prompt,
      },
    ];

  const response = await fetch(
    `${env.geminiBaseUrl}/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: requestParts,
          },
        ],
        generationConfig,
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const classification = classifyGeminiErrorResponse({
      status: response.status,
      payload,
      headers: response.headers,
    });
    throw new GeminiRequestError(
      response.status,
      classification.userMessage,
      classification.category,
      {
        category: classification.category,
        isRetryable: classification.isRetryable,
        retryAfterSeconds: classification.retryAfterSeconds,
        rawStatus: response.status,
        originalMessage: sanitizeText(typeof payload?.error?.message === "string" ? payload.error.message : ""),
      },
    );
  }

  const firstCandidate = Array.isArray((payload as Record<string, unknown>).candidates)
    ? ((payload as { candidates: Array<Record<string, unknown>> }).candidates[0] ?? null)
    : null;
  const finishReason = typeof firstCandidate?.finishReason === "string" ? firstCandidate.finishReason : null;

  if (finishReason === "MAX_TOKENS") {
    throw new GeminiRequestError(502, toGeminiMaxTokensMessage(), "GEMINI_MAX_TOKENS");
  }

  const text = extractGeminiText(payload as Record<string, unknown>);

  if (!text) {
    throw new GeminiRequestError(502, "Gemini tidak mengembalikan teks yang bisa dipakai.");
  }

  const usage = extractGeminiUsage(payload as Record<string, unknown>);

  return { text, usage };
}

export async function generateGeminiTextWithUsage(request: GeminiRequest): Promise<{
  text: string;
  usage: GeminiUsageMetadata;
  latencyMs: number;
}> {
  const startedAt = Date.now();
  let nextRequest = request;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GEMINI_TEXT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateGeminiTextOnce(nextRequest);
      return {
        text: result.text,
        usage: result.usage,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;

      if (!(error instanceof GeminiRequestError)) {
        throw error;
      }

      const isMaxTokens = error.code === "GEMINI_MAX_TOKENS";
      const isRetryableError = error.diagnostics?.isRetryable === true;
      const isLegacyTransient = !error.code && isGeminiTransientError(error.status, error.message);

      if (!isMaxTokens && !isRetryableError && !isLegacyTransient) {
        throw error;
      }

      const isRateLimit =
        error.code === "GEMINI_RATE_LIMITED" ||
        error.code === "GEMINI_TOKEN_LIMITED" ||
        error.diagnostics?.category === "GEMINI_RATE_LIMITED" ||
        error.diagnostics?.category === "GEMINI_TOKEN_LIMITED";

      const isProviderUnavailable =
        error.code === "GEMINI_PROVIDER_UNAVAILABLE" ||
        error.diagnostics?.category === "GEMINI_PROVIDER_UNAVAILABLE" ||
        error.status === 503;

      const retryAfterSeconds = error.diagnostics?.retryAfterSeconds;
      const hasReliableRetryHint = typeof retryAfterSeconds === "number" && retryAfterSeconds > 0;
      const normalizedOriginalMsg = (error.diagnostics?.originalMessage ?? error.message ?? "").toLowerCase();
      const isServerOverload = normalizedOriginalMsg.includes("overloaded") || normalizedOriginalMsg.includes("try again later");

      // Retry policy:
      // 1. If explicit retry hint is provided and within reasonable threshold (<= 30s for rate limit, <= 10s for 503): retry ONCE after waiting.
      // 2. If Gemini server capacity overload on rate limit (429): retry ONCE after transient backoff.
      // 3. If HTTP 503 / GEMINI_PROVIDER_UNAVAILABLE with server overload ("model is overloaded", "try again later"):
      //    Fail fast immediately (maxAttempts = 1) so edge isolate execution time is preserved and
      //    the backend orchestrator / frontend step driver can perform a realistic cooldown (30-60s).
      // 4. If generic server failure (503/500/502/504) without overload: retry ONCE for transient network glitches.
      // 5. If rate limited without reliable retry hint or overload: DO NOT perform fast repeated retries inline! (maxAttempts = 1)
      let maxAttempts = 2;
      if (isProviderUnavailable) {
        if (hasReliableRetryHint && retryAfterSeconds! <= 10) {
          maxAttempts = 2;
        } else if (isServerOverload) {
          maxAttempts = 1;
        } else {
          maxAttempts = 2;
        }
      } else if (isRateLimit) {
        if (hasReliableRetryHint && retryAfterSeconds! <= 30) {
          maxAttempts = 2;
        } else if (isServerOverload) {
          maxAttempts = 2;
        } else {
          maxAttempts = 1;
        }
      } else if (isMaxTokens) {
        maxAttempts = 2;
      }

      if (attempt >= maxAttempts) {
        if (isGeminiCapacityError(error.status, error.message)) {
          throw new GeminiRequestError(
            error.status,
            error.message || toGeminiTransientUserMessage(),
            error.code,
            error.diagnostics,
          );
        }

        throw error;
      }

      if (isMaxTokens) {
        const currentTokens = nextRequest.maxOutputTokens ?? 4096;
        nextRequest = {
          ...nextRequest,
          maxOutputTokens: Math.min(16384, Math.max(8192, currentTokens * 2)),
        };
        await wait(GEMINI_TRANSIENT_RETRY_DELAY_MS * attempt);
      } else {
        const delayMs = calculateBackoffDelay(attempt, error.diagnostics?.retryAfterSeconds);
        await wait(delayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed.");
}

export async function generateGeminiText(request: GeminiRequest): Promise<string> {
  const result = await generateGeminiTextWithUsage(request);
  return result.text;
}

export async function generateGeminiStructuredDataWithUsage<TValue>(
  request: GeminiRequest,
): Promise<{ data: TValue; usage: GeminiUsageMetadata; latencyMs: number }> {
  const startedAt = Date.now();
  let nextRequest = request;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GEMINI_STRUCTURED_MAX_ATTEMPTS; attempt += 1) {
    try {
      const textResult = await generateGeminiTextWithUsage(nextRequest);
      const data = parseGeminiStructuredJsonText<TValue>(textResult.text);

      return {
        data,
        usage: textResult.usage,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;

      if (
        !(error instanceof GeminiRequestError)
        || !shouldRetryStructuredResponseError(error)
        || attempt >= GEMINI_STRUCTURED_MAX_ATTEMPTS
      ) {
        throw error;
      }

      nextRequest = buildStructuredRetryRequest(nextRequest, error);
      await wait(GEMINI_TRANSIENT_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini structured generation failed.");
}

export async function generateGeminiStructuredData<TValue>(request: GeminiRequest): Promise<TValue> {
  const result = await generateGeminiStructuredDataWithUsage<TValue>(request);
  return result.data;
}

export async function testGeminiConnection(apiKey: string, model: string) {
  const startedAt = Date.now();
  await generateGeminiText({
    apiKey,
    model,
    prompt: "Balas dengan kata OK saja.",
    maxOutputTokens: 8192,
    thinkingBudget: 0,
  });

  return {
    ok: true,
    message: "Koneksi Gemini berhasil.",
    latencyMs: Date.now() - startedAt,
  };
}

export function isGeminiCredentialError(error: unknown) {
  if (!(error instanceof GeminiRequestError)) {
    return false;
  }

  return error.status === 400 || error.status === 401 || error.status === 403;
}
