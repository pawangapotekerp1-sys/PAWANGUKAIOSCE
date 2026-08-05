import { useContext } from "react";
import { SessionContext } from "./session-provider";

export function useSession() {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("useSession must be used within a SessionProvider.");
  }

  return session;
}
