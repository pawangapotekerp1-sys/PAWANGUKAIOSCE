import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const configPath = resolve(process.cwd(), "vitest.config.ts");
const configSource = readFileSync(configPath, "utf8");
const sessionPagePaths = [
  resolve(process.cwd(), "src/pages/app/tryout-session-page.tsx"),
  resolve(process.cwd(), "src/pages/app/scheduled-tryout-session-page.tsx"),
];

function findRawButtonUsages(filePath: string) {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .flatMap((line: string, index: number) => (line.includes("<button") ? [index + 1] : []));
}

describe("vitest config", () => {
  test("excludes local worktree folders from test discovery", () => {
    expect(configSource).toMatch(/["']\.worktrees\/\*\*["']/);
  });

  test("splits frontend and supabase tests into separate projects", () => {
    expect(configSource).toMatch(/name:\s*["']src["']/);
    expect(configSource).toMatch(/include:\s*\[\s*["']src\/\*\*\/\*\.\{test,spec\}\.\?\(c\|m\)\[jt\]s\?\(x\)["']/);
    expect(configSource).toMatch(/environment:\s*["']jsdom["']/);
    expect(configSource).toMatch(/name:\s*["']supabase["']/);
    expect(configSource).toMatch(/include:\s*\[\s*["']supabase\/\*\*\/\*\.\{test,spec\}\.\?\(c\|m\)\[jt\]s\?\(x\)["']/);
    expect(configSource).toMatch(/environment:\s*["']node["']/);
  });

  test.each(sessionPagePaths)("guards %s from raw page-level button markup", (filePath) => {
    expect(findRawButtonUsages(filePath)).toEqual([]);
  });
});
