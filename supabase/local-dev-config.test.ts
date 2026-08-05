import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(currentFilePath), "..");
const configPath = resolve(repoRoot, "supabase", "config.toml");
const packageJsonPath = resolve(repoRoot, "package.json");
const gitignorePath = resolve(repoRoot, ".gitignore");

const configToml = readFileSync(configPath, "utf8");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts?: Record<string, string>;
};
const gitignore = readFileSync(gitignorePath, "utf8");

describe("supabase local development hardening", () => {
  test("disables optional analytics in config on this repo", () => {
    expect(configToml).toMatch(/^\[analytics\]\r?\nenabled = false\b/m);
  });

  test("provides stable supabase lifecycle scripts for local development", () => {
    expect(packageJson.scripts?.["supabase:network"]).toBe(
      "node scripts/ensure-supabase-local-network.mjs",
    );
    expect(packageJson.scripts?.["supabase:start"]).toBe(
      "npm run supabase:network && npx supabase start --network-id supabase-localhost --ignore-health-check -x vector",
    );
    expect(packageJson.scripts?.["supabase:stop"]).toBe(
      "npx supabase stop --all --no-backup",
    );
    expect(packageJson.scripts?.["supabase:status"]).toContain(
      "docker ps --filter name=supabase_ --format",
    );
    expect(packageJson.scripts?.["supabase:status"]).toContain("{{.Names}}");
    expect(packageJson.scripts?.["supabase:status"]).toContain("{{.Status}}");
    expect(packageJson.scripts?.["supabase:status"]).toContain("{{.Ports}}");
  });

  test("keeps local backups and Supabase/TestSprite artifacts out of git by default", () => {
    expect(gitignore).toContain("backups/");
    expect(gitignore).toContain("supabase/.temp/");
    expect(gitignore).toContain("testsprite_tests/");
  });
});
