import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260501000006_rls_and_storage.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260501000006_rls_and_storage migration", () => {
  test("defines is_admin as a security definer helper with locked search_path", () => {
    expect(normalizedSql).toContain("create or replace function public.is_admin()");
    expect(normalizedSql).toContain("security definer");
    expect(normalizedSql).toContain("set search_path = public");
    expect(normalizedSql).toContain("from public.profiles where id = auth.uid() and role = 'admin'");
  });

  test("only allows authenticated users to insert pending-review submissions for themselves", () => {
    expect(normalizedSql).toContain('create policy "payment_submissions_insert_own" on public.payment_submissions for insert with check ( auth.uid() = user_id and status = \'pending_review\' and reviewer_id is null and reviewed_at is null and reviewer_notes is null )');
  });

  test("uses a recursion-safe self-update policy plus a trigger to block role changes for non-admins", () => {
    expect(normalizedSql).toContain('create policy "profiles_update_own_without_role_change" on public.profiles for update using ( auth.uid() = id ) with check ( auth.uid() = id )');
    expect(normalizedSql).not.toContain("from public.profiles as existing_profile where existing_profile.id = auth.uid()");
    expect(normalizedSql).toContain("create or replace function public.prevent_profile_role_change()");
    expect(normalizedSql).toContain("if old.role is distinct from new.role and auth.uid() = old.id and not public.is_admin() then");
    expect(normalizedSql).toContain("raise exception 'role profile hanya dapat diubah oleh admin.'");
    expect(normalizedSql).toContain("create trigger prevent_profile_role_change before update on public.profiles for each row execute function public.prevent_profile_role_change()");
  });

  test("only allows users to delete their own uploaded payment proofs before a submission references them", () => {
    expect(normalizedSql).toContain('create policy "payment_proofs_delete_own_or_admin" on storage.objects for delete to authenticated using ( bucket_id = \'payment-proofs\'');
    expect(normalizedSql).toContain("public.is_admin()");
    expect(normalizedSql).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(normalizedSql).toContain("not exists ( select 1 from public.payment_submissions where payment_proof_path = name )");
  });

  test("guards storage bucket bootstrap so baseline migrations survive cold local databases before storage tables exist", () => {
    expect(normalizedSql).toContain("to_regclass('storage.buckets')");
    expect(normalizedSql).toContain("to_regclass('storage.objects')");
    expect(normalizedSql).toContain("if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then");
  });

  test("enables student-safe read access for tryout runtime tables and published content", () => {
    expect(normalizedSql).toContain("alter table public.exam_templates enable row level security");
    expect(normalizedSql).toContain("alter table public.attempts enable row level security");
    expect(normalizedSql).toContain('create policy "exam_templates_select_published_or_admin" on public.exam_templates for select using ( status = \'published\' or public.is_admin() )');
    expect(normalizedSql).toContain('create policy "attempts_select_own_or_admin" on public.attempts for select using ( user_id = auth.uid() or public.is_admin() )');
    expect(normalizedSql).toContain('create policy "attempt_items_select_own_or_admin" on public.attempt_items for select using ( exists ( select 1 from public.attempts where attempts.id = attempt_items.attempt_id and ( attempts.user_id = auth.uid() or public.is_admin() ) ) )');
    expect(normalizedSql).toContain('create policy "attempt_results_select_own_or_admin" on public.attempt_results for select using ( exists ( select 1 from public.attempts where attempts.id = attempt_results.attempt_id and ( attempts.user_id = auth.uid() or public.is_admin() ) ) )');
  });
});
