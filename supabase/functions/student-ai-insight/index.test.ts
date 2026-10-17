import { describe, expect, test } from "vitest";

if (typeof (globalThis as any).Deno === "undefined") {
  (globalThis as any).Deno = {
    serve: () => {},
    env: { get: () => undefined },
  };
}

const { buildInsightLogPayload, resolveModelToUse } = await import("./index.ts");

describe("student-ai-insight model resolution", () => {
  test("resolveModelToUse normalizes gemini-3.7-flash, undefined, null, empty string, and gemini-2.5-flash to gemini-3.8-flash", () => {
    expect(resolveModelToUse("gemini-3.7-flash")).toBe("gemini-3.8-flash");
    expect(resolveModelToUse(undefined)).toBe("gemini-3.8-flash");
    expect(resolveModelToUse(null)).toBe("gemini-3.8-flash");
    expect(resolveModelToUse("")).toBe("gemini-3.8-flash");
    expect(resolveModelToUse("   ")).toBe("gemini-3.8-flash");
    expect(resolveModelToUse("gemini-2.5-flash")).toBe("gemini-3.8-flash");
    expect(resolveModelToUse("gemini-3.8-flash")).toBe("gemini-3.8-flash");
  });
});

describe("student-ai-insight log payload builder", () => {
  test("buildInsightLogPayload sets model to gemini-3.8-flash and records thoughtsTokenCount and usage metadata", () => {
    const payload = buildInsightLogPayload({
      userId: "user-123",
      credentialId: "cred-456",
      model: "gemini-3.7-flash",
      requestKind: "student_insight",
      status: "success",
      usage: {
        isAvailable: true,
        promptTokenCount: 150,
        candidatesTokenCount: 50,
        totalTokenCount: 200,
        thoughtsTokenCount: 30,
      },
      latencyMs: 1250,
      metadata: {
        dateFrom: "2026-01-01",
        dateTo: "2026-02-01",
      },
    });

    expect(payload).toEqual({
      user_id: "user-123",
      credential_id: "cred-456",
      model: "gemini-3.8-flash",
      request_kind: "student_insight",
      status: "success",
      error_message: null,
      metadata: {
        dateFrom: "2026-01-01",
        dateTo: "2026-02-01",
        promptTokenCount: 150,
        candidatesTokenCount: 50,
        totalTokenCount: 200,
        thoughtsTokenCount: 30,
        latencyMs: 1250,
      },
    });
  });

  test("buildInsightLogPayload handles omitted optional fields and records error message", () => {
    const payload = buildInsightLogPayload({
      userId: "user-abc",
      credentialId: null,
      requestKind: "student_test",
      status: "error",
      errorMessage: "API key invalid",
      latencyMs: 340,
    });

    expect(payload).toEqual({
      user_id: "user-abc",
      credential_id: null,
      model: "gemini-3.8-flash",
      request_kind: "student_test",
      status: "error",
      error_message: "API key invalid",
      metadata: {
        promptTokenCount: null,
        candidatesTokenCount: null,
        totalTokenCount: null,
        thoughtsTokenCount: null,
        latencyMs: 340,
      },
    });
  });
});
