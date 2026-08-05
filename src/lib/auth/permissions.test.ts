import { describe, expect, test } from "vitest";
import {
  buildAccessSnapshot,
  canAccessScheduledTryoutOps,
  canAccessStudentApp,
  canAccessQuestionBank,
  hasActiveSubscription,
  resolveAuthenticatedHome,
} from "./permissions";

describe("permissions", () => {
  test("pendaftar_baru users cannot enter premium student routes", () => {
    expect(
      canAccessStudentApp({
        role: "pendaftar_baru",
        subscriptionState: "pending_review",
      }),
    ).toBe(false);
    expect(
      resolveAuthenticatedHome({
        role: "pendaftar_baru",
        subscriptionState: "pending_review",
      }),
    ).toBe("/subscription");
  });

  test("pro users keep access to student routes even when the latest subscription is expired", () => {
    expect(hasActiveSubscription("expired")).toBe(false);
    expect(
      canAccessStudentApp({
        role: "pro",
        subscriptionState: "expired",
      }),
    ).toBe(true);
    expect(
      resolveAuthenticatedHome({
        role: "pro",
        subscriptionState: "expired",
      }),
    ).toBe("/app");
  });

  test("pro users with active subscriptions keep access to student routes", () => {
    expect(hasActiveSubscription("active")).toBe(true);
    expect(
      canAccessStudentApp({
        role: "pro",
        subscriptionState: "active",
      }),
    ).toBe(true);
    expect(
      resolveAuthenticatedHome({
        role: "pro",
        subscriptionState: "active",
      }),
    ).toBe("/app");
  });

  test("pro users without a subscription record keep access as legacy premium users", () => {
    const access = buildAccessSnapshot(
      {
        role: "pro",
        id: "user-1",
        email: "pro@example.com",
        fullName: "Pro Legacy",
      },
      null,
    );

    expect(canAccessStudentApp(access)).toBe(true);
    expect(resolveAuthenticatedHome(access)).toBe("/app");
  });

  test("mentor users with active subscriptions keep access to student routes and question bank", () => {
    expect(hasActiveSubscription("active")).toBe(true);
    expect(
      canAccessStudentApp({
        role: "mentor",
        subscriptionState: "active",
      }),
    ).toBe(true);
    expect(canAccessQuestionBank("mentor")).toBe(true);
    expect(canAccessScheduledTryoutOps("mentor")).toBe(true);
    expect(
      resolveAuthenticatedHome({
        role: "mentor",
        subscriptionState: "active",
      }),
    ).toBe("/app");
  });

  test("mentor users keep access to student routes even without an active subscription", () => {
    expect(
      canAccessStudentApp({
        role: "mentor",
        subscriptionState: "expired",
      }),
    ).toBe(true);
    expect(
      resolveAuthenticatedHome({
        role: "mentor",
        subscriptionState: "expired",
      }),
    ).toBe("/app");
  });

  test("scheduled tryout ops are only available to mentor and admin roles", () => {
    expect(canAccessScheduledTryoutOps("mentor")).toBe(true);
    expect(canAccessScheduledTryoutOps("admin")).toBe(true);
    expect(canAccessScheduledTryoutOps("pro")).toBe(false);
    expect(canAccessScheduledTryoutOps("pendaftar_baru")).toBe(false);
    expect(canAccessScheduledTryoutOps(null)).toBe(false);
  });
});
