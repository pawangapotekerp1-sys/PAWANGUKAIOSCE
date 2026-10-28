import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationFileName = "20261028000001_vault_helpers_privileges_and_default_acl.sql";
const migrationPath = resolve(
  dirname(currentFilePath),
  "../../supabase/migrations",
  migrationFileName,
);

const migrationExists = existsSync(migrationPath);
const migrationSql = migrationExists ? readFileSync(migrationPath, "utf8") : "";
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20261028000001_vault_helpers_privileges_and_default_acl migration", () => {
  test("migration file exists and timestamp is after 20261027130000", () => {
    expect(migrationExists).toBe(true);
    const timestampStr = migrationFileName.slice(0, 14);
    expect(BigInt(timestampStr)).toBeGreaterThan(20261027130000n);
  });

  test("revokes execute on vault helpers from public, anon, and authenticated", () => {
    expect(normalizedSql).toContain(
      "revoke all on function public.create_vault_secret(text, text, text) from public, anon, authenticated;"
    );
    expect(normalizedSql).toContain(
      "revoke all on function public.read_vault_secret(uuid) from public, anon, authenticated;"
    );
    expect(normalizedSql).toContain(
      "revoke all on function public.delete_vault_secret(uuid) from public, anon, authenticated;"
    );
  });

  test("grants execute on vault helpers to service_role only", () => {
    expect(normalizedSql).toContain(
      "grant execute on function public.create_vault_secret(text, text, text) to service_role;"
    );
    expect(normalizedSql).toContain(
      "grant execute on function public.read_vault_secret(uuid) to service_role;"
    );
    expect(normalizedSql).toContain(
      "grant execute on function public.delete_vault_secret(uuid) to service_role;"
    );
  });

  test("revokes default privileges on schema public functions from anon and authenticated", () => {
    expect(normalizedSql).toContain(
      "alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;"
    );
    expect(normalizedSql).toContain(
      "alter default privileges in schema public revoke execute on functions from anon, authenticated;"
    );
  });

  test("verifies has_function_privilege on local database (anon=false, authenticated=false, service_role=true)", () => {
    const sql = "SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') as anon_exec, has_function_privilege('authenticated', oid, 'EXECUTE') as auth_exec, has_function_privilege('service_role', oid, 'EXECUTE') as sr_exec FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('create_vault_secret', 'read_vault_secret', 'delete_vault_secret') ORDER BY proname;";
    const output = execFileSync(
      "docker",
      ["exec", "supabase_db_Projek_OSCE", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
      { encoding: "utf8" }
    );

    const lines = output.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    expect(lines.length).toBe(3);

    for (const line of lines) {
      const [proname, anon, auth, sr] = line.split("|");
      expect(["create_vault_secret", "delete_vault_secret", "read_vault_secret"]).toContain(proname);
      expect(anon, `${proname} anon_exec should be false`).toBe("f");
      expect(auth, `${proname} auth_exec should be false`).toBe("f");
      expect(sr, `${proname} sr_exec should be true`).toBe("t");
    }
  });
});
