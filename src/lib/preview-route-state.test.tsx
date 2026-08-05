import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";

async function loadPreviewRouteStateModule() {
  vi.resetModules();
  return import("./preview-route-state");
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("preview-route-state", () => {
  test("falls back to ready in production mode even when preview params are present", async () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_ENABLE_PREVIEW_TOOLS", "false");

    const previewRouteStateModule = await loadPreviewRouteStateModule();
    const Probe = () => <span>{previewRouteStateModule.usePreviewRouteState("analyticsView")}</span>;

    render(
      <MemoryRouter initialEntries={["/app/analytics?analyticsView=error"]}>
        <Probe />
      </MemoryRouter>,
    );

    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  test("keeps preview params available during test mode", async () => {
    vi.stubEnv("MODE", "test");

    const previewRouteStateModule = await loadPreviewRouteStateModule();
    const Probe = () => <span>{previewRouteStateModule.usePreviewRouteState("analyticsView")}</span>;

    render(
      <MemoryRouter initialEntries={["/app/analytics?analyticsView=error"]}>
        <Probe />
      </MemoryRouter>,
    );

    expect(screen.getByText("error")).toBeInTheDocument();
  });
});
