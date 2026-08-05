import { spawn } from "node:child_process";
import path from "node:path";

const storageHealthTimeoutMs = 180_000;
const storagePollIntervalMs = 5_000;

function commandName(name) {
  return process.platform === "win32" && (name === "npm" || name === "npx")
    ? `${name}.cmd`
    : name;
}

function projectContainerSuffix() {
  return path.basename(process.cwd()).replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function run(command, args, { capture = false, stream = true } = {}) {
  return new Promise((resolve) => {
    const isWindowsCommandScript = process.platform === "win32" && command.endsWith(".cmd");
    let output = "";
    const finish = (code) => {
      resolve({
        code: code ?? 1,
        output,
      });
    };
    const child = spawn(
      isWindowsCommandScript ? "cmd.exe" : command,
      isWindowsCommandScript
        ? ["/d", "/s", "/c", [command, ...args].join(" ")]
        : args,
      {
        shell: false,
        stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      },
    );

    if (capture) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        if (stream) {
          process.stdout.write(text);
        }
      });
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        if (stream) {
          process.stderr.write(text);
        }
      });
    }

    child.on("error", (error) => {
      output += error.message;
      finish(1);
    });
    child.on("close", finish);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStorageHealth(containerName) {
  const result = await run(commandName("docker"), [
    "inspect",
    containerName,
    "--format",
    "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
  ], {
    capture: true,
    stream: false,
  });

  if (result.code !== 0) {
    return "unknown";
  }

  return result.output.trim().split(/\r?\n/).at(-1)?.trim() || "unknown";
}

async function waitForStorageHealth() {
  const containerName = `supabase_storage_${projectContainerSuffix()}`;
  const deadline = Date.now() + storageHealthTimeoutMs;

  while (Date.now() < deadline) {
    const health = await getStorageHealth(containerName);

    if (health === "healthy") {
      console.log(`Storage container ${containerName} is healthy.`);
      return true;
    }

    console.log(`Storage container ${containerName} is ${health}; waiting...`);
    await sleep(storagePollIntervalMs);
  }

  return false;
}

const networkResult = await run(commandName("node"), ["scripts/ensure-supabase-local-network.mjs"]);

if (networkResult.code !== 0) {
  process.exit(networkResult.code);
}

const resetResult = await run(commandName("npx"), [
  "supabase",
  "db",
  "reset",
  "--network-id",
  "supabase-localhost",
], {
  capture: true,
});

const resetReachedContainerRestart =
  resetResult.output.includes("Seeding data from supabase/seed.sql")
  && /(?:Restarting|Starting) containers/i.test(resetResult.output);

if (resetResult.code === 0) {
  process.exit((await waitForStorageHealth()) ? 0 : 1);
}

if (resetReachedContainerRestart && await waitForStorageHealth()) {
  console.warn("Supabase reset finished migrations and seed; storage became healthy after CLI readiness timeout.");
  process.exit(0);
}

process.exit(resetResult.code);
