import path from "path";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const sharedExclude = [...configDefaults.exclude, "tests/e2e/**", ".worktrees/**"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "npm:zod@^4.4.1": "zod",
      "npm:zod@4.4.1": "zod",
      "npm:zod": "zod",
      "npm:@supabase/supabase-js@2": "@supabase/supabase-js",
      "jsr:@supabase/functions-js/edge-runtime.d.ts": path.resolve(__dirname, "./src/test/empty-shim.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    pool: "threads",
    isolate: false,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 25_000,
    projects: [
      {
        extends: true,
        test: {
          name: "src",
          include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)", "tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          exclude: [...sharedExclude, "tests/migrations/**", "tests/schemas/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "migrations",
          include: ["tests/migrations/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
          environment: "node",
          exclude: sharedExclude,
        },
      },
      {
        extends: true,
        test: {
          name: "schemas",
          include: ["tests/schemas/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
          environment: "node",
          exclude: sharedExclude,
        },
      },
      {
        extends: true,
        test: {
          name: "supabase",
          include: ["supabase/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
          environment: "node",
          exclude: sharedExclude,
        },
      },
      {
        extends: true,
        test: {
          name: "tooling",
          include: ["vitest.config.test.ts"],
          environment: "node",
          exclude: sharedExclude,
        },
      },
    ],
  },
});
