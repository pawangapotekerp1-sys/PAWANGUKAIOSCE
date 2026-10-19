import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyGeminiErrorResponse,
  extractRetryAfterSeconds,
  generateGeminiTextWithUsage,
  GeminiRequestError,
} from "../../supabase/functions/_shared/gemini-client.ts";
import { cleanTranscript } from "../../supabase/functions/flash-card-generator/pipeline/cleaner.ts";

function stubEdgeEnv() {
  vi.stubGlobal("Deno", {
    env: {
      get(name: string) {
        const values: Record<string, string> = {
          SUPABASE_URL: "http://127.0.0.1:54321",
          SUPABASE_SERVICE_ROLE_KEY: "service-role",
          SUPABASE_ANON_KEY: "anon-key",
        };

        return values[name];
      },
    },
  });
}

describe("Regression 429 Handling - Comprehensive Suite", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEdgeEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Scenario 1: HTTP 429 with rate limit code (RPM)
  it("Scenario 1: identifies HTTP 429 rate limit (RPM) and marks as retryable", () => {
    const errorResult = classifyGeminiErrorResponse({
      status: 429,
      payload: {
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded for project.",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "RATE_LIMIT_EXCEEDED",
              metadata: {
                quota_limit: "GenerateContentRequestsPerMinutePerProject",
              },
            },
          ],
        },
      },
    });

    expect(errorResult.category).toBe("GEMINI_RATE_LIMITED");
    expect(errorResult.isRetryable).toBe(true);
    expect(errorResult.userMessage).toContain("RPM terlampaui");
  });

  // Scenario 2: HTTP 429 with daily quota exhausted (RPD / TPD)
  it("Scenario 2: identifies daily quota exhausted and fails fast without retry", () => {
    const errorResult = classifyGeminiErrorResponse({
      status: 429,
      payload: {
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Quota exceeded for quota metric 'GenerateContentRequestsPerDayPerProject' and limit 'GenerateContentRequestsPerDayPerProject'.",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "QUOTA_EXCEEDED",
              metadata: {
                quota_limit: "GenerateContentRequestsPerDayPerProject",
              },
            },
          ],
        },
      },
    });

    expect(errorResult.category).toBe("GEMINI_QUOTA_EXHAUSTED");
    expect(errorResult.isRetryable).toBe(false);
    expect(errorResult.userMessage).toContain("Batas kuota harian Gemini");
  });

  // Scenario 3: HTTP 429 with token per minute (TPM) limit
  it("Scenario 3: identifies token limit per minute (TPM) and marks as retryable", () => {
    const errorResult = classifyGeminiErrorResponse({
      status: 429,
      payload: {
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Resource exhausted: Tokens per minute limit reached.",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "RATE_LIMIT_EXCEEDED",
              metadata: {
                quota_limit: "GenerateContentTokensPerMinutePerProject",
              },
            },
          ],
        },
      },
    });

    expect(errorResult.category).toBe("GEMINI_TOKEN_LIMITED");
    expect(errorResult.isRetryable).toBe(true);
    expect(errorResult.userMessage).toContain("TPM");
  });

  // Scenario 4: HTTP 503 temporary service overload
  it("Scenario 4: identifies HTTP 503 temporary service outage as retryable", () => {
    const errorResult = classifyGeminiErrorResponse({
      status: 503,
      payload: {
        error: {
          code: 503,
          status: "UNAVAILABLE",
          message: "The model is overloaded. Please try again later.",
        },
      },
    });

    expect(errorResult.category).toBe("GEMINI_PROVIDER_UNAVAILABLE");
    expect(errorResult.isRetryable).toBe(true);
    expect(errorResult.userMessage).toContain("gangguan sementara dari sisi Google");
  });

  // Scenario 5: HTTP 400 or configuration error (must NOT be retried)
  it("Scenario 5: fails fast on HTTP 400 without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: "API key not valid. Please pass a valid API key.",
          details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "API_KEY_INVALID" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "invalid-key",
        model: "gemini-3.8-flash",
        prompt: "Test prompt",
      }),
    ).rejects.toThrow(/API key Gemini tidak valid/i);

    // Must be called exactly 1 time (fail fast!)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Scenario 6: Valid Retry-After header and RetryInfo body
  it("Scenario 6: parses valid Retry-After from headers and Google RetryInfo details", () => {
    const headerSec = extractRetryAfterSeconds({ "retry-after": "12" });
    expect(headerSec).toBe(12);

    const detailSec = extractRetryAfterSeconds(undefined, {
      error: {
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.RetryInfo",
            retryDelay: "18.5s",
          },
        ],
      },
    });
    expect(detailSec).toBe(19);
  });

  // Scenario 7: Retry-After not available defaults to null
  it("Scenario 7: returns null when Retry-After is absent", () => {
    expect(extractRetryAfterSeconds(undefined, {})).toBeNull();
    expect(extractRetryAfterSeconds({ "content-type": "application/json" }, {})).toBeNull();
  });

  // Scenario 8: Fail-fast without retry hint and capped retry with hint
  it("Scenario 8: fails fast on rate limit without retry hint, and retries once if hint <= 30s is provided", async () => {
    // Part A: Without retry hint -> fails fast immediately (1 attempt) to prevent quota burn
    const fetchMockNoHint = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded.",
          details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "RATE_LIMIT_EXCEEDED" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMockNoHint);

    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toThrow(/RPM terlampaui|Permintaan ke Gemini sedang penuh/i);

    // Fails fast on attempt 1 without fast repeated retries
    expect(fetchMockNoHint).toHaveBeenCalledTimes(1);

    // Part B: With retry hint <= 30s -> retries at most once (2 attempts total)
    const fetchMockWithHint = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded.",
          details: [
            { "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "RATE_LIMIT_EXCEEDED" },
            { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "0.1s" },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMockWithHint);

    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toThrow(/RPM terlampaui|Permintaan ke Gemini sedang penuh/i);

    // Retried once with hint, capped at 2 attempts
    expect(fetchMockWithHint).toHaveBeenCalledTimes(2);
  });

  // Scenario 9: No duplicate nested retries between helper and pipeline
  it("Scenario 9: does not perform duplicate nested retries on provider error in cleaner", async () => {
    let callCount = 0;
    const mockGeminiClient = vi.fn().mockImplementation(() => {
      callCount += 1;
      const err = new GeminiRequestError(
        429,
        "Permintaan ke Gemini sedang penuh (Batas RPM terlampaui). Coba generate ulang dalam beberapa saat.",
        "GEMINI_RATE_LIMITED",
        {
          isRetryable: true,
          category: "GEMINI_RATE_LIMITED",
        },
      );
      return Promise.reject(err);
    });

    await expect(() =>
      cleanTranscript("Baris 1\nBaris 2", {
        geminiClient: mockGeminiClient as any,
        chunkSize: 50,
      }),
    ).rejects.toThrow(/RPM terlampaui/i);

    // Cleaner itself does not retry 429, so it calls client exactly once for the slice
    expect(callCount).toBe(1);
  });

  // Scenario 10: Preserves and does not repeat already successful chunks
  it("Scenario 10: does not repeat already classified chunks when resuming with cached segments", async () => {
    const transcript = "Segmen 1 dosis 10 mg\nSegmen 2 dosis 20 mg\nSegmen 3 dosis 30 mg\nSegmen 4 dosis 40 mg";
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          { segmentId: "seg-003", classification: "relevant", reason: "Materi obat 3" },
          { segmentId: "seg-004", classification: "relevant", reason: "Materi obat 4" },
        ],
      }),
      usage: { isAvailable: true, totalTokenCount: 50 },
    });

    // Provide cached segments for seg-001 and seg-002 (chunk 1 already completed)
    const cachedSegments = [
      {
        segmentId: "seg-001",
        rawText: "Segmen 1 dosis 10 mg",
        normalizedText: "Segmen 1 dosis 10 mg",
        lineOffset: 1,
        hasClinicalEntities: true,
        classification: "relevant" as const,
        reason: "Cached from previous run",
      },
      {
        segmentId: "seg-002",
        rawText: "Segmen 2 dosis 20 mg",
        normalizedText: "Segmen 2 dosis 20 mg",
        lineOffset: 2,
        hasClinicalEntities: true,
        classification: "relevant" as const,
        reason: "Cached from previous run",
      },
    ];

    const result = await cleanTranscript(transcript, {
      chunkSize: 2,
      cachedSegments,
      geminiClient: mockGemini as any,
    });

    // Since chunk 1 was completely cached, mockGemini was only called for chunk 2 (seg-003 and seg-004)
    expect(mockGemini).toHaveBeenCalledTimes(1);
    expect(result.retainedSegments).toHaveLength(4);
    expect(result.retainedSegments[0].segmentId).toBe("seg-001");
    expect(result.retainedSegments[2].segmentId).toBe("seg-003");
  });

  // Scenario 11: Daily quota failure marks material as non-retryable terminal error with clear message
  it("Scenario 11: daily quota failure provides non-transient user guidance without false promises", () => {
    const errorResult = classifyGeminiErrorResponse({
      status: 429,
      payload: {
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Free tier daily limit exceeded.",
        },
      },
    });

    expect(errorResult.isRetryable).toBe(false);
    expect(errorResult.userMessage).toContain("Daily Quota");
    expect(errorResult.userMessage).not.toContain("beberapa saat");
  });

  // Scenario 12: Zero sensitive credentials or prompt payloads in error diagnostics
  it("Scenario 12: does not leak API keys, authorization headers, or prompt texts in diagnostics", () => {
    const apiKey = "AIzaSySecretApiKey1234567890";
    const errorResult = classifyGeminiErrorResponse({
      status: 400,
      payload: {
        error: {
          message: `API key ${apiKey} has expired. Details at https://console.cloud.google.com/apis/credentials`,
        },
      },
    });

    const serialized = JSON.stringify(errorResult);
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain("AIzaSy");
    expect(errorResult.userMessage).not.toContain(apiKey);
  });
});
