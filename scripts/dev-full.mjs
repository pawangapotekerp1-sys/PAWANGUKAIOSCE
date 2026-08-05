import { spawn } from "node:child_process";

function commandName(name) {
  return process.platform === "win32" && (name === "npm" || name === "npx")
    ? `${name}.cmd`
    : name;
}

function spawnCommand(command, args, { label, longRunning = false } = {}) {
  const isWindowsCommandScript = process.platform === "win32" && command.endsWith(".cmd");
  const child = spawn(
    isWindowsCommandScript ? "cmd.exe" : command,
    isWindowsCommandScript
      ? ["/d", "/s", "/c", [command, ...args].join(" ")]
      : args,
    {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );

  const forward = (stream, writer) => {
    stream.on("data", (chunk) => {
      const text = chunk.toString();

      if (!label) {
        writer.write(text);
        return;
      }

      const normalized = text.replace(/\r\n/g, "\n");
      const lines = normalized.split("\n");

      lines.forEach((line, index) => {
        if (!line && index === lines.length - 1) {
          return;
        }

        writer.write(`[${label}] ${line}\n`);
      });
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on("error", (error) => {
    const target = label ? `[${label}] ` : "";
    process.stderr.write(`${target}${error.message}\n`);
  });

  if (!longRunning) {
    child.on("exit", (code) => {
      if ((code ?? 0) !== 0) {
        process.exit(code ?? 1);
      }
    });
  }

  return child;
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on("exit", (code) => {
      resolve(code ?? 0);
    });
  });
}

const trackedChildren = new Set();
let shuttingDown = false;

function registerChild(child) {
  trackedChildren.add(child);
  child.on("exit", () => {
    trackedChildren.delete(child);
  });
  return child;
}

function shutdown(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of trackedChildren) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal);
    setTimeout(() => process.exit(0), 150);
  });
}

const startup = registerChild(spawnCommand(commandName("npm"), ["run", "supabase:start"], {
  label: "supabase:start",
}));
const startupCode = await waitForExit(startup);

if (startupCode !== 0) {
  process.exit(startupCode);
}

const functionsServe = registerChild(spawnCommand(commandName("npm"), ["run", "supabase:functions:serve:qg"], {
  label: "functions",
  longRunning: true,
}));
const frontendDev = registerChild(spawnCommand(commandName("npm"), ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
  label: "frontend",
  longRunning: true,
}));

const exitResults = await Promise.race([
  waitForExit(functionsServe).then((code) => ({ name: "functions", code })),
  waitForExit(frontendDev).then((code) => ({ name: "frontend", code })),
]);

if (!shuttingDown) {
  process.stderr.write(`[dev:full] ${exitResults.name} exited with code ${exitResults.code}. Stopping the remaining process.\n`);
  shutdown();
}

process.exit(exitResults.code);
