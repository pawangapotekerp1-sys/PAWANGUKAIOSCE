import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSupabaseBrowserClient } from "../supabase/browser-client";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export type SessionContextValue = {
  status: SessionStatus;
  session: Session | null;
  user: User | null;
};

export type SessionProviderClient = {
  auth: {
    getSession: () => Promise<{
      data: {
        session: Session | null;
      };
      error: Error | null;
    }>;
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
  };
};

const initialSessionState: SessionContextValue = {
  status: "loading",
  session: null,
  user: null,
};

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function buildSessionState(session: Session | null): SessionContextValue {
  if (!session?.user) {
    return {
      status: "anonymous",
      session: null,
      user: null,
    };
  }

  return {
    status: "authenticated",
    session,
    user: session.user,
  };
}

type SessionProviderProps = PropsWithChildren<{
  client?: SessionProviderClient;
}>;

export function SessionProvider({ children, client }: SessionProviderProps) {
  const clientRef = useRef<SessionProviderClient | null>(null);
  const authEventVersionRef = useRef(0);

  if (!clientRef.current) {
    clientRef.current = client ?? getSupabaseBrowserClient();
  }

  const [sessionState, setSessionState] = useState<SessionContextValue>(initialSessionState);

  useEffect(() => {
    let isMounted = true;
    const sessionClient = clientRef.current!;
    const {
      data: { subscription },
    } = sessionClient.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      authEventVersionRef.current += 1;
      setSessionState(buildSessionState(session));
    });

    async function bootstrapSession() {
      const bootstrapVersion = authEventVersionRef.current;
      const { data, error } = await sessionClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        return;
      }

      if (authEventVersionRef.current !== bootstrapVersion) {
        return;
      }

      setSessionState(buildSessionState(data.session));
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={sessionState}>
      {children}
    </SessionContext.Provider>
  );
}
