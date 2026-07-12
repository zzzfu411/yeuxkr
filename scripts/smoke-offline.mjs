import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lessons } from "../src/data/curriculum.js";
import { visualAssets } from "../src/data/visuals/assets.ts";

const baseUrl = process.env.KIRINA_URL;
if (!baseUrl) {
  console.error("Set KIRINA_URL so offline smoke cannot hit another local app by accident.");
  process.exit(1);
}

const outDir = new URL("../.browser-check/", import.meta.url);
const playwrightEntry = process.env.PLAYWRIGHT_ENTRY ?? "playwright";
let chromium;
try {
  ({ chromium } = await import(playwrightEntry));
} catch (error) {
  console.error(`Offline smoke requires Playwright (${error.code ?? error.message}). Install it or set PLAYWRIGHT_ENTRY to an available package.`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "allow" });
const page = await context.newPage();
const issues = [];
const allLessonRoutes = lessons.map((lesson) => `/learn/${lesson.id}`);

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
});
page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));

await page.goto(baseUrl, { waitUntil: "networkidle" });
const serviceWorkerReady = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return false;
  await navigator.serviceWorker.ready;
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(async (name) => {
    const cache = await caches.open(name);
    await cache.match("/");
  }));
  return cacheNames.length > 0;
}).catch(() => false);
if (!serviceWorkerReady) issues.push("service worker should install and create a cache before offline checks");
const missingCachedLessonRoutes = await page.evaluate(async (routes) => {
  const cacheNames = await caches.keys();
  const missing = [];
  for (const route of routes) {
    let found = false;
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      if (await cache.match(route)) {
        found = true;
        break;
      }
    }
    if (!found) missing.push(route);
  }
  return missing;
}, allLessonRoutes).catch((error) => [`cache inspection failed: ${error.message}`]);
if (missingCachedLessonRoutes.length) {
  issues.push(`offline lesson cache missing routes: ${missingCachedLessonRoutes.join(", ")}`);
}

await context.setOffline(true);

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  window.__kirinaOfflineMarker = "kept";
});
await page.getByRole("link", { name: "路径" }).click();
await page.waitForURL("**/path", { waitUntil: "domcontentloaded" }).catch((error) => {
  issues.push(`offline client navigation to path failed: ${error.message}`);
});
await page.getByRole("link", { name: /韩文不是字母表/ }).first().click();
await page.waitForURL("**/learn/l01-hangul-map", { waitUntil: "domcontentloaded" }).catch((error) => {
  issues.push(`offline client navigation to lesson failed: ${error.message}`);
});
const marker = await page.evaluate(() => window.__kirinaOfflineMarker).catch(() => null);
if (marker !== "kept") issues.push("offline Link navigation should not force a full page reload");
const lessonTitle = await page.locator("h1").first().textContent({ timeout: 5000 }).catch(() => null);
if (!lessonTitle?.includes("韩文不是字母表")) issues.push("offline lesson navigation should render lesson content");
await completeFirstLessonOffline(page, issues);

const coreRoutes = ["/", "/path", "/self-study", "/hangul", "/vocabulary", "/grammar", "/native", "/immersion", "/review", "/mistakes", "/quiz"];
const sampledLessons = [
  lessons[0],
  lessons[Math.floor(lessons.length / 2)],
  lessons[lessons.length - 1]
].filter(Boolean);
const offlineRoutes = [...coreRoutes, ...sampledLessons.map((lesson) => `/learn/${lesson.id}`)];

for (const route of offlineRoutes) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" }).catch((error) => {
    issues.push(`offline navigation failed for ${route}: ${error.message}`);
    return null;
  });
  if (!response?.ok()) issues.push(`offline navigation returned ${response?.status() ?? "no response"} for ${route}`);
  const h1 = await page.locator("h1").first().textContent({ timeout: 5000 }).catch(() => null);
  if (!h1?.trim()) issues.push(`offline route missing h1 for ${route}`);
  const lesson = sampledLessons.find((item) => route === `/learn/${item.id}`);
  if (lesson && !h1?.includes(lesson.title)) issues.push(`offline lesson route ${route} rendered ${h1 ?? "no title"}`);
}

for (const asset of Object.values(visualAssets).filter((item) => item.src.endsWith(".webp"))) {
  const imageResponse = await page.goto(`${baseUrl}${asset.src}`, { waitUntil: "domcontentloaded" }).catch((error) => {
    issues.push(`offline generated image ${asset.id} failed: ${error.message}`);
    return null;
  });
  if (!imageResponse?.ok()) issues.push(`offline generated image ${asset.id} returned ${imageResponse?.status() ?? "no response"}`);
}

const queryRouteResponse = await page.goto(`${baseUrl}/grammar?offline-smoke=1`, { waitUntil: "domcontentloaded" }).catch((error) => {
  issues.push(`offline cached-path query fallback failed: ${error.message}`);
  return null;
});
if (!queryRouteResponse?.ok()) issues.push(`offline cached-path query fallback returned ${queryRouteResponse?.status() ?? "no response"}`);
const queryRouteTitle = await page.locator("h1").first().textContent({ timeout: 5000 }).catch(() => null);
if (!queryRouteTitle?.includes("语法")) issues.push("offline cached-path query should render the cached route by pathname");

const fallbackResponse = await page.goto(`${baseUrl}/offline.html`, { waitUntil: "domcontentloaded" }).catch((error) => {
  issues.push(`offline fallback failed: ${error.message}`);
  return null;
});
if (!fallbackResponse?.ok()) issues.push(`offline fallback returned ${fallbackResponse?.status() ?? "no response"}`);
await page.screenshot({ path: fileURLToPath(new URL("offline-smoke.png", outDir)), fullPage: true });

await browser.close();

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("Offline smoke passed. Screenshot written to .browser-check/offline-smoke.png.");

async function completeFirstLessonOffline(page, issues) {
  try {
    await page.locator('input[type="radio"][value="ㄱ + ㅏ"]').check({ timeout: 5000 });
    await page.getByRole("button", { name: "提交" }).click();
    await page.getByText("答对了").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "下一题" }).click();

    await page.locator('input[type="radio"][value="ㄴ"]').check({ timeout: 5000 });
    await page.getByRole("button", { name: "提交" }).click();
    await page.getByText("答对了").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "下一题" }).click();

    await page.getByLabel("输入答案").fill("고");
    await page.getByRole("button", { name: "提交" }).click();
    await page.getByText("答对了").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "完成课程" }).click();
    await page.getByRole("button", { name: "继续" }).click();
    await page.getByText("课程成绩已保存").waitFor({ timeout: 5000 });

    const saved = await page.evaluate(() => {
      const progress = JSON.parse(window.localStorage.getItem("kirina.progress.v2") || "{}");
      const srs = JSON.parse(window.localStorage.getItem("kirina.srs.v2") || "{}");
      const lessonCards = Object.keys(srs.cards ?? {}).filter((id) => id.startsWith("lesson:l01-hangul-map:"));
      return {
        completed: Array.isArray(progress.completedLessons) && progress.completedLessons.includes("l01-hangul-map"),
        score: Number(progress.lessonScores?.["l01-hangul-map"] ?? 0),
        lessonCards: lessonCards.length
      };
    });
    if (!saved.completed || saved.score < 65) {
      issues.push(`offline lesson completion did not persist progress: completed=${saved.completed}, score=${saved.score}`);
    }
    if (saved.lessonCards < 3) {
      issues.push(`offline lesson completion should create lesson SRS cards, found ${saved.lessonCards}`);
    }
  } catch (error) {
    issues.push(`offline lesson drill completion failed: ${error.message}`);
  }
}
