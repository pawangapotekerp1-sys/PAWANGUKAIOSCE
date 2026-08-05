import { useSearchParams } from "react-router";
import { arePreviewToolsEnabled } from "./preview-tools";

export type PreviewRouteState = "ready" | "loading" | "empty" | "error";

const previewRouteStates = ["ready", "loading", "empty", "error"] as const;

function isPreviewRouteState(value: string | null): value is PreviewRouteState {
  if (value === null) {
    return false;
  }

  return previewRouteStates.includes(value as PreviewRouteState);
}

export function usePreviewRouteState(paramName: string): PreviewRouteState {
  if (!arePreviewToolsEnabled()) {
    return "ready";
  }

  const [searchParams] = useSearchParams();
  const value = searchParams.get(paramName);

  if (!isPreviewRouteState(value)) {
    return "ready";
  }

  return value;
}
