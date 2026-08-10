export type UserRole = "pendaftar_baru" | "pro" | "mentor" | "admin" | "osce_pro";
export type SubscriptionState = "pending_review" | "active" | "rejected" | "expired";

export type AppProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl?: string | null;
  leaderboardAlias?: string | null;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type UserSubscription = {
  id: string;
  userId: string;
  packageCode: string;
  state: SubscriptionState;
  startsAt: string | null;
  endsAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AccessSnapshot = {
  role: UserRole;
  subscriptionState: SubscriptionState;
};

export function isUserRole(value: unknown): value is UserRole {
  return value === "pendaftar_baru" || value === "pro" || value === "mentor" || value === "admin" || value === "osce_pro";
}

export function isSubscriptionState(value: unknown): value is SubscriptionState {
  return (
    value === "pending_review"
    || value === "active"
    || value === "rejected"
    || value === "expired"
  );
}

export function deriveSubscriptionState(
  subscription: Pick<UserSubscription, "state" | "endsAt"> | null | undefined,
  now = new Date(),
): SubscriptionState {
  if (!subscription) {
    return "expired";
  }

  if (subscription.state === "active" && subscription.endsAt) {
    const endsAt = new Date(subscription.endsAt);

    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime()) {
      return "expired";
    }
  }

  return subscription.state;
}

export function hasActiveSubscription(
  subscriptionState: SubscriptionState | null | undefined,
): boolean {
  return subscriptionState === "active";
}

export function canAccessStudentApp(access: AccessSnapshot): boolean {
  if (access.role === "admin") {
    return true;
  }

  if (access.role === "mentor") {
    return true;
  }

  // Role is the source of truth for student access entitlement.
  // Subscription state is still used elsewhere for renewal and payment messaging.
  return access.role === "pro" || access.role === "osce_pro";
}

export function canAccessAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function canAccessQuestionBank(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "mentor";
}

export function canAccessScheduledTryoutOps(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "mentor";
}

export function resolveAuthenticatedHome(access: AccessSnapshot): "/admin" | "/app" | "/subscription" {
  if (access.role === "admin") {
    return "/admin";
  }

  return canAccessStudentApp(access) ? "/app" : "/subscription";
}

export function buildAccessSnapshot(
  profile: AppProfile,
  subscription: UserSubscription | null | undefined,
): AccessSnapshot {
  return {
    role: profile.role,
    subscriptionState: deriveSubscriptionState(subscription),
  };
}
