import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentProfile } from "../../lib/api/profile-api";
import type { UserRole } from "../../lib/auth/permissions";
import { useSession } from "../../lib/auth/use-session";
import { useWindowFocusRefresh } from "../../lib/use-window-focus-refresh";
import {
  createProductNavItems,
  resolveStudentTierLabel,
} from "../../mocks/student-dashboard";

export function useStudentShell(activeHref: string) {
  const { user } = useSession();
  const refreshVersion = useWindowFocusRefresh({
    enabled: Boolean(user?.id),
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
