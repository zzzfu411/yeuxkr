import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Isolated, empty learner: never mutates an existing user's browser or learning data.
export async function productVisualRegression(browser, baseUrl, outDir) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const evidence = { layouts: [], themes: [], checks: [] };
  const routes = [
    ["home", "/"], ["courses", "/study"], ["hangul", "/study?view=hangul"],
    ["vocabulary", "/study?view=vocabulary"], ["grammar", "/study?view=grammar"],
    ["listening", "/study?view=listening"], ["expression", "/study?view=expression"],
    ["review", "/practice"], ["mistakes", "/practice?view=mistakes"],
    ["quiz", "/practice?view=quiz"], ["settings", "/settings"], ["onboarding", "/onboarding"]
  ];
  const open = async path => {
    await page.goto(baseUrl + path, { waitUntil: "networkidle" });
    await page.locator(".studio-loading").waitFor({ state: "hidden" });
    await page.evaluate(() => document.fonts.ready);
  };
  try {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 980 });
      let headerBaseline;
      for (const [name, path] of routes) {
        await open(path);
        const layout = await page.evaluate(() => {
          const box = selector => {
            const el = document.querySelector(selector);
            if (!el || !el.checkVisibility()) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          return {
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            header: [".brand-lockup", ".main-nav", ".my-learning"].map(box),
            firstLesson: box("#core-queue .pl-item"),
            firstExpression: box(".studio-content .pl-item"),
            syllableButton: box('button[aria-label^="播放音节"]')
          };
        });
        assert.ok(layout.scrollWidth <= width, `${name}: no horizontal page overflow`);
        if (name === "home") headerBaseline = layout.header;
        else assert.deepEqual(layout.header, headerBaseline, `${name}: header position and size are consistent`);
        if (width === 390 && name === "courses") assert.ok(layout.firstLesson?.y < 600, "first course is visible without a screen of introductory panels");
        if (width === 390 && name === "expression") assert.ok(layout.firstExpression?.y < 780, "first expression is visible in the initial phone viewport");
        if (width === 390 && ["vocabulary", "grammar"].includes(name)) assert.ok(layout.firstExpression?.y < 780, "the library starts with learning content, not repeated filter statistics");
        if (width === 390 && name === "hangul") assert.ok(layout.syllableButton?.y < 700, "syllable practice is available in the first phone viewport");
        if (["review", "mistakes", "quiz"].includes(name)) {
          assert.equal(await page.locator('.studio-content a[href="/onboarding"]').count(), 1, "empty practice has one useful starting action");
          assert.equal(await page.locator(".studio-content .surface .surface").count(), 0, "empty practice has no nested panels");
        }
        await page.screenshot({ path: fileURLToPath(new URL(`product-${name}-${width}.png`, outDir)) });
        evidence.layouts.push({ width, name, ...layout });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open("/study?view=hangul");
    await page.getByRole("button", { name: "播放音节 한，结构 ㅎ 加 ㅏ 加 ㄴ" }).click();
    await page.getByText("ㅎ + ㅏ + ㄴ = 한", { exact: true }).waitFor();
    await page.getByText("按主题查找字母与发音", { exact: true }).click();
    await page.getByRole("link", { name: "音变规则", exact: true }).click();
    await page.waitForFunction(() => location.hash === "#hangul-sound-changes");
    evidence.checks.push("All syllable examples remain selectable; the topic directory reaches sound-change lessons");

    for (const theme of ["yuan", "yue", "qing", "ye"]) {
      for (const [name, path] of [["home", "/"], ["listening", "/study?view=listening"]]) {
        await open(path);
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        await page.screenshot({ animations: "disabled", path: fileURLToPath(new URL(`product-${name}-${theme}.png`, outDir)) });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        evidence.themes.push({ name, theme });
      }
    }
    assert.deepEqual(errors, [], "product views have no uncaught browser errors");
    writeFileSync(new URL("product-visual-validation.json", outDir), JSON.stringify(evidence, null, 2));
  } finally { await context.close(); }
  console.log("Product visual regression passed: 24 page layouts, 4 themes, consistent navigation, first-screen content and Hangul navigation.");
}

if (process.argv[1]?.endsWith("product-visual-regression.mjs")) {
  if (!process.env.KIRINA_URL) throw new Error("Set KIRINA_URL to the local preview.");
  const { chromium } = await import("playwright");
  const outDir = new URL("../.browser-check/", import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try { await productVisualRegression(browser, process.env.KIRINA_URL, outDir); }
  finally { await browser.close(); }
}
