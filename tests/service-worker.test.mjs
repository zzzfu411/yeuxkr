import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function createResponse(body, ok = true) {
  return {
    ok,
    body,
    clone() {
      return createResponse(body, ok);
    }
  };
}

function loadServiceWorker({
  cachedResponse,
  networkResponse = createResponse("network"),
  networkReject = false,
  addFailurePaths = [],
  initialEntries = {},
  initialCacheKeys = [],
  putReject = false
} = {}) {
  const listeners = {};
  const cacheStore = new Map(Object.entries(initialEntries));
  const addCalls = [];
  const fetchCalls = [];
  const deleteCalls = [];
  let skipWaitingCalled = false;
  if (cachedResponse) cacheStore.set("https://kirina.test/assets/generated/workspace.webp", cachedResponse);
  const addFailures = new Set(addFailurePaths);

  const context = {
    self: {
      location: { origin: "https://kirina.test" },
      addEventListener(type, handler) {
        listeners[type] = handler;
      },
      skipWaiting() {
        skipWaitingCalled = true;
        return Promise.resolve();
      },
      clients: {
        claim() {
          return Promise.resolve();
        }
      }
    },
    caches: {
      open() {
        return Promise.resolve({
          add(asset) {
            addCalls.push(asset);
            if (addFailures.has(asset)) return Promise.reject(new Error(`failed ${asset}`));
            cacheStore.set(asset, createResponse(`cached ${asset}`));
            return Promise.resolve();
          },
          put(request, response) {
            if (putReject) return Promise.reject(new Error("put failed"));
            cacheStore.set(request.url ?? request, response);
            return Promise.resolve();
          },
          match(request) {
            return Promise.resolve(cacheStore.get(request.url ?? request));
          }
        });
      },
      match(request) {
        return Promise.resolve(cacheStore.get(request.url ?? request));
      },
      keys() {
        return Promise.resolve(initialCacheKeys);
      },
      delete(key) {
        deleteCalls.push(key);
        return Promise.resolve(true);
      }
    },
    fetch(request) {
      fetchCalls.push(request.url ?? request);
      if (networkReject) return Promise.reject(new Error("offline"));
      const response = typeof networkResponse === "function" ? networkResponse(request) : networkResponse;
      return Promise.resolve(response);
    },
    URL,
    Response: {
      error() {
        return createResponse("error", false);
      }
    },
    Promise
  };
  context.globalThis = context;
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), context);
  return {
    listeners,
    cacheStore,
    addCalls,
    fetchCalls,
    deleteCalls,
    get skipWaitingCalled() {
      return skipWaitingCalled;
    }
  };
}

test("service worker revalidates cached non-hashed local assets", async () => {
  const cached = createResponse("old visual");
  const fresh = createResponse("fresh visual");
  const { listeners, cacheStore } = loadServiceWorker({ cachedResponse: cached, networkResponse: fresh });
  const waitUntilPromises = [];
  const event = {
    request: {
      method: "GET",
      mode: "same-origin",
      url: "https://kirina.test/assets/generated/workspace.webp"
    },
    waitUntil(promise) {
      waitUntilPromises.push(promise);
    },
    respondWith(promise) {
      this.responsePromise = promise;
    }
  };

  listeners.fetch(event);

  assert.equal(await event.responsePromise, cached);
  assert.equal(waitUntilPromises.length, 1);
  await Promise.all(waitUntilPromises);
  assert.equal(cacheStore.get(event.request.url).body, "fresh visual");
});

test("service worker install fails when a required offline asset cannot cache", async () => {
  const runtime = loadServiceWorker({ addFailurePaths: ["/offline.html"] });
  const event = {
    waitUntil(promise) {
      this.promise = promise;
    }
  };

  runtime.listeners.install(event);

  await assert.rejects(event.promise, /Required offline assets failed to cache: \/offline\.html/);
  assert.equal(runtime.skipWaitingCalled, false);
  assert.equal(runtime.addCalls.includes("/offline.html"), true);
});

test("service worker install tolerates warm core route and visual cache failures", async () => {
  const runtime = loadServiceWorker({ addFailurePaths: ["/path", "/assets/generated/hero.webp"] });
  const event = {
    waitUntil(promise) {
      this.promise = promise;
    }
  };

  runtime.listeners.install(event);
  await event.promise;

  assert.equal(runtime.skipWaitingCalled, false);
  assert.equal(runtime.addCalls.includes("/"), true);
  assert.equal(runtime.addCalls.includes("/path"), true);
  assert.equal(runtime.addCalls.includes("/assets/generated/hero.webp"), true);
});

test("service worker install tolerates optional lesson cache failures", async () => {
  const runtime = loadServiceWorker({ addFailurePaths: ["/learn/l30-native-capstone"] });
  const event = {
    waitUntil(promise) {
      this.promise = promise;
    }
  };

  runtime.listeners.install(event);
  await event.promise;

  assert.equal(runtime.skipWaitingCalled, false);
  assert.equal(runtime.addCalls.includes("/"), true);
  assert.equal(runtime.addCalls.includes("/learn/l30-native-capstone"), true);
});

test("service worker activates a waiting update only after a skip-waiting message", async () => {
  const runtime = loadServiceWorker();
  const waitUntilPromises = [];
  const event = {
    data: { type: "SKIP_WAITING" },
    waitUntil(promise) {
      waitUntilPromises.push(promise);
    }
  };

  runtime.listeners.message(event);

  await Promise.all(waitUntilPromises);
  assert.equal(runtime.skipWaitingCalled, true);
});

test("service worker activate deletes only old Kirina caches", async () => {
  const currentCacheName = readFileSync("public/sw.js", "utf8").match(/const CACHE_NAME = "([^"]+)";/)?.[1];
  const runtime = loadServiceWorker({
    initialCacheKeys: [
      "other-app-cache",
      "kirina-korean-next-old",
      currentCacheName
    ]
  });
  const event = {
    waitUntil(promise) {
      this.promise = promise;
    }
  };

  runtime.listeners.activate(event);
  await event.promise;

  assert.deepEqual(runtime.deleteCalls, ["kirina-korean-next-old"]);
});

test("service worker offline navigation falls back to the cached pathname", async () => {
  const cachedRoute = createResponse("cached grammar route");
  const runtime = loadServiceWorker({
    networkReject: true,
    initialEntries: {
      "/grammar": cachedRoute,
      "/offline.html": createResponse("offline fallback")
    }
  });
  const event = {
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://kirina.test/grammar?offline-smoke=1"
    },
    waitUntil() {},
    respondWith(promise) {
      this.responsePromise = promise;
    }
  };

  runtime.listeners.fetch(event);

  assert.equal(await event.responsePromise, cachedRoute);
});

test("service worker returns static network responses even when runtime cache writes fail", async () => {
  const network = createResponse("fresh chunk");
  const runtime = loadServiceWorker({ networkResponse: network, putReject: true });
  const waitUntilPromises = [];
  const event = {
    request: {
      method: "GET",
      mode: "same-origin",
      url: "https://kirina.test/_next/static/chunks/app.js"
    },
    waitUntil(promise) {
      waitUntilPromises.push(promise);
    },
    respondWith(promise) {
      this.responsePromise = promise;
    }
  };

  runtime.listeners.fetch(event);

  assert.equal(await event.responsePromise, network);
  await Promise.all(waitUntilPromises);
});
