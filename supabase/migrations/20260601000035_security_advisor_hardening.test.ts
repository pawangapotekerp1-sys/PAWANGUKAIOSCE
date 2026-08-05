import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260601000035_security_advisor_hardening.sql",
);
const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

const invokerFunctions = [
  "public.prevent_profile_role_change()",
  "public.can_manage_question_bank()",
  "public.can_manage_scheduled_tryouts()",
  "public.list_admin_users()",
  "public.admin_update_user_role(uuid, public.app_role)",
];

const authenticatedRpcFunctions = [
  "public.is_admin()",
  "public.can_manage_question_bank()",
  "public.can_manage_scheduled_tryouts()",
  "public.list_admin_users()",
  "public.admin_update_user_role(uuid, public.app_role)",
  "public.get_leaderboard(text)",
  "public.get_personal_weakness_diagnosis(date, date, text)",
  "public.start_attempt_from_template(uuid)",
  "public.pause_attempt(uuid)",
  "public.resume_attempt(uuid)",
  "public.submit_attempt(uuid)",
  "public.save_attempt_answer(uuid, uuid, text, boolean, integer)",
  "public.list_tryout_catalog_entries()",
  "public.delete_question(uuid)",
  "public.delete_questions(uuid[])",
  "public.can_manage_scheduled_tryouts()",
  "public.list_scheduled_tryout_catalog_entries()",
  "public.sync_scheduled_tryout_attempt(uuid)",
  "public.start_scheduled_tryout_attempt(uuid)",
  "public.save_scheduled_tryout_answer(uuid, uuid, text, boolean)",
  "public.pause_scheduled_tryout_attempt(uuid)",
  "public.resume_scheduled_tryout_attempt(uuid)",
  "public.submit_scheduled_tryout_attempt(uuid)",
  "public.upsert_scheduled_tryout_event(uuid, jsonb)",
  "public.reactivate_scheduled_tryout_event(uuid, timestamptz, timestamptz)",
  "public.delete_scheduled_tryout_event(uuid)",
  "public.rebuild_attempt_diagnostic_snapshot(uuid)",
];

describe("20260601000035_security_advisor_hardening migration", () => {
  test("exists and locks mutable search_path functions down to an empty path", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain(
      "alter function public.set_updated_at() set search_path = '';",
    );
    expect(normalizedSql).toContain(
      "alter function public.subscription_package_duration_days(text) set search_path = '';",
    );
    expect(normalizedSql).toContain(
      "alter function public.handle_new_user() set search_path = '';",
    );
  });

  test("moves safe helper and admin functions back to security invoker", () => {
    expect(migrationExists).toBe(true);

    for (const functionSignature of invokerFunctions) {
      expect(normalizedSql).toContain(
        `alter function ${functionSignature} security invoker;`,
      );
      expect(normalizedSql).toContain(
        `alter function ${functionSignature} set search_path = '';`,
      );
    }
  });

  test("removes anonymous execution paths while preserving signed-in rpc access", () => {
    expect(migrationExists).toBe(true);
    expect(normalizedSql).toContain(
      "revoke all on function public.handle_new_user() from public, anon;",
    );

    for (const functionSignature of authenticatedRpcFunctions) {
      expect(normalizedSql).toContain(
        `revoke all on function ${functionSignature} from public, anon;`,
      );
      expect(normalizedSql).toContain(
        `grant execute on function ${functionSignature} to authenticated;`,
      );
      expect(normalizedSql).toContain(
        `grant execute on function ${functionSignature} to service_role;`,
      );
    }
  });
});
