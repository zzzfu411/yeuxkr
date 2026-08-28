import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { join } from "node:path";
import { createServer } from "node:net";
import next from "next";

const port = process.env.KIRINA_SMOKE_PORT ?? String(await findFreePort());
const baseUrl = `http://127.0.0.1:${port}`;
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === "string")),
  KIRINA_URL: baseUrl
};

assertFreshBuild();

const app = next({ dev: false, dir: process.cwd(), hostname: "127.0.0.1", port: Number(port) });
await app.prepare();
const handler = app.getRequestHandler();
const server = createHttpServer((request, response) => handler(request, response));
await listen(server, Number(port));

try {
  await waitReady();
  await run(["scripts/http-smoke.mjs", `--base=${baseUrl}`]);
  await run(["scripts/smoke-browser.mjs"]);
} finally {
  await closeServer(server);
  await app.close();
}

function listen(httpServer, serverPort) {
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(serverPort, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
}

function closeServer(httpServer) {
  return new Promise((resolve) => {
    httpServer.close(() => resolve());
    httpServer.closeIdleConnections?.();
    httpServer.closeAllConnections?.();
  });
}

async function waitReady() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("server not ready");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const freePort = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => error ? reject(error) : resolve(freePort));
    });
  });
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
