import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { readEnv } from "../env";
import { createQueryClient } from "../supabase/query-client";
import { SessionProvider, type SessionProviderClient } from "./session-provider";
import { useSession } from "./use-session";

function createMockSession(email = "student@example.com"): Session {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    expires_at: 1_777_700_000,
    token_type: "bearer",
    user: {
      id: "user-1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-05-01T00:00:00.000Z",
      email,
    },
  } as Session;
}

type DeferredSessionResult = {
  data: {
    session: Session | null;
  };
  error: Error | null;
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve,
  };
}

type MockClientOptions = {
  initialSession?: Session | null;
  sessionResult?: DeferredSessionResult;
  deferredSessionResult?: ReturnType<typeof createDeferred<DeferredSessionResult>>;
};

function createMockClient(options: MockClientOptions = {}) {
  const {
    initialSession = null,
    sessionResult = {
      data: {
        session: initialSession,
      },
      error: null,
    },
    deferredSessionResult,
  } = options;
  let currentSession = initialSession;
  let authStateListener:
    | ((event: AuthChangeEvent, session: Session | null) => void)
    | undefined;

  const unsubscribe = vi.fn();

  const client: SessionProviderClient = {
    auth: {
      getSession: vi.fn(async () => {
        if (deferredSessionResult) {
          return deferredSessionResult.promise;
        }

        return sessionResult;
      }),
      onAuthStateChange: vi.fn((callback) => {
        authStateListener = callback;

        return {
          data: {
            subscription: {
              unsubscribe,
            },
          },
        };
      }),
    },
  };

  return {
    client,
    emit(event: AuthChangeEvent, session: Session | null) {
      currentSession = session;
      authStateListener?.(event, session);
    },
    unsubscribe,
  };
}

function SessionProbe() {
  const { status, session, user } = useSession();

  return (
    <section>
      <p data-testid="status">{status}</p>
      <p data-testid="session-state">{session ? "present" : "missing"}</p>
      <p data-testid="user-email">{user?.email ?? "anonymous"}</p>
    </section>
  );
}

afterEach(() => {
  cleanup();
});

describe("SessionProvider", () => {
  test("hydrates an authenticated session from the initial bootstrap result", async () => {
    const mockClient = createMockClient({
      initialSession: createMockSession("bootstrap@example.com"),
    });
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={mockClient.client}>
          <SessionProbe />
        </SessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("session-state")).toHaveTextContent("present");
    expect(screen.getByTestId("user-email")).toHaveTextContent("bootstrap@example.com");
  });

  test("renders children, resolves auth state, and unsubscribes on cleanup", async () => {
    const mockClient = createMockClient();
    const queryClient = createQueryClient();
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={mockClient.client}>
          <SessionProbe />
        </SessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    });
    expect(screen.getByTestId("session-state")).toHaveTextContent("missing");
    expect(screen.getByTestId("user-email")).toHaveTextContent("anonymous");

    act(() => {
      mockClient.emit("SIGNED_IN", createMockSession());
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("session-state")).toHaveTextContent("present");
    expect(screen.getByTestId("user-email")).toHaveTextContent("student@example.com");

    unmount();

    expect(mockClient.unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("keeps a loading state when getSession fails before any auth state is known", async () => {
    const mockClient = createMockClient({
      sessionResult: {
        data: {
          session: null,
        },
        error: new Error("temporary auth bootstrap failure"),
      },
    });
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={mockClient.client}>
          <SessionProbe />
        </SessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockClient.client.auth.getSession).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    expect(screen.getByTestId("session-state")).toHaveTextContent("missing");
    expect(screen.getByTestId("user-email")).toHaveTextContent("anonymous");
  });

  test("does not let a stale bootstrap result overwrite a newer auth event", async () => {
    const deferredSessionResult = createDeferred<DeferredSessionResult>();
    const mockClient = createMockClient({
      deferredSessionResult,
    });
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={mockClient.client}>
          <SessionProbe />
        </SessionProvider>
      </QueryClientProvider>,
    );

    act(() => {
      mockClient.emit("SIGNED_IN", createMockSession("fresh@example.com"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      deferredSessionResult.resolve({
        data: {
          session: null,
        },
        error: null,
      });
      await deferredSessionResult.promise;
    });

    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("session-state")).toHaveTextContent("present");
    expect(screen.getByTestId("user-email")).toHaveTextContent("fresh@example.com");
  });
});

describe("readEnv", () => {
  test("throws a readable error when Supabase environment variables are missing", () => {
    const readMissingEnv = () =>
      readEnv({
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_ANON_KEY: "",
      });

    expect(readMissingEnv).toThrowError(/supabase environment configuration is invalid/i);
    expect(readMissingEnv).toThrowError(/VITE_SUPABASE_URL/i);
    expect(readMissingEnv).toThrowError(/VITE_SUPABASE_ANON_KEY/i);
  });
});
