import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54721";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const admin = createClient(supabaseUrl, serviceKey);
const anon = createClient(supabaseUrl, anonKey);

describe("20261027120000_ai_insight_reports migration", () => {
  const sql = readFileSync(
    resolve(import.meta.dirname, "../../supabase/migrations", "20261027120000_ai_insight_reports.sql"),
    "utf8"
  );

  test("defines ai_insight_reports table with required schema", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.ai_insight_reports");
    expect(sql).toContain("input_hash text NOT NULL");
    expect(sql).toContain("engine_version text NOT NULL");
    expect(sql).toContain("report jsonb NOT NULL");
    expect(sql).toContain("narrative text NOT NULL");
    expect(sql).toContain("summary text NOT NULL");
    expect(sql).toContain("source text NOT NULL CHECK (source IN ('gemini', 'fallback'))");
    expect(sql).toContain("model text NOT NULL");
  });

  test("defines unique index on (user_id, input_hash, engine_version)", () => {
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS ai_insight_reports_user_input_engine_idx");
    expect(sql).toContain("ON public.ai_insight_reports (user_id, input_hash, engine_version)");
  });

  test("enforces RLS and denies anonymous read access", async () => {
    const { data, error } = await anon.from("ai_insight_reports").select("*");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  test("allows admin to insert and query cached report", async () => {
    const testUserId = "22222222-2222-2222-2222-222222222222";
    const testHash = "testhash1234567890abcdef";
    const testVersion = "1.1.0";

    // Clean any existing
    await admin.from("ai_insight_reports").delete().eq("user_id", testUserId).eq("input_hash", testHash);

    const { data: inserted, error: insertError } = await admin
      .from("ai_insight_reports")
      .insert({
        user_id: testUserId,
        input_hash: testHash,
        engine_version: testVersion,
        report: { version: testVersion, totalAttempts: 1 },
        narrative: "Narasi uji coba cache",
        summary: "Narasi uji coba cache",
        source: "fallback",
        model: "deterministic-engine",
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.input_hash).toBe(testHash);
    expect(inserted?.source).toBe("fallback");

    // Query back
    const { data: queried, error: queryError } = await admin
      .from("ai_insight_reports")
      .select("*")
      .eq("user_id", testUserId)
      .eq("input_hash", testHash)
      .eq("engine_version", testVersion)
      .single();

    expect(queryError).toBeNull();
    expect(queried?.narrative).toBe("Narasi uji coba cache");

    // Cleanup
    await admin.from("ai_insight_reports").delete().eq("user_id", testUserId).eq("input_hash", testHash);
  });
});
