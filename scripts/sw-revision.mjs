import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { lessons } from "../src/data/curriculum.js";

export const CACHE_PREFIX = "kirina-korean-next";
const DEFAULT_SW_PATH = "public/sw.js";
const REVISION_SOURCE_PATTERN = /\.(tsx|ts|jsx|js|mjs|css)$/;

export function buildOfflineRoutes(lessonItems = lessons) {
  const routes = {
    "/": "src/app/page.tsx",
    "/onboarding": "src/app/onboarding/page.tsx",
    "/settings": "src/app/settings/page.tsx",
    "/path": "src/app/path/page.tsx",
    "/self-study": "src/app/self-study/page.tsx",
    "/hangul": "src/app/hangul/page.tsx",
    "/vocabulary": "src/app/vocabulary/page.tsx",
    "/grammar": "src/app/grammar/page.tsx",
    "/native": "src/app/native/page.tsx",
    "/immersion": "src/app/immersion/page.tsx",
    "/review": "src/app/review/page.tsx",
    "/mistakes": "src/app/mistakes/page.tsx",
    "/quiz": "src/app/quiz/page.tsx"
  };
  for (const lesson of lessonItems) {
    routes[`/learn/${lesson.id}`] = "src/app/learn/[lessonId]/page.tsx";
  }
  return routes;
}

export function serviceWorkerCoreAssetBlock(swSource) {
  return swSource.match(/const CORE_ASSETS = \[([\s\S]*?)\];/)?.[1] ?? "";
}

export function serviceWorkerOptionalAssetBlock(swSource) {
  return swSource.match(/const OPTIONAL_ASSETS = \[([\s\S]*?)\];/)?.[1] ?? "";
}

export function serviceWorkerCacheName(swSource) {
  return swSource.match(/const CACHE_NAME = "([^"]+)";/)?.[1] ?? "";
}

export function lessonOfflineAssets(offlineRoutes = buildOfflineRoutes()) {
  return Object.keys(offlineRoutes).filter((route) => route.startsWith("/learn/"));
}

export function expectedOptionalAssetBlock(offlineRoutes = buildOfflineRoutes()) {
  return formatConstArray("OPTIONAL_ASSETS", lessonOfflineAssets(offlineRoutes));
}

export function syncServiceWorkerOptionalAssets(swSource, offlineRoutes = buildOfflineRoutes()) {
  const nextBlock = expectedOptionalAssetBlock(offlineRoutes);
  const nextSource = swSource.replace(/const OPTIONAL_ASSETS = \[[\s\S]*?\];/, nextBlock);
  if (nextSource === swSource && serviceWorkerOptionalAssetBlock(swSource) !== serviceWorkerOptionalAssetBlock(nextBlock)) {
    throw new Error("Could not update OPTIONAL_ASSETS in service worker");
  }
  return nextSource;
}

export function serviceWorkerRevisionSource(swSource = readServiceWorker()) {
  return swSource.replace(/const CACHE_NAME = "[^"]+";/, 'const CACHE_NAME = "__REVISION_PLACEHOLDER__";');
}

export function listRevisionFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...listRevisionFiles(path));
    else if (REVISION_SOURCE_PATTERN.test(entry)) files.push(path);
  }
  return files;
}

export function coreOfflineRevision(coreAssetBlock, offlineRoutes = buildOfflineRoutes(), swSource = readServiceWorker()) {
  const hash = createHash("sha256");
  hash.update("public/sw.js");
  hash.update("\0");
  hash.update(serviceWorkerRevisionSource(swSource));
  hash.update("\0");
  const publicFiles = [...coreAssetBlock.matchAll(/"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((asset) => !offlineRoutes[asset])
    .map((asset) => `public/${asset.slice(1)}`);
  const files = [...new Set([...listRevisionFiles("src"), ...publicFiles])].sort();
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 10);
}

export function expectedCacheName(swSource = readServiceWorker(), offlineRoutes = buildOfflineRoutes()) {
  return `${CACHE_PREFIX}-${coreOfflineRevision(serviceWorkerCoreAssetBlock(swSource), offlineRoutes, swSource)}`;
}

export function readServiceWorker(swPath = DEFAULT_SW_PATH) {
  return readFileSync(swPath, "utf8");
}

export function updateServiceWorkerCacheName(swPath = DEFAULT_SW_PATH, offlineRoutes = buildOfflineRoutes()) {
  const source = syncServiceWorkerOptionalAssets(readServiceWorker(swPath), offlineRoutes);
  const nextName = expectedCacheName(source, offlineRoutes);
  const nextSource = source.replace(/const CACHE_NAME = "[^"]+";/, `const CACHE_NAME = "${nextName}";`);
  if (nextSource === source && serviceWorkerCacheName(source) !== nextName) {
    throw new Error(`Could not update CACHE_NAME in ${swPath}`);
  }
  writeFileSync(swPath, nextSource);
  return nextName;
}

function assertServiceWorkerFresh(swPath = DEFAULT_SW_PATH) {
  if (!existsSync(swPath)) throw new Error(`Missing service worker: ${swPath}`);
  const source = readServiceWorker(swPath);
  const expectedOptionalBlock = serviceWorkerOptionalAssetBlock(expectedOptionalAssetBlock());
  const actualOptionalBlock = serviceWorkerOptionalAssetBlock(source);
  if (actualOptionalBlock.trim() !== expectedOptionalBlock.trim()) {
    throw new Error("Service worker OPTIONAL_ASSETS is stale; run npm run sw:update");
  }
  const actual = serviceWorkerCacheName(source);
  const expected = expectedCacheName(source);
  if (actual !== expected) {
    throw new Error(`Service worker cache name is stale: ${actual || "(missing)"}; expected ${expected}`);
  }
  return expected;
}

function formatConstArray(name, values) {
  const entries = values.map((value) => `  "${value}"`).join(",\n");
  return `const ${name} = [\n${entries}\n];`;
}

async function runCli() {
  const command = process.argv[2] ?? "--print";
  if (command === "--write") {
    console.log(updateServiceWorkerCacheName());
    return;
  }
  if (command === "--check") {
    console.log(assertServiceWorkerFresh());
    return;
  }
  if (command === "--print") {
    console.log(expectedCacheName());
    return;
  }
  console.error("Usage: node scripts/sw-revision.mjs [--print|--check|--write]");
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
