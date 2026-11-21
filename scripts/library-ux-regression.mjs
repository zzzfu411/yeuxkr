import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

export async function libraryUxRegression(browser, baseUrl, outDir) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  const evidence = { checks: [], facets: {} };
  page.on("pageerror", error => errors.push(error.message));
  const open = async view => {
    await page.goto(`${baseUrl}/study?view=${view}`, { waitUntil: "networkidle" });
    await page.locator("input[type=search]").waitFor();
  };
  try {
    await open("expression");
    assert.equal(await page.locator(".pl-item button[aria-expanded=true]").count(), 1);
    assert.equal(await page.locator(".filter-disclosure").getAttribute("open"), null);
    const retell = "이것은 다음에 이어서 쓸 연습 문장입니다.";
    const transfer = "친구에게는 조금 더 편하게 말하고 싶어요.";
    const search = page.getByLabel("搜索表达", { exact: true });
    await page.getByLabel("韩语复述", { exact: true }).first().fill(retell);
    await page.getByLabel("换一种关系", { exact: true }).first().fill(transfer);
    await search.fill("___no_results___");
    await page.getByText("没有匹配的表达", { exact: true }).waitFor();
    await search.fill("");
    assert.equal(await page.getByLabel("韩语复述", { exact: true }).first().inputValue(), retell);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.getByLabel("换一种关系", { exact: true }).first().inputValue(), transfer);
    await page.getByRole("link", { name: "听读", exact: true }).click();
    await page.locator("#current-material-heading").waitFor();
    await page.goBack({ waitUntil: "networkidle" });
    assert.equal(await page.getByLabel("韩语复述", { exact: true }).first().inputValue(), retell);
    const persisted = await page.evaluate(() => {
      const drafts = JSON.parse(localStorage.getItem("kirina.drafts.v1") ?? "{}");
      const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
      return { count: Object.keys(drafts.nativeExpressions ?? {}).length, learned: progress.learnedNative ?? [] };
    });
    assert.equal(persisted.count, 1);
    assert.equal(persisted.learned.length, 0, "drafts must not grant mastery or SRS credit");
    evidence.checks.push("One expanded expression; drafts survive filtering, reload, and navigation without learning credit");

    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      window.__restoreExpressionStorage = () => { Storage.prototype.setItem = original; };
      Storage.prototype.setItem = function (key, value) {
        if (key === "kirina.drafts.v1") throw new DOMException("Storage is full", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });
    const edited = `${retell} 계속 써요.`;
    await page.getByLabel("韩语复述", { exact: true }).first().fill(edited);
    await page.getByRole("alert").filter({ hasText: "草稿没有保存到本机" }).waitFor();
    assert.equal(await page.getByLabel("韩语复述", { exact: true }).first().inputValue(), edited);
    await page.evaluate(() => window.__restoreExpressionStorage());
    await page.getByRole("button", { name: "重试", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.getByLabel("韩语复述", { exact: true }).first().inputValue(), edited);
    evidence.checks.push("Failed draft write keeps live text and retry persists it");

    for (const view of ["grammar", "vocabulary", "expression"]) {
      await open(view);
      await page.locator(".filter-disclosure summary").click();
      const levels = page.getByRole("radiogroup", { name: /层级$/ });
      await levels.waitFor();
      const radios = levels.getByRole("radio");
      const before = await radios.allTextContents();
      await radios.nth(1).click();
      const after = await radios.allTextContents();
      assert.deepEqual(after, before, `${view}: selecting a level must not label other available levels as zero`);
      await radios.nth(2).click();
      assert.equal(await radios.nth(2).getAttribute("aria-checked"), "true");
      await radios.nth(2).press("Home");
      assert.equal(await radios.first().getAttribute("aria-checked"), "true");
      evidence.facets[view] = before;
    }
    evidence.checks.push("Facet alternatives retain truthful counts; keyboard selection works in all three libraries");
    assert.deepEqual(errors, []);
    writeFileSync(new URL("library-ux-regression.json", outDir), JSON.stringify(evidence, null, 2));
  } finally { await context.close(); }
  console.log("Library UX regression passed: expression drafts, failure recovery, progressive disclosure, and three libraries' filter counts.");
}

if (process.argv[1]?.endsWith("library-ux-regression.mjs")) {
  const baseUrl = process.env.KIRINA_URL;
  if (!baseUrl) throw new Error("Set KIRINA_URL to the intended local Kirina server.");
  const { chromium } = await import("playwright");
  const outDir = new URL("../output/playwright/", import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try { await libraryUxRegression(browser, baseUrl, outDir); } finally { await browser.close(); }
}
