import { describe, expect, test } from "vitest";
import { shouldRetrySupabaseQuery } from "./query-client";

describe("shouldRetrySupabaseQuery", () => {
  test("does not retry PostgreSQL statement timeout or auth-expired errors", () => {
    expect(
      shouldRetrySupabaseQuery(0, new Error("canceling statement due to statement timeout")),
    ).toBe(false);
    expect(
      shouldRetrySupabaseQuery(0, new Error("Sesi login berakhir. Silakan masuk kembali untuk melanjutkan try out.")),
    ).toBe(false);
  });

  test("allows a single retry for transient network failures and stops at failureCount >= 1", () => {
    expect(shouldRetrySupabaseQuery(0, new Error("Failed to fetch"))).toBe(true);
    expect(shouldRetrySupabaseQuery(1, new Error("Failed to fetch"))).toBe(false);
  });
});
