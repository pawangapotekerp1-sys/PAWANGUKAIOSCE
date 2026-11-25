import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInRouterContext, useLocation } from "react-router";
import { getCurrentProfile } from "../../lib/api/profile-api";
import type { UserRole } from "../../lib/auth/permissions";
import { useSession } from "../../lib/auth/use-session";
import { useWindowFocusRefresh } from "../../lib/use-window-focus-refresh";
import {
  createProductNavItems,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";

const ACTIVE_EXAM_SESSION_PATHS = new Set([
  "/app/scheduled-tryout/session",
  "/app/tryout/session",
]);

function useCurrentPathnameFallback(activeHref: string) {
  const inRouter = useInRouterContext();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const location = inRouter ? useLocation() : null;
  return location?.pathname ?? activeHref;
}

export function useStudentShell(activeHref: string) {
  const { user } = useSession();
  const currentPathname = useCurrentPathnameFallback(activeHref);
  const isActiveExamRoute = ACTIVE_EXAM_SESSION_PATHS.has(currentPathname);
  const refreshVersion = useWindowFocusRefresh({
    enabled: Boolean(user?.id) && !isActiveExamRoute,
  });
  const [lastKnownRole, setLastKnownRole] = useState<UserRole | null>(null);
  const profileQuery = useQuery({
    queryKey: ["current-profile", user?.id, refreshVersion],
    enabled: Boolean(user?.id),
    placeholderData: (previousProfile) => previousProfile,
    queryFn: () => getCurrentProfile(),
  });

  useEffect(() => {
    if (profileQuery.data?.role) {
      setLastKnownRole(profileQuery.data.role);
    }
  }, [profileQuery.data?.role]);

  const role = profileQuery.data?.role ?? lastKnownRole;

  return {
    navItems: createProductNavItems(activeHref, role),
    tierLabel: resolveStudentTierLabel(role),
    role,
  };
}
