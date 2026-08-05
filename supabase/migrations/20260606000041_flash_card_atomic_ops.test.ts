import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const migrationPath = resolve(import.meta.dirname, "./20260606000041_flash_card_atomic_ops.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("20260606000041_flash_card_atomic_ops.sql", () => {
  test("defines an atomic rpc helper for replacing mentor-owned flash card content", () => {
    expect(migrationSql).toMatch(/create or replace function public\.replace_flashcard_material_content/i);
    expect(migrationSql).toMatch(/security definer/i);
    expect(migrationSql).toMatch(/delete from public\.flashcard_subtopics/i);
    expect(migrationSql).toMatch(/jsonb_array_elements\(target_subtopics\) with ordinality/i);
    expect(migrationSql).toMatch(/insert into public\.flashcard_cards/i);
    expect(migrationSql).toMatch(/grant execute on function public\.replace_flashcard_material_content/i);
  });

  test("keeps the helper callable only by server-side service role context", () => {
    expect(migrationSql).toMatch(/created_by = target_owner_id/i);
    expect(migrationSql).toMatch(/grant execute on function public\.replace_flashcard_material_content\(uuid, uuid, jsonb\) to service_role/i);
    expect(migrationSql).not.toMatch(/grant execute on function public\.replace_flashcard_material_content\(uuid, uuid, jsonb\) to authenticated/i);
  });
});
