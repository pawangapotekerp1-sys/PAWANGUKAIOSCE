import { describe, expect, test } from "vitest";
import { resolvePlatformTestConfig } from "./platform-ai-config";

describe("resolvePlatformTestConfig", () => {
  test("prefers draft model and api key from the current form when admin tests before saving", () => {
    expect(
      resolvePlatformTestConfig(
        {
          model: "gemini-3.7-flash",
          platformSecretId: "vault-secret-1",
        },
        {
          model: "gemini-2.5-pro",
          apiKey: "draft-platform-key",
        },
      ),
    ).toEqual({
      model: "gemini-2.5-pro",
      apiKey: "draft-platform-key",
      shouldPersistLastTestedAt: false,
      secretSource: "payload",
    });
  });

  test("falls back to the saved configuration when no draft override is supplied", () => {
    expect(
      resolvePlatformTestConfig(
        {
          model: "gemini-3.7-flash",
          platformSecretId: "vault-secret-1",
        },
        {},
      ),
    ).toEqual({
      model: "gemini-3.7-flash",
      apiKey: null,
      shouldPersistLastTestedAt: true,
      secretSource: "stored",
    });
  });
});
