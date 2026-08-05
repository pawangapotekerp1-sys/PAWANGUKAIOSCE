import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import FullPageLoader from "../components/ui/full-page-loader";
import { useSession } from "../lib/auth/use-session";
import {
  buildAccessSnapshot,
  canAccessAdmin,
  canAccessQuestionBank,
  canAccessScheduledTryoutOps,
  canAccessStudentApp,
  resolveAuthenticatedHome,
  type AccessSnapshot,
} from "../lib/auth/permissions";
import { bootstrapProfile } from "../lib/api/auth-api";
import { getUserSubscription } from "../lib/api/subscription-api";
import { useWindowFocusRefresh } from "../lib/use-window-focus-refresh";

type GuardState =
  | {
    status: "loading";
  }
  | {
    status: "anonymous";
  }
  | {
    status: "ready";
    access: AccessSnapshot;
  }
  | {
    status: "error";
    message: string;
  };

function GuardErrorState({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <FullPageLoader
      variant="error"
      title={title}
      description={message}
    />
  );
}

function useGuardAccess(): GuardState {
  const { status, user } = useSession();
  const refreshVersion = useWindowFocusRefresh({
    enabled: status === "authenticated" && Boolean(user),
  });
  const [guardState, setGuardState] = useState<GuardState>({
    status: "loading",
  });

  useEffect(() => {
    if (status === "loading") {
      setGuardState({
        status: "loading",
      });
      return;
    }

    if (status === "anonymous" || !user) {
      setGuardState({
        status: "anonymous",
      });
      return;
    }

    let isCancelled = false;
    const currentUser = user;

    async function hydrateAccess() {
      try {
        const [profile, subscription] = await Promise.all([
          bootstrapProfile({
            user: currentUser,
          }),
          getUserSubscription({
            userId: currentUser.id,
          }),
        ]);

        if (isCancelled) {
          return;
        }

        setGuardState({
          status: "ready",
          access: buildAccessSnapshot(profile, subscription),
        });
      } catch (error) {
        if (!isCancelled) {
          setGuardState({
            status: "error",
            message:
              error instanceof Error && error.message
                ? error.message
                : "Akses akun belum bisa diverifikasi sekarang. Muat ulang halaman atau coba lagi beberapa saat.",
          });
        }
      }
    }

    void hydrateAccess();

    return () => {
      isCancelled = true;
    };
  }, [refreshVersion, status, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- user object reference changes on every token refresh; user.id is stable

  return guardState;
}

export function AppRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses akun belum bisa diverifikasi"
      />
    );
  }

  if (guardState.access.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  if (canAccessStudentApp(guardState.access)) {
    return <Outlet />;
  }

  return <Navigate replace to="/subscription" />;
}

export function AuthenticatedRouteGuard() {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (status === "anonymous") {
    return <Navigate replace to="/auth/login" />;
  }

  return <Outlet />;
}

export function AdminRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses admin belum bisa diverifikasi"
      />
    );
  }

  if (canAccessAdmin(guardState.access.role)) {
    return <Outlet />;
  }

  return (
    <Navigate
      replace
      to={resolveAuthenticatedHome(guardState.access)}
    />
  );
}

export function QuestionAuthoringRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses bank soal belum bisa diverifikasi"
      />
    );
  }

  if (guardState.access.role === "admin") {
    return <Navigate replace to="/admin/questions" />;
  }

  if (
    canAccessQuestionBank(guardState.access.role)
    && canAccessStudentApp(guardState.access)
  ) {
    return <Outlet />;
  }

  return <Navigate replace to={resolveAuthenticatedHome(guardState.access)} />;
}

export function QuestionGeneratorRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses question generator belum bisa diverifikasi"
      />
    );
  }

  if (guardState.access.role === "admin") {
    return <Navigate replace to="/admin/question-generator" />;
  }

  if (
    canAccessQuestionBank(guardState.access.role)
    && canAccessStudentApp(guardState.access)
  ) {
    return <Outlet />;
  }

  return <Navigate replace to={resolveAuthenticatedHome(guardState.access)} />;
}

export function FlashCardGeneratorRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses flash card creator belum bisa diverifikasi"
      />
    );
  }

  if (guardState.access.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  if (guardState.access.role === "mentor" && canAccessStudentApp(guardState.access)) {
    return <Outlet />;
  }

  return <Navigate replace to={resolveAuthenticatedHome(guardState.access)} />;
}

export function ScheduledTryoutOpsRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses scheduled ops belum bisa diverifikasi"
      />
    );
  }

  if (canAccessScheduledTryoutOps(guardState.access.role)) {
    return <Outlet context={{ role: guardState.access.role }} />;
  }

  return <Navigate replace to={resolveAuthenticatedHome(guardState.access)} />;
}

export function MentorAreaRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses Area Mentor belum bisa diverifikasi"
      />
    );
  }

  if (guardState.access.role === "mentor" || guardState.access.role === "admin") {
    return <Outlet />;
  }

  return <Navigate replace to={resolveAuthenticatedHome(guardState.access)} />;
}
