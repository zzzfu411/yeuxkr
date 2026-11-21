import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function recoveryRegression(browser, baseUrl, outDir) {
  const evidence = [];
  for (const action of ["重新加载", "回到学习"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/study`, { waitUntil: "networkidle" });
      await page.locator(".studio-loading").waitFor({ state: "hidden" });
      await page.route("**/_next/static/chunks/*.js", (route) => route.abort());
      await page.getByRole("navigation", { name: "学习栏目", exact: true }).getByRole("link", { name: "听说", exact: true }).click();
      await page.getByRole("heading", { name: "这页没有顺利打开", exact: true }).waitFor();
      await page.screenshot({ path: fileURLToPath(new URL("audit2-recovery-390.png", outDir)) });
      await page.unroute("**/_next/static/chunks/*.js");
      await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: action, exact: true }).click()]);
      await page.getByRole("heading", { name: "学习", exact: true }).waitFor();
      await page.locator(".studio-loading").waitFor({ state: "hidden" });
      assert.equal(await page.getByRole("heading", { name: "这页没有顺利打开" }).count(), 0);
      evidence.push({ action, recovered: true, route: new URL(page.url()).pathname + new URL(page.url()).search });
      const response = await page.goto(`${baseUrl}/a-page-that-does-not-exist`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 404);
      await page.getByRole("heading", { name: "这页暂时找不到了", exact: true }).waitFor();
      await page.getByRole("link", { name: "回到学习", exact: true }).click();
      await page.getByRole("heading", { name: "学习", exact: true }).waitFor();
    } finally { await context.close(); }
  }
  writeFileSync(new URL("audit2-recovery.json", outDir), JSON.stringify(evidence, null, 2));
  console.log("Recovery regression passed: failed lazy chunks recover by retry and return; Chinese 404 preserves its HTTP status.");
}
