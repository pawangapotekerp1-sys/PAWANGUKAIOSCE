import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260624000045_question_generator_production_hardening.sql");
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";

describe("20260624000045_question_generator_production_hardening.sql", () => {
  test("exists as a forward-only production repair migration", () => {
    expect(migrationExists).toBe(true);
  });

  test("drops the legacy permissive question generator policies from already-deployed databases", () => {
    expect(migrationSql).toMatch(/drop policy if exists "generator_user_settings_select_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "generator_user_settings_write_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_batches_select_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_batches_write_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_references_select_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_references_write_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_items_select_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_items_write_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_deliveries_select_own"/i);
    expect(migrationSql).toMatch(/drop policy if exists "question_generation_deliveries_write_own"/i);
    expect(migrationSql).toMatch(/public\.can_manage_question_bank\(\)/i);
  });

  test("repairs the missing schema guarantees on existing production tables", () => {
    expect(migrationSql).toMatch(/update public\.generator_user_settings\s+set secret_hint =/i);
    expect(migrationSql).toMatch(/alter table public\.generator_user_settings\s+alter column secret_hint set not null/i);
    expect(migrationSql).toMatch(/alter table public\.question_generation_references\s+add column if not exists updated_at timestamptz not null default timezone\('utc', now\(\)\)/i);
    expect(migrationSql).toMatch(/drop constraint if exists question_generation_references_reference_order_check/i);
    expect(migrationSql).toMatch(/add constraint question_generation_references_reference_order_check check\s*\(\s*reference_order >= 1\s*\)/i);
    expect(migrationSql).toMatch(/drop trigger if exists set_question_generation_references_updated_at/i);
    expect(migrationSql).toMatch(/create trigger set_question_generation_references_updated_at/i);
    expect(migrationSql).toMatch(/drop index if exists public\.question_generation_references_batch_id_idx/i);
    expect(migrationSql).toMatch(/create index if not exists question_generation_references_batch_id_idx\s+on public\.question_generation_references \(batch_id\)/i);
    expect(migrationSql).toMatch(/update public\.question_generation_items\s+set draft_question_id = null/i);
    expect(migrationSql).toMatch(/drop constraint if exists question_generation_items_status_check/i);
    expect(migrationSql).toMatch(/add constraint question_generation_items_status_check check\s*\(\s*status in \('draft_generated', 'draft_edited'\)\s*\)/i);
    expect(migrationSql).toMatch(/alter table public\.question_generation_items\s+add constraint question_generation_items_draft_question_id_fkey/i);
    expect(migrationSql).toMatch(/drop index if exists public\.question_generation_items_batch_id_idx/i);
    expect(migrationSql).toMatch(/create index if not exists question_generation_items_batch_id_idx\s+on public\.question_generation_items \(batch_id\)/i);
  });
});
