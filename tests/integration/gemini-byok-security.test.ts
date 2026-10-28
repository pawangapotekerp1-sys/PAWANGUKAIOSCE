import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";

describe("BYOK security and last_error sanitization", () => {
  const sampleApiKey = "AIzaSyDummyKeyForSecurityTesting987654";

  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("sanitizeText strips AIza API keys completely without corrupting placeholder", async () => {
    const { sanitizeText } = await import("../../supabase/functions/_shared/gemini-client.ts");
    const raw = `Failed to connect with key ${sampleApiKey}`;
    const sanitized = sanitizeText(raw);
    expect(sanitized).not.toContain(sampleApiKey);
    expect(sanitized).toContain("[REDACTED_API_KEY]");
    expect(sanitized).not.toContain("[REDACTED_API_[REDACTED]");
  });

  test("sanitizeText strips URL query parameters containing keys", async () => {
    const { sanitizeText } = await import("../../supabase/functions/_shared/gemini-client.ts");
    const rawUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${sampleApiKey}&alt=json`;
    const sanitized = sanitizeText(rawUrl);
    expect(sanitized).not.toContain(sampleApiKey);
    expect(sanitized).toContain("[REDACTED");
  });

  test("sanitizeText strips token, bearer, and x-goog-api-key header patterns", async () => {
    const { sanitizeText } = await import("../../supabase/functions/_shared/gemini-client.ts");
    const raw = `Authorization failure for token=secret_token_123456, bearer=secret_bearer_token, and x-goog-api-key: custom_secret_key_999`;
    const sanitized = sanitizeText(raw);
    expect(sanitized).not.toContain("secret_token_123456");
    expect(sanitized).not.toContain("secret_bearer_token");
    expect(sanitized).not.toContain("custom_secret_key_999");
  });

  test("classifyGeminiErrorResponse never exposes API key in userMessage", async () => {
    const { classifyGeminiErrorResponse } = await import("../../supabase/functions/_shared/gemini-client.ts");
    const classification = classifyGeminiErrorResponse({
      status: 400,
      payload: {
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: `API key ${sampleApiKey} not valid. Please pass a valid key.`,
        },
      },
    });

    expect(classification.userMessage).not.toContain(sampleApiKey);
    expect(classification.category).toBe("GEMINI_AUTHENTICATION_FAILED");
  });

  test("classifyGeminiErrorResponse sanitizes raw message in 503 provider unavailable details", async () => {
    const { classifyGeminiErrorResponse } = await import("../../supabase/functions/_shared/gemini-client.ts");
    const classification = classifyGeminiErrorResponse({
      status: 503,
      payload: {
        error: {
          code: 503,
          status: "UNAVAILABLE",
          message: `The model is overloaded for key ${sampleApiKey}. Please try again later.`,
        },
      },
    });

    expect(classification.userMessage).not.toContain(sampleApiKey);
    expect(classification.userMessage).toContain("[REDACTED_API_KEY]");
    expect(classification.category).toBe("GEMINI_PROVIDER_UNAVAILABLE");
  });
});
