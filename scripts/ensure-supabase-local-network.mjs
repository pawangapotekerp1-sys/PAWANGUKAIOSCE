import { spawnSync } from "node:child_process";

const networkName = "supabase-localhost";
const networkOption = "com.docker.network.bridge.host_binding_ipv4=127.0.0.1";

function runDocker(args, options = {}) {
  const result = spawnSync("docker", args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

const inspectResult = runDocker(["network", "inspect", networkName]);

if (inspectResult.status === 0) {
  console.log(`Docker network "${networkName}" already exists.`);
  process.exit(0);
}

const createResult = spawnSync(
  "docker",
  ["network", "create", "-o", networkOption, networkName],
  {
    stdio: "inherit",
    encoding: "utf8",
  },
);

if (createResult.error) {
  throw createResult.error;
}

if (createResult.status !== 0) {
  process.exit(createResult.status ?? 1);
}

console.log(`Docker network "${networkName}" created.`);
