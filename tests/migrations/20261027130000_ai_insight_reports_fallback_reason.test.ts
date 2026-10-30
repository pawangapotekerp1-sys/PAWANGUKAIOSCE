import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, test } from "vitest";

describe("Migration 20261027130000_ai_insight_reports_fallback_reason", () => {
  const sql = readFileSync(
    resolve(__dirname, "../../supabase/migrations/20261027130000_ai_insight_reports_fallback_reason.sql"),
    "utf-8",
  );

  test("defines fallback_reason column with check constraint", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS fallback_reason text");
    expect(sql).toContain("fallback_reason IN ('no_key', 'validation_failed', 'gemini_error')");
  });

  test("revokes write permissions from authenticated role", () => {
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE ON public.ai_insight_reports FROM authenticated;");
    expect(sql).toContain("GRANT SELECT ON public.ai_insight_reports TO authenticated;");
    expect(sql).toContain("GRANT ALL ON public.ai_insight_reports TO service_role;");
  });

  test("drops write policies on authenticated", () => {
    expect(sql).toContain("DROP POLICY IF EXISTS \"ai_insight_reports_insert_own_or_admin\"");
    expect(sql).toContain("DROP POLICY IF EXISTS \"ai_insight_reports_update_own_or_admin\"");
    expect(sql).toContain("DROP POLICY IF EXISTS \"ai_insight_reports_delete_own_or_admin\"");
  });
});
