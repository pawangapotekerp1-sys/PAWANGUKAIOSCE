import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

describe("Migration 20261017000050_source_aware_flashcard_engine.sql", () => {
  const sqlPath = resolve(currentDir, "20261017000050_source_aware_flashcard_engine.sql");
  const sqlContent = readFileSync(sqlPath, "utf-8");

  it("adds metadata column to flashcard_materials and flashcard_cards idempotently", () => {
    expect(sqlContent).toMatch(/alter table public\.flashcard_materials\s+add column if not exists metadata jsonb not null default '{}'::jsonb;/i);
    expect(sqlContent).toMatch(/alter table public\.flashcard_cards\s+add column if not exists metadata jsonb not null default '{}'::jsonb;/i);
  });

  it("updates user_ai_credentials default model to gemini-3.8-flash", () => {
    expect(sqlContent).toMatch(/alter table public\.user_ai_credentials\s+alter column model set default 'gemini-3.8-flash';/i);
  });

  it("secures RPC replace_flashcard_material_content with owner check and revoked permissions", () => {
    expect(sqlContent).toMatch(/create or replace function public\.replace_flashcard_material_content/i);
    expect(sqlContent).toMatch(/if actual_owner_id <> target_owner_id then/i);
    expect(sqlContent).toMatch(/revoke all on function public\.replace_flashcard_material_content\(uuid, uuid, jsonb\) from public, anon, authenticated;/i);
    expect(sqlContent).toMatch(/grant execute on function public\.replace_flashcard_material_content\(uuid, uuid, jsonb\) to service_role;/i);
  });
});
