import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260606000040_flash_card_domain.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260606000040_flash_card_domain migration", () => {
  test("defines the flash card domain tables", () => {
    expect(migrationSql).toMatch(/create table if not exists public\.flashcard_materials/i);
    expect(migrationSql).toMatch(/create table if not exists public\.flashcard_source_files/i);
    expect(migrationSql).toMatch(/create table if not exists public\.flashcard_subtopics/i);
    expect(migrationSql).toMatch(/create table if not exists public\.flashcard_cards/i);
    expect(migrationSql).toMatch(/create table if not exists public\.student_flashcard_progress/i);
  });

  test("locks material and progress statuses to the supported values", () => {
    expect(migrationSql).toMatch(
      /constraint flashcard_materials_status_check check \(\s*status in \('draft', 'processing', 'ready_for_review', 'published', 'failed'\)\s*\)/i,
    );
    expect(migrationSql).toMatch(
      /constraint student_flashcard_progress_difficulty_check check \(\s*difficulty in \('easy', 'medium', 'hard'\)\s*\)/i,
    );
  });

  test("enables row level security on the flash card tables", () => {
    expect(migrationSql).toMatch(/alter table public\.flashcard_materials enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.flashcard_source_files enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.flashcard_subtopics enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.flashcard_cards enable row level security/i);
    expect(migrationSql).toMatch(/alter table public\.student_flashcard_progress enable row level security/i);
  });

  test("lets students read only published flash card content", () => {
    expect(migrationSql).toMatch(/create policy "flashcard_materials_select_published_or_manager"/i);
    expect(migrationSql).toMatch(/status = 'published'/i);
    expect(migrationSql).toMatch(/create policy "flashcard_subtopics_select_published_or_manager"/i);
    expect(migrationSql).toMatch(/create policy "flashcard_cards_select_published_or_manager"/i);
  });

  test("keeps source file access under manager boundaries and student progress user-owned", () => {
    expect(migrationSql).toMatch(/create policy "flashcard_source_files_manage_owner"/i);
    expect(migrationSql).toMatch(/public\.can_manage_question_bank\(\)/i);
    expect(migrationSql).toMatch(/create policy "student_flashcard_progress_select_own"/i);
    expect(migrationSql).toMatch(/create policy "student_flashcard_progress_upsert_own"/i);
    expect(migrationSql).toMatch(/user_id = auth\.uid\(\)/i);
  });

  test("limits transcript uploads to plain text formats that the generator can parse", () => {
    expect(migrationSql).toMatch(/'text\/plain'/i);
    expect(migrationSql).toMatch(/'text\/markdown'/i);
    expect(migrationSql).toMatch(/'application\/pdf'/i);
    expect(migrationSql).not.toMatch(/wordprocessingml\.document/i);
  });

  test("guards flash card source bucket bootstrap for cold local databases", () => {
    expect(normalizedSql).toContain("to_regclass('storage.buckets')");
    expect(normalizedSql).toContain("to_regclass('storage.objects')");
  });
});
