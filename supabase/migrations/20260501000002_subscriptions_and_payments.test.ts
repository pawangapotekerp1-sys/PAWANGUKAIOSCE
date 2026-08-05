import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000002_subscriptions_and_payments.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260501000002_subscriptions_and_payments migration", () => {
  test("forces pending-review rows to have no reviewer metadata", () => {
    expect(normalizedSql).toContain(
      "constraint payment_submissions_review_metadata_check check ( ( status = 'pending_review' and reviewer_id is null and reviewed_at is null and reviewer_notes is null ) or ( status <> 'pending_review' and reviewer_id is not null and reviewed_at is not null ) )",
    );
  });

  test("promotes approved users to pro in the transactional review function", () => {
    expect(normalizedSql).toContain("create or replace function public.review_payment_submission(");
    expect(normalizedSql).toContain("update public.profiles set role = 'pro' where id = submission_row.user_id and role = 'pendaftar_baru';");
  });

  test("extends from the current active access window when a renewal is approved early", () => {
    expect(normalizedSql).toContain("from public.subscriptions where user_id = submission_row.user_id and state = 'active' and ends_at > submission_row.reviewed_at");
    expect(normalizedSql).toContain("coalesce(current_access_ends_at, submission_row.reviewed_at) + make_interval(days => duration_days)");
  });
});
