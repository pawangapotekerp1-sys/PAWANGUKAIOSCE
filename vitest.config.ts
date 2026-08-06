import path from "path";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const sharedExclude = [...configDefaults.exclude, "tests/e2e/**", ".worktrees/**"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "npm:zod": "zod",
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    pool: "forks",
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
