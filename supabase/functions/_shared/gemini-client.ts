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
const GEMINI_TEXT_MAX_ATTEMPTS = 2;
const GEMINI_STRUCTURED_MAX_ATTEMPTS = 2;
const GEMINI_STRUCTURED_RETRY_TOKEN_MULTIPLIER = 2;
const GEMINI_STRUCTURED_RETRY_MIN_TOKENS = 8192;

type GeminiRequestErrorCode = "GEMINI_MAX_TOKENS" | "GEMINI_INVALID_JSON";

export class GeminiRequestError extends Error {
  status: number;
  code: GeminiRequestErrorCode | null;

  constructor(status: number, message: string, code: GeminiRequestErrorCode | null = null) {
    super(message);
    this.status = status;
    this.code = code;
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
        "Gemini mengembalikan format JSON yang belum valid. Coba generate ulang atau kurangi jumlah soal per batch.",
        "GEMINI_INVALID_JSON",
      );
    }
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
  return "Permintaan ke Gemini sedang penuh sementara. Coba generate ulang dalam beberapa saat atau kurangi jumlah soal per batch.";
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
  maxOutputTokens = 512,
  thinkingBudget,
  thinkingLevel,
  responseMimeType,
  responseSchema,
}: GeminiRequest): Promise<GeminiOnceResult> {
  const env = readEdgeEnv();
  const resolvedModel = normalizeAiModel(model);
  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens,
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

  if (responseMimeType && responseSchema) {
    generationConfig.response_mime_type = responseMimeType;
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
  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : "Gemini request failed.";
    throw new GeminiRequestError(response.status, message);
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
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GEMINI_TEXT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateGeminiTextOnce(request);
      return {
        text: result.text,
        usage: result.usage,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;

      if (
        !(error instanceof GeminiRequestError)
        || error.code
        || !isGeminiTransientError(error.status, error.message)
      ) {
        throw error;
      }

      if (attempt >= GEMINI_TEXT_MAX_ATTEMPTS) {
        if (isGeminiCapacityError(error.status, error.message)) {
          throw new GeminiRequestError(error.status, toGeminiTransientUserMessage());
        }

        throw error;
      }

      await wait(GEMINI_TRANSIENT_RETRY_DELAY_MS * attempt);
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
