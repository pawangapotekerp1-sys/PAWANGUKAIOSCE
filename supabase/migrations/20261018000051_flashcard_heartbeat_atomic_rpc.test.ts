import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20261018000051_flashcard_heartbeat_atomic_rpc.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20261018000051_flashcard_heartbeat_atomic_rpc.sql", () => {
  test("defines an atomic heartbeat rpc helper using jsonb_set", () => {
    expect(migrationSql).toMatch(/create or replace function public\.update_flashcard_material_heartbeat/i);
    expect(migrationSql).toMatch(/security definer/i);
    expect(migrationSql).toMatch(/set search_path = ''/i);
    expect(migrationSql).toMatch(/jsonb_set/i);
    expect(migrationSql).toMatch(/public\.flashcard_materials/i);
    expect(migrationSql).toMatch(/status = 'processing'/i);
    expect(migrationSql).toMatch(/metadata->'processingJob'->>'jobId' = target_job_id/i);
  });

  test("restricts execution strictly to service_role context", () => {
    expect(migrationSql).toMatch(/revoke all on function public\.update_flashcard_material_heartbeat.*from public, anon, authenticated/i);
    expect(migrationSql).toMatch(/grant execute on function public\.update_flashcard_material_heartbeat.*to service_role/i);
  });
});
