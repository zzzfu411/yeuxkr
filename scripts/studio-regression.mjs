import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function studioRegression(browser, baseUrl, outDir) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__studioSpeechStops = 0;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [{lang:"ko-KR", name:"Studio Korean", voiceURI:"studio-ko", localService:true}],
      addEventListener() {}, removeEventListener() {}, speak() {},
      cancel() { window.__studioSpeechStops += 1; }
    }});
  });
  const evidence = { views: [], layouts: [], checks: [] };
  const ready = () => page.waitForFunction(() => {
    const content = document.querySelector(".studio-content");
    return content && content.querySelector("h2") && !content.innerText.includes("正在打开学习内容");
  });
  try {
    for (const [studio, views] of [["study", ["courses","hangul","vocabulary","grammar","listening","expression"]], ["practice", ["review","mistakes","quiz"]]]) {
      for (const view of views) {
        await page.goto(baseUrl + "/" + studio + "?view=" + view, { waitUntil:"networkidle" });
        await ready();
        assert.equal(await page.locator("main h1").count(), 1, studio + "/" + view + " must have one page heading");
        assert.equal(await page.locator('nav[aria-label="主导航"] > a').count(), 3);
        assert.equal(await page.locator("header.app-header details").count(), 0);
        assert.equal(await page.locator(".studio-content .learning-compass").count(), 0);
        assert.equal(await page.locator('nav[aria-label="主导航"] [aria-current="page"]').getAttribute("href"), "/" + studio);
        evidence.views.push(studio + "/" + view);
        if (view === "expression") {
          await page.locator(".filter-disclosure > summary").click();
          assert.equal(await page.getByRole("radio", {name:/基础交际/}).count(), 1);
          assert.equal(await page.getByRole("radio", {name:/foundation/}).count(), 0);
        }
      }
    }

    await page.goto(baseUrl + "/study", {waitUntil:"networkidle"});
    await ready();
    assert.equal(await page.locator("#core-queue .pl-item").count(), 6, "default course space should show six recent lessons");
    assert.equal(await page.locator(".course-background").getAttribute("open"), null);
    await page.getByRole("button", {name:"展开全部课程",exact:true}).click();
    assert.equal(await page.locator("#core-queue .pl-item").count(), 60, "all sixty lessons remain available");
    await page.getByRole("button", {name:"收起路线窗口",exact:true}).click();
    assert.equal(await page.locator("#core-queue .pl-item").count(), 6);
    await page.locator(".course-stages > summary").click();
    await page.locator('.course-stages button[aria-controls="core-queue"]').nth(1).click();
    assert.ok(await page.locator("#core-queue .pl-item").count() > 0, "selecting another stage opens its courses");
    evidence.checks.push("six recent lessons, expand all sixty, collapse and choose another stage");

    await page.goto(baseUrl + "/practice", {waitUntil:"networkidle"});
    await ready();
    assert.equal(await page.getByRole("link", {name:"查看错题本",exact:true}).count(), 0, "the mistakes tab already provides this destination");
    assert.equal(await page.getByRole("heading", {name:"今天该复习什么？",exact:true}).count(), 0, "empty learners do not need an all-zero statistics panel");
    assert.equal(await page.locator('.studio-content a[href="/onboarding"]').count(), 1);
    evidence.checks.push("empty practice has one onboarding action and no duplicate navigation or zero statistics");

    await page.goto(baseUrl + "/study?view=listening&material=im-cafe-real-speed", {waitUntil:"networkidle"});
    await ready();
    const marker = "카페에서 주문해요. 学习空间草稿";
    await page.getByLabel("复述完成").fill(marker);
    await page.waitForFunction(marker => JSON.parse(localStorage.getItem("kirina.drafts.v1") ?? "{}").immersion?.["im-cafe-real-speed"]?.retellEvidence === marker, marker);
    await page.locator("#material-directory > summary").click();
    await page.locator("#material-directory .is-active").getByRole("button", { name:"咖啡店点单听读" }).click();
    assert.equal(new URL(page.url()).pathname, "/study", "selecting a material must stay in the study space");
    assert.equal(new URL(page.url()).searchParams.get("view"), "listening");
    assert.equal(await page.getByLabel("复述完成").inputValue(), marker);
    const stops = await page.evaluate(() => window.__studioSpeechStops);
    await page.getByRole("navigation", {name:"听说内容"}).getByRole("link", {name:"表达",exact:true}).click();
    await ready();
    await page.waitForFunction(stops => window.__studioSpeechStops > stops, stops);
    await page.goBack();
    await ready();
    assert.equal(await page.getByLabel("复述完成").inputValue(), marker, "Back should restore the material draft");
    await page.reload({waitUntil:"networkidle"});
    await ready();
    assert.equal(await page.getByLabel("复述完成").inputValue(), marker, "Reload should restore the material draft");
    evidence.checks.push("material URL, same-material selection, query navigation stops speech, Back and reload preserve draft");

    for (const width of [320,390,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:900});
      for (const route of ["/","/study","/study?view=vocabulary","/practice","/settings"]) {
        await page.goto(baseUrl + route,{waitUntil:"networkidle"});
        if (route.startsWith("/study") || route === "/practice") await ready();
        const layout = await page.evaluate(() => ({
          width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
          header:Array.from(document.querySelectorAll("header.app-header .brand-lockup, header.app-header .main-nav, header.app-header .my-learning")).map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};})
        }));
        assert.ok(layout.scrollWidth <= width+2, route+" overflows at "+width);
        assert.ok(layout.header.every(r=>r.left>=0 && r.right<=width && r.height>=30), "header fits viewport");
        const [brand,nav,my] = layout.header;
        assert.ok(brand.right<=nav.left+1 && nav.right<=my.left+1, "header controls do not overlap at "+width);
        const fragments = await page.locator("main [data-letter-fragment]").evaluateAll(nodes => nodes.map(node => ({
          decorative: node.getAttribute("aria-hidden") === "true",
          pointerEvents: getComputedStyle(node).pointerEvents,
          image: node.querySelector("img")?.getAttribute("src")
        })));
        if (route !== "/settings") assert.ok(fragments.length >= 2, route + " should display independent word fragments");
        assert.ok(fragments.every(fragment => fragment.decorative && fragment.pointerEvents === "none" && fragment.image?.includes("/letter-")), "word fragments remain decorative and do not intercept controls");
        assert.equal(await page.locator('main img:not([src*="/letter-"])').count(), 0, route + " should not load scene collages");
        if (width === 390 || width === 1440) {
          await warmImages(page);
          const name = route === "/" ? "home" : route.slice(1).replace(/[?=]/g,"-");
          await page.screenshot({path:fileURLToPath(new URL("quiet-"+name+"-"+width+".png",outDir)),fullPage:true});
        }
        evidence.layouts.push({route,...layout});
      }
    }
    await page.setViewportSize({width:320,height:844});
    await page.goto(baseUrl+"/settings",{waitUntil:"networkidle"});
    await page.locator('summary[aria-label="学习数据"]').click();
    const reset = await page.getByRole("button",{name:"重置",exact:true}).boundingBox();
    assert.ok(reset.x>=0 && reset.x+reset.width<=320, "personal data panel must remain inside a narrow viewport");
    await page.locator('summary[aria-label="学习数据"]').click();
    await page.locator("summary.season-trigger").click();
    for (const option of await page.locator(".theme-toggle button").all()) {
      const box = await option.boundingBox();
      assert.ok(box.x>=0 && box.x+box.width<=320 && box.width>=44 && box.height>=44, "theme choices must remain usable at 320px");
    }
    await page.locator("summary.season-trigger").press("Escape");
    await page.getByRole("button",{name:"计划与记录",exact:true}).click();
    await page.locator("#planner").waitFor();
    assert.ok(await page.getByRole("button",{name:"先完成入门",exact:true}).isDisabled(), "new learners still need onboarding before saving a plan");
    assert.equal(await page.locator("main h1").count(),1);
    evidence.checks.push("three destinations, nine content views, 30 responsive layouts, personal data and appearance controls, integrated plan");
    assert.deepEqual(errors, [], "no browser runtime exceptions");
    writeFileSync(new URL("quiet-spaces-evidence.json",outDir), JSON.stringify(evidence,null,2));
  } finally { await context.close(); }
  console.log("Studio regression passed: nine views, material history/draft and 30 layouts.");
}

async function warmImages(page) {
  for (const img of await page.locator("main img").all()) {
    if (!(await img.isVisible())) continue;
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(img => img.complete ? undefined : new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}));
    assert.ok(await img.evaluate(img => img.naturalWidth>0), "art must load");
  }
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo({top:0,left:0,behavior:"instant"});});
}

if (process.argv[1]?.endsWith("studio-regression.mjs")) {
  const baseUrl=process.env.KIRINA_URL;
  if (!baseUrl) throw new Error("Set KIRINA_URL to the intended local Kirina server.");
  const {chromium}=await import("playwright");
  const outDir=new URL("../output/playwright/",import.meta.url);
  mkdirSync(outDir,{recursive:true});
  const browser=await chromium.launch({headless:true});
  try {await studioRegression(browser,baseUrl,outDir);} finally {await browser.close();}
}
