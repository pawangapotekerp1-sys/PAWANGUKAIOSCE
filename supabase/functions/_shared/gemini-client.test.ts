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

  test("disables thinking during connection tests so Gemini still returns visible text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "OK" }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { testGeminiConnection } = await import("./gemini-client.ts");
    await testGeminiConnection("api-key", "gemini-3.6-flash");

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));

    expect(body.generationConfig.thinkingConfig).toEqual({
      thinkingBudget: 0,
    });
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
        model: "gemini-3.6-flash",
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
        model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
        model: "gemini-3.6-flash",
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
        model: "gemini-3.6-flash",
        prompt: "Balas dengan array JSON valid.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
        },
      })
    ).rejects.toThrow(/api key not valid/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
