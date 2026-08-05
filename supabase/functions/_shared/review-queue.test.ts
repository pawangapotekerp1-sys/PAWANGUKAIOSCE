import { describe, expect, test } from "vitest";
import { resolveIngestionJobStatusAfterDecision } from "./review-queue";

describe("resolveIngestionJobStatusAfterDecision", () => {
  test("completes the job when no candidate remains undecided after an admin decision", () => {
    expect(resolveIngestionJobStatusAfterDecision(0)).toBe("completed");
  });

  test("keeps the job in needs_review while there are still undecided candidates", () => {
    expect(resolveIngestionJobStatusAfterDecision(2)).toBe("needs_review");
  });
});
