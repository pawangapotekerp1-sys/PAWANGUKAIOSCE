import {
  isSubscriptionState,
  isUserRole,
  type SubscriptionState,
  type UserRole,
} from "./auth/permissions";
import { arePreviewToolsEnabled } from "./preview-tools";

export type PreviewRole = UserRole;
export type { SubscriptionState };

export type PreviewSession = {
  role: PreviewRole;
  subscriptionState: SubscriptionState;
};

export const PREVIEW_SESSION_STORAGE_KEY = "preview-session";

let previewSessionSnapshot: PreviewSession | null = null;

function isPreviewRole(value: unknown): value is PreviewRole {
  return isUserRole(value);
}

function isPreviewSession(value: unknown): value is PreviewSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Record<string, unknown>;

  return isPreviewRole(session.role) && isSubscriptionState(session.subscriptionState);
}

export function getPreviewSession(): PreviewSession | null {
  if (!arePreviewToolsEnabled()) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PREVIEW_SESSION_STORAGE_KEY);
    }

    return null;
  }

  if (typeof window === "undefined") {
    return previewSessionSnapshot;
  }

  const rawSession = window.localStorage.getItem(PREVIEW_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession);

    if (!isPreviewSession(parsedSession)) {
      return null;
    }

    return parsedSession;
  } catch {
    return null;
  }
}

export function setPreviewSession(session: PreviewSession | null) {
  if (!arePreviewToolsEnabled()) {
    previewSessionSnapshot = null;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PREVIEW_SESSION_STORAGE_KEY);
    }

    return;
  }

  previewSessionSnapshot = session;

  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(PREVIEW_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(PREVIEW_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearPreviewSession() {
  previewSessionSnapshot = null;

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PREVIEW_SESSION_STORAGE_KEY);
  }

  if (!arePreviewToolsEnabled()) {
    return;
  }

  setPreviewSession(null);
}
