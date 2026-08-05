import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const networkName = "supabase-localhost";
const tempDir = path.join(process.cwd(), "supabase", ".temp");
const envFilePath = path.join(tempDir, "functions.serve.env");

function commandName(name) {
  return process.platform === "win32" && (name === "npm" || name === "npx")
    ? `${name}.cmd`
    : name;
}

function runSync(command, args, options = {}) {
  const isWindowsCommandScript = process.platform === "win32" && command.endsWith(".cmd");
  const result = spawnSync(
    isWindowsCommandScript ? "cmd.exe" : command,
    isWindowsCommandScript
      ? ["/d", "/s", "/c", [command, ...args].join(" ")]
      : args,
    {
      shell: false,
      stdio: "pipe",
      encoding: "utf8",
      ...options,
    },
  );

  if (result.error) {
    throw result.error;
  }

  return result;
}

function ensureLocalNetwork() {
  const result = runSync(commandName("node"), ["scripts/ensure-supabase-local-network.mjs"]);

  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.stdout.write(result.stdout ?? "");
    process.exit(result.status ?? 1);
  }
}

function parseStatusEnv(output) {
  const values = new Map();

  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const unquotedValue = rawValue.startsWith("\"") && rawValue.endsWith("\"")
        ? rawValue.slice(1, -1)
        : rawValue;

      values.set(key, unquotedValue);
    });

  return values;
}

function buildFunctionEnv() {
  const result = runSync(commandName("npx"), ["supabase", "status", "-o", "env"]);

  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.stdout.write(result.stdout ?? "");
    process.exit(result.status ?? 1);
  }

  const values = parseStatusEnv(result.stdout ?? "");
  const apiUrl = values.get("API_URL");
  const anonKey = values.get("ANON_KEY");
  const publishableKey = values.get("PUBLISHABLE_KEY");
  const serviceRoleKey = values.get("SERVICE_ROLE_KEY");

  if (!apiUrl || !anonKey || !publishableKey || !serviceRoleKey) {
    throw new Error("Supabase local env belum lengkap. Pastikan `supabase start` sudah aktif.");
  }

  const envLines = [
    `SUPABASE_URL=${apiUrl}`,
    `SUPABASE_ANON_KEY=${anonKey}`,
    `SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
  ];

  if (typeof process.env.GEMINI_BASE_URL === "string" && process.env.GEMINI_BASE_URL.trim()) {
    envLines.push(`GEMINI_BASE_URL=${process.env.GEMINI_BASE_URL.trim()}`);
  }

  mkdirSync(tempDir, { recursive: true });
  writeFileSync(envFilePath, `${envLines.join("\n")}\n`, "utf8");
}

ensureLocalNetwork();
buildFunctionEnv();

const forwardedArgs = process.argv.slice(2);
const args = [
  "supabase",
  "functions",
  "serve",
  "--network-id",
  networkName,
  "--env-file",
  path.relative(process.cwd(), envFilePath).replace(/\\/g, "/"),
  ...forwardedArgs,
];

const npxCommand = commandName("npx");
const isWindowsCommandScript = process.platform === "win32" && npxCommand.endsWith(".cmd");
const child = spawn(
  isWindowsCommandScript ? "cmd.exe" : npxCommand,
  isWindowsCommandScript
    ? ["/d", "/s", "/c", [npxCommand, ...args].join(" ")]
    : args,
  {
    shell: false,
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
