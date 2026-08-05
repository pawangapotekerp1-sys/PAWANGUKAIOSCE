import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useWindowFocusRefresh } from "./use-window-focus-refresh";

describe("useWindowFocusRefresh", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("dedupes rapid visibility and focus events into one refresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T08:00:00.000Z"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    const { result } = renderHook(() => useWindowFocusRefresh());

    expect(result.current).toBe(0);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(400);
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current).toBe(2);
  });

  test("ignores events while disabled", () => {
    const { result } = renderHook(() => useWindowFocusRefresh({ enabled: false }));

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current).toBe(0);
  });
});
