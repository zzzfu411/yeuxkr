const CACHE_NAME = "kirina-korean-next-9262ca65a5";
const CACHE_PREFIX = "kirina-korean-next-";
const NON_HASHED_ASSET_PREFIXES = ["/assets/"];

const CORE_ASSETS = [
  "/",
  "/onboarding",
  "/settings",
  "/path",
  "/self-study",
  "/hangul",
  "/vocabulary",
  "/grammar",
  "/native",
  "/immersion",
  "/review",
  "/mistakes",
  "/quiz",
  "/manifest.webmanifest",
  "/offline.html",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/icon-maskable-192.png",
  "/assets/icon-maskable-512.png",
  "/assets/generated/hero.webp",
  "/assets/generated/workspace.webp",
  "/assets/generated/path.webp",
  "/assets/generated/self-study.webp",
  "/assets/generated/hangul.webp",
  "/assets/generated/vocabulary.webp",
  "/assets/generated/grammar.webp",
  "/assets/generated/native.webp",
  "/assets/generated/immersion.webp",
  "/assets/generated/quiz.webp",
  "/assets/generated/lesson.webp",
  "/assets/generated/review.webp",
  "/assets/generated/complete.webp",
  "/assets/generated/empty.webp"
];

const REQUIRED_CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/offline.html",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/icon-maskable-192.png",
  "/assets/icon-maskable-512.png"
];

const OPTIONAL_ASSETS = [
  "/learn/l01-hangul-map",
  "/learn/l02-vowels",
  "/learn/l03-consonants",
  "/learn/l04-first-sentences",
  "/learn/l05-particles",
  "/learn/l06-cafe",
  "/learn/l07-location",
  "/learn/l11-shopping-price",
  "/learn/l08-past",
  "/learn/l09-connectors",
  "/learn/l12-time-plans",
  "/learn/l13-permission",
  "/learn/l14-progressive",
  "/learn/l15-comparison",
  "/learn/l16-because",
  "/learn/l17-phone-message",
  "/learn/l18-health",
  "/learn/l19-family-honorific",
  "/learn/l20-invitation",
  "/learn/l21-slow-news",
  "/learn/l22-media-shadowing",
  "/learn/l23-social-posts",
  "/learn/l24-opinion-paragraph",
  "/learn/l25-retelling",
  "/learn/l26-indirect-speech",
  "/learn/l27-honorific-register",
  "/learn/l10-native-softeners",
  "/learn/l28-soft-refusal",
  "/learn/l29-abstract-discussion",
  "/learn/l30-native-capstone"
];

function cacheResponse(request, response) {
  if (!response.ok) return Promise.resolve();
  const copy = response.clone();
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

function revalidateCachedResponse(request) {
  return fetch(request)
    .then((response) => {
      cacheResponse(request, response);
      return response;
    })
    .catch(() => null);
}

async function addToCache(cache, asset) {
  try {
    await cache.add(asset);
    return { asset, ok: true };
  } catch {
    return { asset, ok: false };
  }
}

async function precacheStaticDependencies(cache, assets) {
  const htmlAssets = assets.filter((asset) => asset === "/" || asset.endsWith(".html") || !asset.includes("."));
  const dependencies = new Set();
  for (const asset of htmlAssets) {
    const response = await cache.match(asset);
    if (!response || typeof response.text !== "function") continue;
    const html = await response.text().catch(() => "");
    for (const match of html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)) {
      dependencies.add(new URL(match[1], self.location.origin).pathname);
    }
  }
  await Promise.allSettled([...dependencies].map((asset) => addToCache(cache, asset)));
}

async function precacheAssets(cache) {
  const requiredResults = await Promise.all(REQUIRED_CORE_ASSETS.map((asset) => addToCache(cache, asset)));
  const failedRequiredAssets = requiredResults.filter((result) => !result.ok).map((result) => result.asset);
  if (failedRequiredAssets.length) {
    throw new Error(`Required offline assets failed to cache: ${failedRequiredAssets.join(", ")}`);
  }
  const warmCoreAssets = CORE_ASSETS.filter((asset) => !REQUIRED_CORE_ASSETS.includes(asset));
  const warmCoreResults = await Promise.allSettled(warmCoreAssets.map((asset) => addToCache(cache, asset)));
  const cachedWarmCoreAssets = warmCoreResults
    .filter((result) => result.status === "fulfilled" && result.value.ok)
    .map((result) => result.value.asset);
  await precacheStaticDependencies(cache, [...REQUIRED_CORE_ASSETS, ...cachedWarmCoreAssets]);
  const optionalResults = await Promise.allSettled(OPTIONAL_ASSETS.map((asset) => addToCache(cache, asset)));
  const cachedOptionalAssets = optionalResults
    .filter((result) => result.status === "fulfilled" && result.value.ok)
    .map((result) => result.value.asset);
  await precacheStaticDependencies(cache, cachedOptionalAssets);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => precacheAssets(cache))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          event.waitUntil(cacheResponse(event.request, response));
          return response;
        })
        .catch(() => matchNavigationFallback(event.request, url.pathname))
    );
    return;
  }

  const isNonHashedAsset = NON_HASHED_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    isNonHashedAsset ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/sw.js";

  if (!isStaticAsset) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached ?? Response.error())));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        if (isNonHashedAsset) event.waitUntil(revalidateCachedResponse(event.request));
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          event.waitUntil(cacheResponse(event.request, response));
          return response;
        })
        .catch(() => Response.error());
    })
  );
});

function matchNavigationFallback(request, pathname) {
  return caches.match(request)
    .then((cached) => cached ?? caches.match(pathname))
    .then((cached) => cached ?? caches.match("/offline.html"));
}
