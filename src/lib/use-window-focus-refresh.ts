import { useEffect, useRef, useState } from "react";

type UseWindowFocusRefreshOptions = {
  enabled?: boolean;
  dedupeMs?: number;
};

export function useWindowFocusRefresh(
  { enabled = true, dedupeMs = 300 }: UseWindowFocusRefreshOptions = {},
) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const lastRefreshAtRef = useRef<number>(-Infinity);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function bumpRefreshVersion() {
      const now = Date.now();

      if (now - lastRefreshAtRef.current < dedupeMs) {
        return;
      }

      lastRefreshAtRef.current = now;
      setRefreshVersion((current) => current + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        bumpRefreshVersion();
      }
    }

    window.addEventListener("focus", bumpRefreshVersion);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", bumpRefreshVersion);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dedupeMs, enabled]);

  return refreshVersion;
}
