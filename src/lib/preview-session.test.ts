import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

async function loadPreviewSessionModule() {
  vi.resetModules();
  return import("./preview-session");
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("preview-session", () => {
  test("returns null and ignores writes when preview helpers are disabled for production mode", async () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_ENABLE_PREVIEW_TOOLS", "false");

    const previewSessionModule = await loadPreviewSessionModule();
    window.localStorage.setItem(
      previewSessionModule.PREVIEW_SESSION_STORAGE_KEY,
      JSON.stringify({
        role: "pro",
        subscriptionState: "active",
      }),
    );

    expect(previewSessionModule.getPreviewSession()).toBeNull();

    previewSessionModule.setPreviewSession({
      role: "admin",
      subscriptionState: "active",
    });

    expect(
      window.localStorage.getItem(previewSessionModule.PREVIEW_SESSION_STORAGE_KEY),
    ).toBeNull();
  });

  test("keeps preview session available during test mode for local QA utilities", async () => {
    vi.stubEnv("MODE", "test");

    const previewSessionModule = await loadPreviewSessionModule();

    previewSessionModule.setPreviewSession({
      role: "pro",
      subscriptionState: "active",
    });

    expect(previewSessionModule.getPreviewSession()).toEqual({
      role: "pro",
      subscriptionState: "active",
    });
  });
});
