import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationFileName = "20261028000002_lock_security_definer_rpc_privileges.sql";
const migrationPath = resolve(
  dirname(currentFilePath),
  "../../supabase/migrations",
  migrationFileName,
);

const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20261028000002_lock_security_definer_rpc_privileges migration", () => {
  test("migration file exists and timestamp is after 20261028000001", () => {
    expect(migrationExists).toBe(true);
    const timestampStr = migrationFileName.slice(0, 14);
    expect(BigInt(timestampStr)).toBeGreaterThan(20261028000001n);
  });

  test("revokes public and anon on group (b) functions while keeping authenticated and service_role", () => {
    const groupB = [
      "public.delete_question(uuid)",
      "public.delete_questions(uuid[])",
      "public.get_leaderboard(text)",
      "public.get_scheduled_event_leaderboard(uuid, integer)",
      "public.list_tryout_catalog_entries()",
      "public.list_scheduled_tryout_catalog_entries()",
    ];

    for (const fn of groupB) {
      expect(normalizedSql).toContain(`revoke all on function ${fn} from public, anon;`);
      expect(normalizedSql).toContain(`grant execute on function ${fn} to authenticated, service_role;`);
    }
  });

  test("revokes public, anon, and authenticated on group (c) functions and grants to service_role only", () => {
    const groupC = [
      "public.deliver_generated_item_to_question_bank(uuid, uuid, uuid, uuid)",
      "public.deliver_generated_item_to_scheduled_event(uuid, uuid, uuid)",
      "public.persist_generated_question_batch(uuid, uuid, jsonb, jsonb)",
      "public.rebuild_attempt_result(uuid)",
      "public.sync_question_bank_answer_key(uuid)",
      "public.auto_create_block_exam_template()",
      "public.auto_create_topic_exam_template()",
    ];

    for (const fn of groupC) {
      expect(normalizedSql).toContain(`revoke all on function ${fn} from public, anon, authenticated;`);
      expect(normalizedSql).toContain(`grant execute on function ${fn} to service_role;`);
    }
  });

  test("verifies has_function_privilege on local database matches production Tahap 2 matrix", () => {
    const sql = `
      SELECT proname,
             has_function_privilege('anon', oid, 'EXECUTE') as anon_exec,
             has_function_privilege('authenticated', oid, 'EXECUTE') as auth_exec,
             has_function_privilege('service_role', oid, 'EXECUTE') as sr_exec
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname IN (
          'delete_question',
          'delete_questions',
          'get_leaderboard',
          'get_scheduled_event_leaderboard',
          'list_tryout_catalog_entries',
          'list_scheduled_tryout_catalog_entries',
          'deliver_generated_item_to_question_bank',
          'deliver_generated_item_to_scheduled_event',
          'persist_generated_question_batch',
          'rebuild_attempt_result',
          'sync_question_bank_answer_key',
          'auto_create_block_exam_template',
          'auto_create_topic_exam_template'
        )
      ORDER BY proname;
    `;
    const output = execFileSync(
      "docker",
      ["exec", "supabase_db_Projek_OSCE", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
      { encoding: "utf8" },
    );

    const lines = output.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    expect(lines.length).toBe(13);

    const groupBNames = new Set([
      "delete_question",
      "delete_questions",
      "get_leaderboard",
      "get_scheduled_event_leaderboard",
      "list_tryout_catalog_entries",
      "list_scheduled_tryout_catalog_entries",
    ]);

    for (const line of lines) {
      const [proname, anon, auth, sr] = line.split("|");
      expect(anon, `${proname} anon_exec should be false`).toBe("f");
      expect(sr, `${proname} sr_exec should be true`).toBe("t");
      if (groupBNames.has(proname)) {
        expect(auth, `${proname} auth_exec should be true`).toBe("t");
      } else {
        expect(auth, `${proname} auth_exec should be false`).toBe("f");
      }
    }
  });
});
