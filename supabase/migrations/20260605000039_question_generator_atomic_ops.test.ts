import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260605000039_question_generator_atomic_ops.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260605000039_question_generator_atomic_ops.sql", () => {
  test("creates the missing question generator base tables before atomic helpers run", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.generator_user_settings/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_generation_batches/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_generation_references/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_generation_items/i);
    expect(migrationSql).toMatch(/create table if not exists public\.question_generation_deliveries/i);
  });

  test("enables row level security and owner policies for generator tables", () => {
    expect(migrationSql).toMatch(/alter table public\.generator_user_settings enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.question_generation_batches enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.question_generation_references enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.question_generation_items enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.question_generation_deliveries enable row level security/i);
    expect(migrationSql).toMatch(/create policy "generator_user_settings_owner_access"/i);
    expect(migrationSql).toMatch(/create policy "question_generation_batches_owner_access"/i);
    expect(migrationSql).toMatch(/create policy "question_generation_references_owner_access"/i);
    expect(migrationSql).toMatch(/create policy "question_generation_items_owner_access"/i);
    expect(migrationSql).toMatch(/create policy "question_generation_deliveries_owner_access"/i);
    expect(migrationSql).toMatch(/public\.can_manage_question_bank\(\)/i);
  });

  test("tightens target question count and adds duplicate delivery guards", () => {
    expect(migrationSql).toMatch(/check\s*\(\s*target_question_count between 1 and 20\s*\)/i);
    expect(migrationSql).toMatch(/create unique index if not exists question_generation_deliveries_item_bank_destination_uidx/i);
    expect(migrationSql).toMatch(/create unique index if not exists question_generation_deliveries_item_event_destination_uidx/i);
  });

  test("defines the authoritative generator bootstrap contract for fresh installs", () => {
    expect(migrationSql).toMatch(/secret_hint text not null/i);
    expect(migrationSql).toMatch(/question_generation_references[\s\S]*updated_at timestamptz not null/i);
    expect(migrationSql).toMatch(/draft_question_id uuid references public\.question_upload_items \(id\) on delete set null/i);
    expect(migrationSql).toMatch(/create unique index if not exists question_generation_references_batch_order_uidx/i);
    expect(migrationSql).toMatch(/create unique index if not exists question_generation_items_batch_order_uidx/i);
  });

  test("defines transactional rpc helpers for generation persistence and both delivery flows", () => {
    expect(migrationSql).toMatch(/create or replace function public\.persist_generated_question_batch/i);
    expect(migrationSql).toMatch(/create or replace function public\.deliver_generated_item_to_question_bank/i);
    expect(migrationSql).toMatch(/create or replace function public\.deliver_generated_item_to_scheduled_event/i);
    expect(migrationSql).toMatch(/security definer/i);
    expect(migrationSql).toMatch(/grant execute on function public\.persist_generated_question_batch/i);
    expect(migrationSql).toMatch(/grant execute on function public\.deliver_generated_item_to_question_bank/i);
    expect(migrationSql).toMatch(/grant execute on function public\.deliver_generated_item_to_scheduled_event/i);
  });
});
