import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const port = process.env.KIRINA_SMOKE_PORT ?? "3108";
const baseUrl = `http://127.0.0.1:${port}`;
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === "string")),
  KIRINA_URL: baseUrl
};

await run(["scripts/sw-revision.mjs", "--check"]);
assertFreshBuild();

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
  stdio: ["ignore", "pipe", "pipe"],
  env,
  shell: false
});
let log = "";
server.stdout.on("data", (chunk) => {
  log += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  log += chunk.toString();
});

try {
  await waitReady();
  await run(["scripts/http-smoke.mjs", `--base=${baseUrl}`]);
  await run(["scripts/smoke-browser.mjs"]);
  await run(["scripts/smoke-offline.mjs"]);
} finally {
  server.kill("SIGTERM");
  await delay(1000);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function waitReady() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    if (server.exitCode !== null) throw new Error(`server exited early\n${log}`);
    await delay(500);
  }
  throw new Error(`server not ready\n${log}`);
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", env, shell: false });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`node ${args.join(" ")} exited ${code}`)));
    child.on("error", reject);
  });
}

function assertFreshBuild() {
  const buildMarker = ".next/BUILD_ID";
  if (!existsSync(buildMarker)) {
    console.error("Missing .next/BUILD_ID. Run `npm run build` before `npm run check:smoke`.");
    process.exit(1);
  }

  const buildTime = statSync(buildMarker).mtimeMs;
  const watched = [
    "src",
    "next.config.mjs",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.mjs"
  ];
  const newest = newestMtime(watched);
  const toleranceMs = 1500;
  if (newest.mtimeMs > buildTime + toleranceMs) {
    console.error(
      [
        "The production build is older than application source files.",
        `Newest source: ${newest.path}`,
        "Run `npm run build` or `npm run check` before `npm run check:smoke`."
      ].join("\n")
    );
    process.exit(1);
  }
}

function newestMtime(paths) {
  let newest = { path: "", mtimeMs: 0 };
  for (const path of paths) {
    if (!existsSync(path)) continue;
    newest = newer(newest, newestMtimeForPath(path));
  }
  return newest;
}

function newestMtimeForPath(path) {
  const stat = statSync(path);
  if (!stat.isDirectory()) return { path, mtimeMs: stat.mtimeMs };

  let newest = { path, mtimeMs: stat.mtimeMs };
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === ".next" || entry.name === "node_modules") continue;
    newest = newer(newest, newestMtimeForPath(join(path, entry.name)));
  }
  return newest;
}

function newer(a, b) {
  return b.mtimeMs > a.mtimeMs ? b : a;
}
