import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

describe("gemini-client", () => {
  beforeEach(() => {
    vi.resetModules();
    stubEdgeEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("connection test validates the key via models.get metadata lookup instead of a slow generateContent call", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        name: "models/gemini-3.8-flash",
        displayName: "Gemini 3.8 Flash",
        supportedGenerationMethods: ["generateContent"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { testGeminiConnection } = await import("./gemini-client.ts");
    const result = await testGeminiConnection("api-key", "gemini-3.8-flash");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash");
    expect(url).not.toContain(":generateContent");
    expect(url).not.toContain("?key=");
    expect(requestInit.method).toBe("GET");
    expect(requestInit.body).toBeUndefined();
    expect((requestInit.headers as Record<string, string>)["x-goog-api-key"]).toBe("api-key");
    expect(requestInit.signal).toBeDefined();
  });

  test("connection test rejects an invalid API key (400 API_KEY_INVALID) immediately as a credential error without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: "API key not valid. Please pass a valid API key.",
          details: [{ reason: "API_KEY_INVALID" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { testGeminiConnection, isGeminiCredentialError } = await import("./gemini-client.ts");
    const error = await testGeminiConnection("bad-key", "gemini-3.8-flash").catch((err) => err);

    expect(error).toMatchObject({ status: 400, code: "GEMINI_AUTHENTICATION_FAILED" });
    expect(isGeminiCredentialError(error)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("connection test maps a missing model (404) to GEMINI_MODEL_UNAVAILABLE without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({
        error: { code: 404, status: "NOT_FOUND", message: "models/gemini-9-flash is not found" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { testGeminiConnection } = await import("./gemini-client.ts");
    await expect(testGeminiConnection("api-key", "gemini-9-flash")).rejects.toMatchObject({
      status: 404,
      code: "GEMINI_MODEL_UNAVAILABLE",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("connection test surfaces a 504 timeout after bounded retries when the metadata lookup keeps aborting", async () => {
    const timeoutErr = new Error("The operation was aborted due to timeout");
    timeoutErr.name = "TimeoutError";
    const fetchMock = vi.fn().mockRejectedValue(timeoutErr);
    vi.stubGlobal("fetch", fetchMock);

    const { testGeminiConnection } = await import("./gemini-client.ts");
    await expect(testGeminiConnection("api-key", "gemini-3.8-flash")).rejects.toMatchObject({
      status: 504,
      code: "GEMINI_PROVIDER_UNAVAILABLE",
      message: expect.stringMatching(/Waktu tunggu respons Gemini habis \(timeout\)/i),
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("uses official REST response_mime_type and response_schema fields for structured output requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"items\":[]}" }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");
    const responseSchema = {
      type: "object",
      properties: {
        items: {
          type: "array",
        },
      },
    };

    await generateGeminiText({
      apiKey: "api-key",
      model: "gemini-3.7-flash",
      prompt: "Buat JSON kosong.",
      responseMimeType: "application/json",
      responseSchema,
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));

    expect(body.generationConfig.response_mime_type).toBe("application/json");
    expect(body.generationConfig.response_schema).toEqual({
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
        },
      },
    });
    expect(body.generationConfig.responseMimeType).toBeUndefined();
    expect(body.generationConfig.responseSchema).toBeUndefined();
    expect(body.generationConfig.responseFormat).toBeUndefined();
  });

  test("passes multimodal inlineData parts through the Gemini request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"ok\":true}" }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");
    await generateGeminiText({
      apiKey: "api-key",
      model: "gemini-3.7-flash",
      prompt: "Analisis lampiran PDF ini.",
      parts: [
        {
          text: "Analisis lampiran PDF ini.",
        },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: "JVBERi0xLjQK",
          },
        },
      ],
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
      },
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));

    expect(body.contents[0].parts).toEqual([
      {
        text: "Analisis lampiran PDF ini.",
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
        },
      },
    ]);
  });

  test("repairs structured JSON text when the model omits a comma between properties", async () => {
    const { parseGeminiStructuredJsonText } = await import("./gemini-client.ts");

    expect(parseGeminiStructuredJsonText<{
      items: Array<{
        stem: string;
        correctOptionKey: string;
      }>;
    }>(`{
      "items": [
        {
          "stem": "Soal 1"
          "correctOptionKey": "A"
        }
      ]
    }`)).toEqual({
      items: [
        {
          stem: "Soal 1",
          correctOptionKey: "A",
        },
      ],
    });
  });

  test("extracts JSON content from fenced code blocks before parsing", async () => {
    const { parseGeminiStructuredJsonText } = await import("./gemini-client.ts");

    expect(parseGeminiStructuredJsonText<{ ok: boolean }>([
      "```json",
      "{\"ok\":true}",
      "```",
    ].join("\n"))).toEqual({
      ok: true,
    });
  });

  test("retries transient Gemini capacity errors before returning text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: "RESOURCE_EXHAUSTED: The model is overloaded. Please try again later.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "{\"ok\":true}" }],
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");
    const result = await generateGeminiText({
      apiKey: "api-key",
      model: "gemini-3.7-flash",
      prompt: "Balas dengan JSON valid.",
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
      },
    });

    expect(result).toBe("{\"ok\":true}");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("keeps the original Gemini error when a generic server failure persists", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: {
          message: "The service is temporarily unavailable.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");

    await expect(() =>
      generateGeminiText({
        apiKey: "api-key",
        model: "gemini-3.7-flash",
        prompt: "Balas dengan JSON valid.",
      })
    ).rejects.toThrow(/temporarily unavailable/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("uses the Gemini penuh message only when capacity errors persist", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          message: "RESOURCE_EXHAUSTED: The model is overloaded. Please try again later.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");

    await expect(() =>
      generateGeminiText({
        apiKey: "api-key",
        model: "gemini-3.7-flash",
        prompt: "Balas dengan JSON valid.",
      })
    ).rejects.toThrow(/gemini sedang penuh sementara/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries malformed structured json once before surfacing a validation error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "[{\"stem\":\"Soal 1\"" }],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "[{\"stem\":\"Soal 1\",\"correctOptionKey\":\"A\"}]" }],
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiStructuredData } = await import("./gemini-client.ts");
    const result = await generateGeminiStructuredData<Array<{ stem: string; correctOptionKey: string }>>({
      apiKey: "api-key",
      model: "gemini-3.7-flash",
      prompt: "Balas dengan array JSON valid.",
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
      },
    });

    expect(result).toEqual([
      {
        stem: "Soal 1",
        correctOptionKey: "A",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries truncated structured json with a larger output budget", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: {
                parts: [{ text: "[{\"stem\":\"Soal 1\"" }],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: "[{\"stem\":\"Soal 1\",\"correctOptionKey\":\"A\"}]" }],
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiStructuredData } = await import("./gemini-client.ts");
    const result = await generateGeminiStructuredData<Array<{ stem: string; correctOptionKey: string }>>({
      apiKey: "api-key",
      model: "gemini-3.7-flash",
      prompt: "Balas dengan array JSON valid.",
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
      },
    });

    const [, retryInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryBody = JSON.parse(String(retryInit.body));

    expect(result).toEqual([
      {
        stem: "Soal 1",
        correctOptionKey: "A",
      },
    ]);
    expect(retryBody.generationConfig.maxOutputTokens).toBeGreaterThan(1024);
  });

  test("surfaces a specific error when Gemini keeps truncating output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: "MAX_TOKENS",
            content: {
              parts: [{ text: "[{\"stem\":\"Soal 1\"" }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiStructuredData } = await import("./gemini-client.ts");

    await expect(() =>
      generateGeminiStructuredData({
        apiKey: "api-key",
        model: "gemini-3.7-flash",
        prompt: "Balas dengan array JSON valid.",
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
        },
      })
    ).rejects.toThrow(/terpotong karena batas token/i);
  });

  test("does not retry structured generation when Gemini rejects the credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          message: "API key not valid. Please pass a valid API key.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiStructuredData } = await import("./gemini-client.ts");

    await expect(() =>
      generateGeminiStructuredData({
        apiKey: "bad-api-key",
        model: "gemini-3.7-flash",
        prompt: "Balas dengan array JSON valid.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
        },
      })
    ).rejects.toThrow(/api key not valid/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("extracts thoughtsTokenCount and usage metadata from Gemini response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "{\"result\":\"ok\"}" }] } }],
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 50,
          totalTokenCount: 200,
          candidatesTokensDetails: [{ modality: "TEXT", tokenCount: 30 }, { modality: "THINKING", tokenCount: 20 }],
          thoughtsTokenCount: 20,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    const result = await generateGeminiTextWithUsage({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      prompt: "Hello",
      thinkingLevel: "low",
    });

    expect(result.text).toBe("{\"result\":\"ok\"}");
    expect(result.usage).toEqual({
      isAvailable: true,
      promptTokenCount: 150,
      candidatesTokenCount: 50,
      totalTokenCount: 200,
      thoughtsTokenCount: 20,
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  test("extracts thoughtsTokenCount from candidatesTokensDetails fallback when thoughtsTokenCount not at root", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "response text" }] } }],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 40,
          totalTokenCount: 140,
          candidatesTokensDetails: [{ modality: "TEXT", tokenCount: 25 }, { modality: "THINKING", tokenCount: 15 }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    const result = await generateGeminiTextWithUsage({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      prompt: "Hello",
    });

    expect(result.text).toBe("response text");
    expect(result.usage).toEqual({
      isAvailable: true,
      promptTokenCount: 100,
      candidatesTokenCount: 40,
      totalTokenCount: 140,
      thoughtsTokenCount: 15,
    });
  });

  test("handles absent usageMetadata gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "response text" }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    const result = await generateGeminiTextWithUsage({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      prompt: "Hello",
    });

    expect(result.text).toBe("response text");
    expect(result.usage).toEqual({
      isAvailable: false,
      statusText: "NOT_RETURNED_BY_PROVIDER",
      promptTokenCount: null,
      candidatesTokenCount: null,
      totalTokenCount: null,
      thoughtsTokenCount: null,
    });
  });

  test("normalizes deprecated model IDs gracefully to gemini-3.8-flash", async () => {
    const { normalizeAiModel, DEFAULT_AI_MODEL } = await import("./gemini-client.ts");
    expect(DEFAULT_AI_MODEL).toBe("gemini-3.8-flash");
    expect(normalizeAiModel("gemini-3.7-flash")).toBe("gemini-3.8-flash");
    expect(normalizeAiModel("gemini-2.5-flash")).toBe("gemini-3.8-flash");
    expect(normalizeAiModel("gemini-2.5-pro")).toBe("gemini-3.8-flash");
    expect(normalizeAiModel("gemini-3.8-flash")).toBe("gemini-3.8-flash");
    expect(normalizeAiModel(null)).toBe("gemini-3.8-flash");
    expect(normalizeAiModel(undefined)).toBe("gemini-3.8-flash");
    expect(normalizeAiModel("")).toBe("gemini-3.8-flash");
    expect(normalizeAiModel("  gemini-3.7-flash  ")).toBe("gemini-3.8-flash");
  });

  test("generateGeminiStructuredDataWithUsage returns parsed data, usage, and latency", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "{\"items\":[1,2,3]}" }] } }],
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 20,
          totalTokenCount: 70,
          thoughtsTokenCount: 5,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiStructuredDataWithUsage } = await import("./gemini-client.ts");
    const result = await generateGeminiStructuredDataWithUsage<{ items: number[] }>({
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      prompt: "Return items JSON",
      responseMimeType: "application/json",
      responseSchema: { type: "object" },
    });

    expect(result.data).toEqual({ items: [1, 2, 3] });
    expect(result.usage).toEqual({
      isAvailable: true,
      promptTokenCount: 50,
      candidatesTokenCount: 20,
      totalTokenCount: 70,
      thoughtsTokenCount: 5,
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test("retries truncated text output in generateGeminiTextWithUsage with larger maxOutputTokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: {
                parts: [{ text: "Teks terpotong..." }],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: "Teks lengkap setelah retry." }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    const result = await generateGeminiTextWithUsage({
      apiKey: "api-key",
      model: "gemini-3.8-flash",
      prompt: "Klasifikasikan segmen transkrip ini.",
      maxOutputTokens: 2048,
    });

    expect(result.text).toBe("Teks lengkap setelah retry.");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, retryInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryBody = JSON.parse(String(retryInit.body));
    expect(retryBody.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(4096);
  });

  test("uses generous default maxOutputTokens (8192) when thinkingLevel is specified", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Hasil dengan reasoning." }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await generateGeminiTextWithUsage({
      apiKey: "api-key",
      model: "gemini-3.8-flash",
      prompt: "Analisis klinis dengan thinking.",
      thinkingLevel: "low",
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));

    expect(body.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8192);
  });

  test("fails fast on HTTP 429 rate limit without retry hint (calls fetch exactly 1 time) and throws GEMINI_RATE_LIMITED", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded for project. Quota exceeded for 15 RPM.",
          details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "RATE_LIMIT_EXCEEDED" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_RATE_LIMITED",
      status: 429,
    });

    // Fails fast: exactly 1 attempt, preventing repeated futile requests within the 60-second window
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries at most once when HTTP 429 provides a valid Retry-After hint (<= 30s)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "1" }),
      json: async () => ({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded. Please wait 1 second.",
          details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "RATE_LIMIT_EXCEEDED" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_RATE_LIMITED",
    });

    // Retries once after waiting, then halts at 2 attempts
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("fails fast immediately on HTTP 429 daily quota exhaustion without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Quota exceeded for quota metric 'Daily Requests' and limit 'Daily Requests'.",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "QUOTA_EXCEEDED",
              metadata: { quota_limit: "GenerateContentRequestsPerDayPerProject" },
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_QUOTA_EXHAUSTED",
      status: 429,
    });

    // Halts immediately: 1 attempt, zero retries for permanent quota exhaustion
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("fails fast immediately on HTTP 503 without retry hint to delegate cooldown to backend orchestrator", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: {
          code: 503,
          status: "UNAVAILABLE",
          message: "The model is overloaded. Please try again later.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_PROVIDER_UNAVAILABLE",
      status: 503,
    });

    // Fails fast: exactly 1 attempt so the edge function releases worker immediately
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries once when HTTP 503 provides a short Retry-After hint (<= 10s)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ "retry-after": "2" }),
      json: async () => ({
        error: {
          code: 503,
          status: "UNAVAILABLE",
          message: "The model is overloaded. Please try again later.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Generate flashcard",
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_PROVIDER_UNAVAILABLE",
      status: 503,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("classifies HTTP 404 model not found as non-retryable GEMINI_MODEL_UNAVAILABLE with clear Indonesian message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: 404,
          status: "NOT_FOUND",
          message: "models/gemini-unknown is not found for API version v1beta.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-unknown",
        prompt: "Hello",
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_MODEL_UNAVAILABLE",
      status: 404,
      message: expect.stringMatching(/Model Gemini tidak ditemukan/i),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("surfaces clear Indonesian timeout message on AbortError / 504 timeout and fails fast", async () => {
    const timeoutErr = new Error("The operation was aborted due to timeout");
    timeoutErr.name = "TimeoutError";
    const fetchMock = vi.fn().mockRejectedValue(timeoutErr);
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
    await expect(() =>
      generateGeminiTextWithUsage({
        apiKey: "api-key",
        model: "gemini-3.8-flash",
        prompt: "Hello",
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({
      code: "GEMINI_PROVIDER_UNAVAILABLE",
      status: 504,
      message: expect.stringMatching(/Waktu tunggu respons Gemini habis \(timeout\)/i),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("testGeminiConnection retries up to 2 times (3 attempts total) on HTTP 503 high demand before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 503,
            status: "UNAVAILABLE",
            message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 503,
            status: "UNAVAILABLE",
            message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: "models/gemini-3.8-flash",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { testGeminiConnection } = await import("./gemini-client.ts");
    const result = await testGeminiConnection("api-key", "gemini-3.8-flash");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("defaults generationConfig.temperature to 1.0 as recommended for Gemini 3 models", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "OK" }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");
    await generateGeminiText({
      apiKey: "api-key",
      model: "gemini-3.8-flash",
      prompt: "Hello",
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));
    expect(body.generationConfig.temperature).toBe(1);
  });

  test("still honors an explicit temperature override", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "OK" }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateGeminiText } = await import("./gemini-client.ts");
    await generateGeminiText({
      apiKey: "api-key",
      model: "gemini-3.8-flash",
      prompt: "Hello",
      temperature: 0.5,
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));
    expect(body.generationConfig.temperature).toBe(0.5);
  });
});
