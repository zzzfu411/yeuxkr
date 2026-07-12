import test from "node:test";
import assert from "node:assert/strict";
import { coreOfflineRevision, serviceWorkerRevisionSource } from "../scripts/sw-revision.mjs";

const coreAssetBlock = '  "/"';
const offlineRoutes = { "/": "src/app/page.tsx" };
const baseServiceWorker = [
  'const CACHE_NAME = "kirina-korean-next-old";',
  'const CORE_ASSETS = ["/"];',
  'self.addEventListener("fetch", () => {});'
].join("\n");

test("service worker revision ignores only the cache name line", () => {
  const renamed = baseServiceWorker.replace("kirina-korean-next-old", "kirina-korean-next-new");

  assert.equal(serviceWorkerRevisionSource(baseServiceWorker), serviceWorkerRevisionSource(renamed));
  assert.equal(
    coreOfflineRevision(coreAssetBlock, offlineRoutes, baseServiceWorker),
    coreOfflineRevision(coreAssetBlock, offlineRoutes, renamed)
  );
});

test("service worker revision changes when cache strategy code changes", () => {
  const changedStrategy = baseServiceWorker.replace('"fetch"', '"activate"');

  assert.notEqual(
    coreOfflineRevision(coreAssetBlock, offlineRoutes, baseServiceWorker),
    coreOfflineRevision(coreAssetBlock, offlineRoutes, changedStrategy)
  );
});
