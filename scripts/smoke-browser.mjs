import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lessons } from "../src/data/curriculum.js";
import { immersionMaterials } from "../src/data/materials.ts";

const l01Lesson = lessons.find((lesson) => lesson.id === "l01-hangul-map");
const l06Lesson = lessons.find((lesson) => lesson.id === "l06-cafe");
const l10Lesson = lessons.find((lesson) => lesson.id === "l10-native-softeners");
const cafeMaterial = immersionMaterials.find((material) => material.id === "im-cafe-real-speed");
const l06PrerequisiteLessonIds = lessons
  .filter((lesson) => lesson.order < (l06Lesson?.order ?? 0))
  .map((lesson) => lesson.id);
const cafePrerequisiteOrder = Math.max(
  ...(cafeMaterial?.requiredLessons ?? cafeMaterial?.recommendedLessons ?? []).map((lessonId) => lessons.find((lesson) => lesson.id === lessonId)?.order ?? 0)
);
const cafePrerequisiteLessonIds = lessons
  .filter((lesson) => lesson.order <= cafePrerequisiteOrder)
  .map((lesson) => lesson.id);

const baseUrl = process.env.KIRINA_URL;
if (!baseUrl) {
  console.error("Set KIRINA_URL so browser smoke cannot hit another local app by accident.");
  process.exit(1);
}
const outDir = new URL("../.browser-check/", import.meta.url);
const playwrightEntry = process.env.PLAYWRIGHT_ENTRY ?? "playwright";
let chromium;
try {
  ({ chromium } = await import(playwrightEntry));
} catch (error) {
  console.error(`Browser smoke requires Playwright (${error.code ?? error.message}). Install it or set PLAYWRIGHT_ENTRY to an available package.`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
const issues = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`${message.type()} at ${page.url()}: ${message.text()}`);
});
page.on("pageerror", (error) => issues.push(`pageerror at ${page.url()}: ${error.message}`));

await page.addInitScript(() => {
  class SmokeSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const koreanVoice = { lang: "ko-KR", name: "Kirina Smoke Korean", voiceURI: "kirina-smoke-ko", localService: true };
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: SmokeSpeechSynthesisUtterance });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      cancel() {},
      getVoices: () => [koreanVoice],
      addEventListener() {},
      removeEventListener() {},
      speak(utterance) {
        window.setTimeout(() => utterance.onstart?.({}), 0);
        window.setTimeout(() => utterance.onend?.({}), 20);
      }
    }
  });
  class SmokeAudio {
    constructor(src) {
      this.src = src;
      this.preload = "auto";
      this.playbackRate = 1;
      this.volume = 1;
    }
    play() {
      window.setTimeout(() => this.onplaying?.({}), 0);
      window.setTimeout(() => this.onended?.({}), 20);
      return Promise.resolve();
    }
    pause() {}
  }
  Object.defineProperty(window, "Audio", { configurable: true, value: SmokeAudio });
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      estimate: async () => ({ usage: 1_000, quota: 100_000 }),
      persist: async () => true,
      persisted: async () => true
    }
  });
});
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.screenshot({ path: fileURLToPath(new URL("app-home-wide.png", outDir)), fullPage: false });
await page.screenshot({ path: fileURLToPath(new URL("home-onboarding.png", outDir)), fullPage: true });
await expectText(page, "完成三分钟入门设置");
const offlineCleanup = await page.evaluate(async () => {
  const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
  const cacheNames = "caches" in window ? await caches.keys() : [];
  return {
    legacyRegistrations: registrations.filter((registration) =>
      [registration.active, registration.installing, registration.waiting]
        .some((worker) => worker?.scriptURL && new URL(worker.scriptURL).pathname === "/sw.js")
    ).length,
    legacyCaches: cacheNames.filter((name) => name.startsWith("kirina-korean-next-")).length
  };
});
if (offlineCleanup.legacyRegistrations || offlineCleanup.legacyCaches) {
  issues.push(`legacy offline data should be removed, found ${JSON.stringify(offlineCleanup)}`);
}
await page.evaluate(async () => {
  if ("caches" in window) await caches.open("kirina-korean-next-smoke-old");
});
await page.reload({ waitUntil: "networkidle" });
const legacyCachesAfterReload = await page.evaluate(async () => (
  "caches" in window ? (await caches.keys()).filter((name) => name.startsWith("kirina-korean-next-")).length : 0
));
if (legacyCachesAfterReload) issues.push(`legacy offline cache survived a real reload cleanup: ${legacyCachesAfterReload}`);
await page.screenshot({ path: fileURLToPath(new URL("home-dashboard.png", outDir)), fullPage: true });
await verifyLearningDataPanel(page, outDir, issues);

const returningContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const returningPage = await returningContext.newPage();
returningPage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`returning ${message.type()}: ${message.text()}`);
});
returningPage.on("pageerror", (error) => issues.push(`returning pageerror: ${error.message}`));
await returningPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
await returningPage.evaluate(() => {
  const now = new Date().toISOString();
  localStorage.setItem("kirina.profile.v2", JSON.stringify({
    name: "Learner",
    studyMode: "guided",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 45,
    romanization: "fade",
    createdAt: now,
    updatedAt: now
  }));
  localStorage.setItem("kirina.progress.v2", JSON.stringify({
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 92 },
    masteredHangul: [],
    learnedVocab: [],
    learnedGrammar: [],
    learnedNative: [],
    completedMaterials: [],
    completedTasks: {},
    ability: { script: 12, listening: 4, vocabulary: 2, grammar: 0, pragmatics: 0, native: 0 },
    streak: 1,
    lastStudyDate: null,
    minutesGoal: 45,
    updatedAt: now
  }));
  localStorage.setItem("kirina.srs.v2", JSON.stringify({
    cards: {
      "mistake:returning": {
        id: "mistake:returning",
        box: 0,
        dueAt: Date.now() - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "returning", prompt: "回访错题", answer: "정답" }
      }
    },
    history: []
  }));
  localStorage.setItem("kirina.outputs.v1", JSON.stringify({
    entries: [
      {
        id: "output-returning",
        materialId: "im-cafe-real-speed",
        materialTitle: "咖啡店真实语速点单",
        mission: "回访输出任务",
        draft: "아이스 아메리카노 하나 포장해 주세요.",
        weakPoint: "포장해 주세요",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        rubric: ["naturalness"],
        createdAt: now
      }
    ]
  }));
});
await returningPage.reload({ waitUntil: "networkidle" });
await expectText(returningPage, "45 min");
await expectText(returningPage, "路径推荐");
await returningPage.getByRole("button", { name: "自学" }).click();
await expectText(returningPage, "学习模式已更新");
await expectText(returningPage, "自由自学");
const homeSelfModeState = await returningPage.evaluate(() => {
  const profile = JSON.parse(localStorage.getItem("kirina.profile.v2") ?? "{}");
  return profile.studyMode;
});
if (homeSelfModeState !== "self") issues.push(`home self-study mode switch should persist self, found ${homeSelfModeState}`);
await returningPage.getByRole("button", { name: "按路径" }).click();
await expectText(returningPage, "路径推荐");
const homeGuidedModeState = await returningPage.evaluate(() => {
  const profile = JSON.parse(localStorage.getItem("kirina.profile.v2") ?? "{}");
  return profile.studyMode;
});
if (homeGuidedModeState !== "guided") issues.push(`home guided mode switch should persist guided, found ${homeGuidedModeState}`);
await returningPage.goto(`${baseUrl}/self-study`, { waitUntil: "networkidle" });
await expectText(returningPage, "45 分钟");
await expectText(returningPage, "高级表达长期路线");
const returningMinutes = await returningPage.getByLabel("每日可用分钟").inputValue();
if (returningMinutes !== "45") issues.push(`returning self-study minutes mismatch: ${returningMinutes}`);
await returningPage.getByRole("button", { name: "保存并应用到工作台" }).click();
await expectText(returningPage, "今日自学规划已确认");
const selfPlanTaskState = await returningPage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const profile = JSON.parse(localStorage.getItem("kirina.profile.v2") ?? "{}");
  return {
    completed: Boolean(progress.completedTasks?.["open:self-plan"]),
    minutesGoal: profile.minutesGoal,
    studyMode: profile.studyMode
  };
});
if (!selfPlanTaskState.completed) issues.push("saving a self-study plan should complete the open:self-plan task");
if (selfPlanTaskState.minutesGoal !== 45) issues.push(`saving self-study plan should preserve minutesGoal 45, found ${selfPlanTaskState.minutesGoal}`);
if (selfPlanTaskState.studyMode !== "guided") issues.push(`saving self-study plan should preserve selected study mode, found ${selfPlanTaskState.studyMode}`);
await returningPage.goto(baseUrl, { waitUntil: "networkidle" });
await expectText(returningPage, "今日已确认");
await returningPage.goto(`${baseUrl}/self-study`, { waitUntil: "networkidle" });
await returningPage.getByLabel("检查证据").first().fill("随便看看");
await expectText(returningPage, "需要可复查证据");
const invalidCheckpointDisabled = await returningPage.getByRole("button", { name: "记录检查点" }).first().isDisabled();
if (!invalidCheckpointDisabled) issues.push("self-study checkpoint should keep the record button disabled for weak evidence");
await returningPage.reload({ waitUntil: "networkidle" });
const restoredCheckpointDraft = await returningPage.getByLabel("检查证据").first().inputValue();
if (restoredCheckpointDraft !== "随便看看") issues.push(`self-study checkpoint draft should restore after reload, found ${restoredCheckpointDraft}`);
await returningPage.getByLabel("检查证据").first().fill("录音 75 秒，能解释 힘들 것 같아요 的缓冲语气。");
await returningPage.getByRole("button", { name: "记录检查点" }).first().click();
await expectText(returningPage, "已记录");
const checkpointState = await returningPage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const checkpointId = progress.completedCheckpoints?.[0];
  return {
    checkpointId,
    evidence: checkpointId ? progress.checkpointEvidence?.[checkpointId] : "",
    eventValue: checkpointId ? progress.abilityEvents?.[`checkpoint:${checkpointId}`] : undefined
  };
});
if (!checkpointState.checkpointId) issues.push("self-study checkpoint should persist a completed checkpoint id");
if (!checkpointState.evidence?.includes("录音 75 秒")) issues.push(`self-study checkpoint should persist evidence, found ${checkpointState.evidence}`);
if (checkpointState.eventValue !== undefined) issues.push(`self-study reflection should not award direct ability events, found ${JSON.stringify(checkpointState.eventValue)}`);
await returningPage.evaluate(() => {
  window.__kirinaSmokeMarker = "self-study-link";
});
await returningPage.getByRole("link", { name: "母语者表达" }).first().click();
await returningPage.waitForURL("**/native", { waitUntil: "networkidle" });
await expectText(returningPage, "最后拉开差距");
const selfStudyMarker = await returningPage.evaluate(() => window.__kirinaSmokeMarker).catch(() => null);
if (selfStudyMarker !== "self-study-link") issues.push("self-study module links should use client-side navigation without a full page reload");
await returningPage.goto(`${baseUrl}/review`, { waitUntil: "networkidle" });
await expectText(returningPage, "回访错题");
await returningPage.evaluate(() => {
  localStorage.removeItem("kirina.srs.v2");
  window.dispatchEvent(new CustomEvent("kirina:learning-batch", { detail: { keys: ["kirina.srs.v2"] } }));
});
await expectText(returningPage, "现在没有到期复习");
await returningPage.evaluate(() => {
  localStorage.setItem("kirina.srs.v2", JSON.stringify({
    cards: {
      "mistake:returning": {
        id: "mistake:returning",
        box: 0,
        dueAt: Date.now() - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "returning", prompt: "回访错题", answer: "정답" }
      }
    },
    history: []
  }));
  window.dispatchEvent(new CustomEvent("kirina:learning-batch", { detail: { keys: ["kirina.srs.v2"] } }));
});
await expectText(returningPage, "回访错题");
const grammarAbilityBeforeReview = await returningPage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  return progress.ability?.grammar ?? 0;
});
let reviewReloaded = false;
returningPage.on("framenavigated", (frame) => {
  if (frame === returningPage.mainFrame() && frame.url().includes("/review")) reviewReloaded = true;
});
await returningPage.getByRole("textbox", { name: "输入答案" }).fill("정답");
await returningPage.getByRole("button", { name: "提交" }).click();
await expectText(returningPage, "答对了");
await returningPage.getByRole("button", { name: "结束复习" }).click();
await expectText(returningPage, "100%");
await returningPage.getByRole("button", { name: "继续" }).click();
await expectText(returningPage, "现在没有到期复习");
for (const linkName of ["继续路径", "查看错题", "积累词汇", "先补韩文"]) {
  const actionCount = await returningPage.getByRole("link", { name: linkName }).count();
  if (!actionCount) issues.push(`empty review state should expose "${linkName}" action`);
}
if (reviewReloaded) issues.push("review finish should refresh the queue without a full page navigation");
const reviewProgressAfterGrade = await returningPage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  return {
    grammar: progress.ability?.grammar,
    eventValue: progress.abilityEvents?.["review:mistake:returning:2"]
  };
});
if (reviewProgressAfterGrade.grammar !== grammarAbilityBeforeReview + 1) issues.push(`reviewing a grammar-like mistake should bump grammar ability once, before ${grammarAbilityBeforeReview}, after ${reviewProgressAfterGrade.grammar}`);
if (reviewProgressAfterGrade.eventValue !== 1) issues.push(`review should persist an ability event, found ${reviewProgressAfterGrade.eventValue}`);
await returningPage.evaluate(() => {
  localStorage.setItem("kirina.srs.v2", JSON.stringify({
    cards: {
      "mistake:same-tab-refresh": {
        id: "mistake:same-tab-refresh",
        box: 0,
        dueAt: Date.now() - 1000,
        correct: 0,
        wrong: 1,
        lastSeenAt: null,
        payload: { kind: "mistake", itemId: "same-tab-refresh", prompt: "同页新到期卡", answer: "새 카드" }
      }
    },
    history: []
  }));
  window.dispatchEvent(new CustomEvent("kirina:learning", { detail: { key: "kirina.srs.v2" } }));
});
await expectText(returningPage, "同页新到期卡");
await returningPage.goto(`${baseUrl}/immersion`, { waitUntil: "networkidle" });
await expectText(returningPage, "아이스 아메리카노 하나 포장해 주세요.");
await expectText(returningPage, "弱点：포장해 주세요");
await returningContext.close();

const resetConfirmContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const resetConfirmPage = await resetConfirmContext.newPage();
await resetConfirmPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
await resetConfirmPage.evaluate(() => {
  localStorage.setItem("kirina.progress.v2", JSON.stringify({
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 90 },
    updatedAt: new Date().toISOString()
  }));
});
await resetConfirmPage.reload({ waitUntil: "networkidle" });
await resetConfirmPage.getByRole("button", { name: "重置本机进度", exact: true }).click();
await expectText(resetConfirmPage, "再点一次将清空学习偏好");
const progressAfterFirstResetClick = await resetConfirmPage.evaluate(() => localStorage.getItem("kirina.progress.v2"));
if (!progressAfterFirstResetClick) issues.push("home reset should preserve learning data until the confirmation click");
await resetConfirmPage.getByRole("button", { name: "确认清空全部数据", exact: true }).click();
await expectText(resetConfirmPage, "本机学习偏好、进度、复习卡片、输出、草稿和作品集已清空");
const progressAfterConfirmedReset = await resetConfirmPage.evaluate(() => localStorage.getItem("kirina.progress.v2"));
if (progressAfterConfirmedReset) issues.push("confirmed home reset should clear managed progress");
await resetConfirmContext.close();

for (const route of ["/path", "/hangul", "/vocabulary", "/grammar", "/native", "/immersion", "/mistakes", "/quiz"]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(120);
  const h1 = await page.locator("h1").first().textContent({ timeout: 3000 }).catch(() => null);
  if (!h1?.trim()) issues.push(`missing h1 on ${route}`);
  if (route === "/path") {
    const routeSelfLinks = await page.getByRole("link", { name: "查看全路线" }).count();
    if (routeSelfLinks) issues.push("path compass should not show a current-page route link");
  }
  if (route === "/quiz") {
    await expectText(page, "还没有可迁移的题目");
    const emptySwitchButtons = await page.getByRole("button", { name: "换一组" }).count();
    if (emptySwitchButtons) issues.push("empty quiz should point learners to evidence-building actions instead of showing a dead switch button");
  }
}

const quizContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const quizAutoSavePage = await quizContext.newPage();
quizAutoSavePage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`quiz autosave ${message.type()}: ${message.text()}`);
});
quizAutoSavePage.on("pageerror", (error) => issues.push(`quiz autosave pageerror: ${error.message}`));
await quizAutoSavePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
await quizAutoSavePage.evaluate(() => {
  const now = new Date().toISOString();
  localStorage.setItem("kirina.progress.v2", JSON.stringify({
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 92 },
    completedTasks: {},
    ability: { script: 10, listening: 6, vocabulary: 0, grammar: 0, pragmatics: 0, native: 0 },
    practiceItems: {
      "lesson:l01-hangul-map:1": {
        attempts: 4,
        correct: 1,
        wrong: 3,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: now,
        lastSource: "lesson"
      },
      "lesson:l01-hangul-map:2": {
        attempts: 3,
        correct: 1,
        wrong: 2,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: now,
        lastSource: "lesson"
      },
      "lesson:l01-hangul-map:3": {
        attempts: 2,
        correct: 1,
        wrong: 1,
        streak: 0,
        lastCorrect: false,
        lastSeenAt: now,
        lastSource: "lesson"
      }
    },
    streak: 1,
    lastStudyDate: null,
    minutesGoal: 30,
    updatedAt: now
  }));
  localStorage.setItem("kirina.srs.v2", JSON.stringify({ cards: {}, history: [] }));
});
await quizAutoSavePage.goto(`${baseUrl}/quiz`, { waitUntil: "networkidle" });
await quizAutoSavePage.getByLabel("ㄱ + ㅏ").check();
await quizAutoSavePage.getByRole("button", { name: "提交" }).click();
await quizAutoSavePage.getByRole("button", { name: "下一题" }).click();
await quizAutoSavePage.getByLabel("ㄴ").check();
await quizAutoSavePage.getByRole("button", { name: "提交" }).click();
await quizAutoSavePage.getByRole("button", { name: "下一题" }).click();
await quizAutoSavePage.getByRole("textbox", { name: "输入答案" }).fill("고");
await quizAutoSavePage.getByRole("button", { name: "提交" }).click();
for (let index = 3; index < l01Lesson.drills.length; index += 1) {
  await quizAutoSavePage.getByRole("button", { name: "下一题" }).click();
  const skipAudio = quizAutoSavePage.getByRole("button", { name: "跳过音频题", exact: true });
  if (await skipAudio.isVisible().catch(() => false)) {
    await skipAudio.click();
    continue;
  }
  const prompt = await currentDrillPrompt(quizAutoSavePage);
  const drill = l01Lesson.drills.find((item) => item.prompt === prompt);
  if (!drill) throw new Error(`quiz smoke could not match lesson drill: ${prompt}`);
  await answerDrill(quizAutoSavePage, drill);
}
await quizAutoSavePage.getByRole("button", { name: "查看结果" }).click();
await expectText(quizAutoSavePage, "测验结果已写入进度");
const quizAutoSaveState = await quizAutoSavePage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  return {
    quizDone: Boolean(progress.completedTasks?.["quiz:mixed"]),
    openQuizDone: Boolean(progress.completedTasks?.["open:quiz"]),
    firstLastCorrect: progress.practiceItems?.["lesson:l01-hangul-map:1"]?.lastCorrect,
    secondLastCorrect: progress.practiceItems?.["lesson:l01-hangul-map:2"]?.lastCorrect,
    thirdLastCorrect: progress.practiceItems?.["lesson:l01-hangul-map:3"]?.lastCorrect,
    firstSource: progress.practiceItems?.["lesson:l01-hangul-map:1"]?.lastSource
  };
});
if (!quizAutoSaveState.quizDone) issues.push("quiz result screen should auto-save quiz:mixed before the learner clicks the result-page next action");
if (!quizAutoSaveState.openQuizDone) issues.push("quiz result screen should auto-complete open:quiz");
if (!quizAutoSaveState.firstLastCorrect || !quizAutoSaveState.secondLastCorrect || !quizAutoSaveState.thirdLastCorrect) {
  issues.push(`quiz auto-save should repair weak practice items, found ${JSON.stringify(quizAutoSaveState)}`);
}
if (quizAutoSaveState.firstSource !== "quiz") issues.push(`quiz auto-save should mark repaired practice source as quiz, found ${quizAutoSaveState.firstSource}`);
await quizContext.close();

const pathContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const pathPage = await pathContext.newPage();
pathPage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`path ${message.type()}: ${message.text()}`);
});
pathPage.on("pageerror", (error) => issues.push(`path pageerror: ${error.message}`));
await pathPage.goto(`${baseUrl}/path`, { waitUntil: "networkidle" });
await expectText(pathPage, "先完成入门");
await expectText(pathPage, "韩文不是字母表");
await expectText(pathPage, "先入门");
await pathPage.goto(`${baseUrl}/immersion?material=im-cafe-real-speed`, { waitUntil: "networkidle" });
await expectText(pathPage, "先补第 1 课");
await pathPage.goto(`${baseUrl}/self-study`, { waitUntil: "networkidle" });
await expectText(pathPage, "先完成三分钟入门，再把自学方案写入工作台");
if (!(await pathPage.getByRole("button", { name: "先完成入门" }).isDisabled())) {
  issues.push("self-study save should stay disabled until onboarding");
}
await pathPage.goto(`${baseUrl}/path`, { waitUntil: "networkidle" });
await pathPage.getByRole("button", { name: /叙述与材料入口/ }).click();
await expectText(pathPage, "叙述与材料入口课程窗口");
await expectText(pathPage, "慢速新闻入口");
await pathPage.evaluate(() => {
  const now = new Date().toISOString();
  localStorage.setItem("kirina.progress.v2", JSON.stringify({
    completedLessons: ["l01-hangul-map"],
    lessonScores: { "l01-hangul-map": 92 },
    previewLessonScores: {},
    masteredHangul: [],
    learnedVocab: [],
    learnedGrammar: [],
    learnedNative: [],
    completedMaterials: [],
    materialEvidence: {},
    completedCheckpoints: [],
    checkpointEvidence: {},
    completedTasks: {},
    ability: { script: 10, listening: 6, vocabulary: 0, grammar: 0, pragmatics: 0, native: 0 },
    abilityEvents: {},
    streak: 1,
    lastStudyDate: null,
    minutesGoal: 30,
    updatedAt: now
  }));
});
await pathPage.reload({ waitUntil: "networkidle" });
await expectText(pathPage, "10 个基础元音");
await pathPage.evaluate(() => {
  window.__kirinaSmokeMarker = "path-current-lesson";
});
await pathPage.getByRole("link", { name: /10 个基础元音/ }).first().click();
await pathPage.waitForURL("**/learn/l02-vowels", { waitUntil: "networkidle" });
const pathMarker = await pathPage.evaluate(() => window.__kirinaSmokeMarker).catch(() => null);
if (pathMarker !== "path-current-lesson") issues.push("path lesson links should use client-side navigation without a full page reload");
await pathContext.close();

await ensureOnboarded(page);
await page.goto(`${baseUrl}/native`, { waitUntil: "networkidle" });
await expectText(page, "今日母语者切片");
const defaultNativeSlice = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("保存证据并加入 SRS") || item.textContent?.includes("再用下方按钮加入 SRS") || item.textContent?.includes("已加入 SRS"));
  const playButtons = [...document.querySelectorAll("article button")].filter((button) => button.textContent?.includes("PLAY"));
  return {
    visibleCards: cards.length,
    playButtons: playButtons.length,
    hasPragmatics: cards.some((item) => item.textContent?.includes("咖啡店点单")),
    hasNuance: cards.some((item) => item.textContent?.includes("感谢的温度")),
    hasExpand: [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("展开全部表达")),
    hasLineExpand: [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("展开完整排练"))
  };
});
if (defaultNativeSlice.visibleCards !== 6) issues.push(`default native page should show a six-card daily slice, found ${defaultNativeSlice.visibleCards}`);
if (defaultNativeSlice.playButtons !== 6) issues.push(`default native cards should show one key playable line each, found ${defaultNativeSlice.playButtons}`);
if (!defaultNativeSlice.hasPragmatics || !defaultNativeSlice.hasNuance) issues.push("default native slice should mix pragmatic scenarios and nuance cards");
if (!defaultNativeSlice.hasExpand) issues.push("default native page should offer an expand-all action");
if (!defaultNativeSlice.hasLineExpand) issues.push("native cards should let learners expand complete rehearsals after the key line");
await page.getByLabel("搜索表达").fill("아아");
await expectText(page, "咖啡店点单");
const nativeSearchState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("保存证据并加入 SRS") || item.textContent?.includes("再用下方按钮加入 SRS") || item.textContent?.includes("已加入 SRS"));
  return {
    visibleCards: cards.length,
    hasFirstMeeting: cards.some((item) => item.textContent?.includes("第一次见面"))
  };
});
if (nativeSearchState.visibleCards !== 1) issues.push(`native search should narrow to one cafe scenario, found ${nativeSearchState.visibleCards}`);
if (nativeSearchState.hasFirstMeeting) issues.push("native search should hide unrelated first-meeting scenario");
await page.getByRole("button", { name: "重置筛选" }).first().click();
await page.getByRole("radio", { name: /语气细差/ }).click();
await expectText(page, "感谢的温度");
const nativeTrackState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("保存证据并加入 SRS") || item.textContent?.includes("再用下方按钮加入 SRS") || item.textContent?.includes("已加入 SRS"));
  return {
    visibleCards: cards.length,
    hasPragmatics: cards.some((item) => item.textContent?.includes("咖啡店点单"))
  };
});
if (nativeTrackState.visibleCards < 4) issues.push(`native nuance filter should show nuance cards, found ${nativeTrackState.visibleCards}`);
if (nativeTrackState.hasPragmatics) issues.push("native nuance filter should hide pragmatic scenarios");
const thanksCard = page.locator("article").filter({ hasText: "感谢的温度" }).first();
await thanksCard.getByRole("button", { name: /PLAY/ }).first().click();
await thanksCard.getByRole("checkbox", { name: "已实际播放关键台词" }).waitFor();
await page.waitForFunction(() => {
  const card = [...document.querySelectorAll("article")].find((item) => item.textContent?.includes("感谢的温度"));
  const box = card?.querySelector('input[type="checkbox"]');
  return Boolean(box?.checked);
});
await thanksCard.getByLabel("韩语复述").fill("감사합니다 이 표현은 공식적인 자리에서 쓰고 고마워요는 일상에서 자연스러워요.");
await thanksCard.getByLabel("关系迁移").fill("친구에게는 고마워라고 말하고 회사에서는 감사합니다 표현을 사용해요.");
await thanksCard.getByRole("button", { name: "保存证据并加入 SRS" }).click();
await expectText(page, "已加入 SRS");
const nativeStateAfterAdd = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    learnedNative: progress.learnedNative?.filter((id) => String(id).startsWith("nuance:")).length ?? 0,
    nativeCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "native" && String(card?.payload?.itemId ?? "").startsWith("nuance:")).length
  };
});
if (nativeStateAfterAdd.learnedNative !== 1) issues.push(`adding native nuance should persist learnedNative, found ${nativeStateAfterAdd.learnedNative}`);
if (nativeStateAfterAdd.nativeCards !== 1) issues.push(`adding native nuance should create one native SRS card, found ${nativeStateAfterAdd.nativeCards}`);
await page.getByLabel("只看已加入 SRS").check();
const learnedNativeOnlyState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("保存证据并加入 SRS") || item.textContent?.includes("再用下方按钮加入 SRS") || item.textContent?.includes("已加入 SRS"));
  return {
    visibleCards: cards.length,
    hasUnlearnedButton: cards.some((item) => item.textContent?.includes("再用下方按钮加入 SRS") || item.textContent?.includes("保存证据并加入 SRS"))
  };
});
if (learnedNativeOnlyState.visibleCards !== 1) issues.push(`native learned-only filter should show one card, found ${learnedNativeOnlyState.visibleCards}`);
if (learnedNativeOnlyState.hasUnlearnedButton) issues.push("native learned-only filter should hide unlearned cards");
await page.getByRole("button", { name: "已加入 SRS" }).first().click();
await expectText(page, "确认移出复习");
await page.getByRole("button", { name: "确认移出复习" }).first().click();
const nativeStateAfterRemove = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    learnedNative: progress.learnedNative?.filter((id) => String(id).startsWith("nuance:")).length ?? 0,
    nativeCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "native" && String(card?.payload?.itemId ?? "").startsWith("nuance:")).length
  };
});
if (nativeStateAfterRemove.learnedNative !== 0) issues.push(`removing native nuance should clear learnedNative, found ${nativeStateAfterRemove.learnedNative}`);
if (nativeStateAfterRemove.nativeCards !== 0) issues.push(`removing native nuance should remove native SRS card, found ${nativeStateAfterRemove.nativeCards}`);
await page.getByRole("button", { name: "重置筛选" }).first().click();

await ensureOnboarded(page);
await page.goto(`${baseUrl}/vocabulary`, { waitUntil: "networkidle" });
const defaultVocabSlice = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("测一测 · 加入掌握") || item.textContent?.includes("已掌握"));
  return {
    visibleCards: cards.length,
    hasSliceCopy: document.body.textContent?.includes("今日词汇切片") ?? false,
    hasExpand: [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("展开全部词汇"))
  };
});
if (defaultVocabSlice.visibleCards !== 12) issues.push(`default vocabulary page should show 12-card daily slice, found ${defaultVocabSlice.visibleCards}`);
if (!defaultVocabSlice.hasSliceCopy) issues.push("default vocabulary page should explain the daily vocabulary slice");
if (!defaultVocabSlice.hasExpand) issues.push("default vocabulary page should offer an expand-all action");
await page.evaluate(() => {
  const now = new Date().toISOString();
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  progress.learnedVocab = ["v-annyeonghaseyo"];
  progress.abilityEvents = { ...(progress.abilityEvents ?? {}), "vocab:v-annyeonghaseyo": 1 };
  progress.updatedAt = now;
  localStorage.setItem("kirina.progress.v2", JSON.stringify(progress));
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{},\"history\":[]}");
  srs.cards = srs.cards ?? {};
  srs.cards["vocab:v-annyeonghaseyo"] = {
    id: "vocab:v-annyeonghaseyo",
    box: 0,
    dueAt: Date.now() + 60_000,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    payload: { kind: "vocab", itemId: "v-annyeonghaseyo" }
  };
  localStorage.setItem("kirina.srs.v2", JSON.stringify(srs));
});
await page.reload({ waitUntil: "networkidle" });
await expectText(page, "已掌握 · 点击移出");
await page.evaluate(() => {
  window.__kirinaOriginalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === "kirina.progress.v2") throw new DOMException("Quota exceeded", "QuotaExceededError");
    return window.__kirinaOriginalSetItem.call(this, key, value);
  };
});
await page.getByRole("button", { name: "已掌握 · 点击移出" }).first().click();
await expectText(page, "这张词汇卡没有写入成功");
const blockedVocabResult = await page.evaluate(() => {
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  return {
    learnedVocab: progress.learnedVocab?.length ?? 0,
    vocabCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "vocab").length
  };
});
await page.evaluate(() => {
  if (window.__kirinaOriginalSetItem) {
    Storage.prototype.setItem = window.__kirinaOriginalSetItem;
    delete window.__kirinaOriginalSetItem;
  }
});
if (blockedVocabResult.learnedVocab !== 1) issues.push(`failed vocabulary removal should keep learned progress, found ${blockedVocabResult.learnedVocab}`);
if (blockedVocabResult.vocabCards !== 1) issues.push(`failed vocabulary removal should roll back SRS card deletion, found ${blockedVocabResult.vocabCards}`);
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "已掌握 · 点击移出" }).first().click();
let vocabCards = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return Object.values(state.cards ?? {}).filter((card) => card?.payload?.kind === "vocab").length;
});
if (vocabCards !== 0) issues.push(`removing mastered vocabulary should remove its SRS card, found ${vocabCards}`);
await page.getByRole("button", { name: "测一测 · 加入掌握" }).first().click();
await expectText(page, "掌握小测");
await page.getByRole("radio", { name: "안녕하세요" }).check();
await page.getByRole("button", { name: "提交" }).click();
await page.getByRole("button", { name: "下一题" }).click();
await page.getByRole("radio", { name: "你好" }).check();
await page.getByRole("button", { name: "提交" }).click();
await page.getByRole("button", { name: "下一题" }).click();
const vocabAudioSkip = page.getByRole("button", { name: "跳过音频题", exact: true });
await Promise.race([
  vocabAudioSkip.waitFor({ state: "visible" }),
  page.getByRole("textbox", { name: "输入答案" }).waitFor({ state: "visible" })
]);
if (await vocabAudioSkip.isVisible().catch(() => false)) {
  await vocabAudioSkip.click();
} else {
  await page.getByRole("textbox", { name: "输入答案" }).fill("안녕하세요");
  await page.getByRole("button", { name: "提交" }).click();
}
await page.getByRole("button", { name: "下一题" }).click();
await page.getByRole("textbox", { name: "输入答案" }).fill("안녕하세요");
await page.getByRole("button", { name: "提交" }).click();
await page.getByRole("button", { name: "交卷" }).click();
await expectText(page, "已掌握 · 点击移出");
const gatedVocabState = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  return {
    learnedVocab: progress.learnedVocab?.length ?? 0,
    vocabCards: Object.values(state.cards ?? {}).filter((card) => card?.payload?.kind === "vocab").length
  };
});
if (gatedVocabState.learnedVocab !== 1) issues.push(`passing the vocab mastery gate should persist learnedVocab, found ${gatedVocabState.learnedVocab}`);
if (gatedVocabState.vocabCards !== 1) issues.push(`passing the vocab mastery gate should create one vocab SRS card, found ${gatedVocabState.vocabCards}`);
await page.getByLabel("搜索词汇").fill("지하철");
await expectText(page, "지하철");
await expectText(page, "地铁");
const subwaySearchState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("测一测 · 加入掌握") || item.textContent?.includes("已掌握"));
  return {
    visibleCards: cards.length,
    hasUnrelatedGreeting: cards.some((item) => item.textContent?.includes("안녕하세요"))
  };
});
if (subwaySearchState.visibleCards < 1) issues.push("vocabulary search should show matching subway vocabulary or collocations");
if (subwaySearchState.hasUnrelatedGreeting) issues.push("vocabulary search should hide unrelated greeting cards");
await page.getByRole("button", { name: "重置筛选" }).click();
await page.getByRole("radio", { name: /移动/ }).click();
await expectText(page, "숙소");
const travelFilterState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("测一测 · 加入掌握") || item.textContent?.includes("已掌握"));
  return {
    visibleCards: cards.length,
    hasFood: cards.some((item) => item.textContent?.includes("아이스 아메리카노"))
  };
});
if (travelFilterState.visibleCards < 6) issues.push(`travel category filter should show a useful set, found ${travelFilterState.visibleCards}`);
if (travelFilterState.hasFood) issues.push("travel category filter should hide food-specific cards");
await page.getByRole("button", { name: "重置筛选" }).click();

await ensureOnboarded(page);
await page.goto(`${baseUrl}/grammar`, { waitUntil: "networkidle" });
await expectText(page, "今日句型切片");
const defaultGrammarState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("加入语法复习") || item.textContent?.includes("已掌握"));
  return {
    visibleCards: cards.length,
    hasExpandAction: document.body.textContent?.includes("展开全部句型") ?? false
  };
});
if (defaultGrammarState.visibleCards !== 6) issues.push(`grammar should default to a six-card daily slice, found ${defaultGrammarState.visibleCards}`);
if (!defaultGrammarState.hasExpandAction) issues.push("grammar page should expose an expand action beyond the daily slice");
await page.getByLabel("搜索语法").fill("-고 있어요");
await expectText(page, "动词词干 + 고 있어요");
const grammarSearchState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("加入语法复习") || item.textContent?.includes("已掌握"));
  return {
    visibleCards: cards.length,
    hasTopicMarker: cards.some((item) => item.textContent?.includes("은/는 与 이/가"))
  };
});
if (grammarSearchState.visibleCards !== 1) issues.push(`grammar search should narrow to one progressive card, found ${grammarSearchState.visibleCards}`);
if (grammarSearchState.hasTopicMarker) issues.push("grammar search should hide unrelated topic marker card");
await page.getByRole("button", { name: "重置筛选" }).click();
await page.getByRole("radio", { name: /母语者语法/ }).click();
await expectText(page, "母语者语法");
await expectText(page, "-는 것");
const nativeGrammarState = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")].filter((item) => item.textContent?.includes("加入语法复习") || item.textContent?.includes("已掌握"));
  return {
    visibleCards: cards.length,
    hasFoundation: cards.some((item) => item.textContent?.includes("이에요/예요"))
  };
});
if (nativeGrammarState.visibleCards < 6) issues.push(`native grammar filter should show native grammar cards, found ${nativeGrammarState.visibleCards}`);
if (nativeGrammarState.hasFoundation) issues.push("native grammar filter should hide foundation cards");
await page.getByRole("button", { name: "重置筛选" }).click();
const passTopicSubjectGate = async () => {
  await page.getByRole("button", { name: "测一测 · 加入语法复习" }).first().click();
  await expectText(page, "掌握小测");
  await page.getByRole("radio", { name: "我是学生。" }).check();
  await page.getByRole("button", { name: "提交" }).click();
  await page.getByRole("button", { name: "下一题" }).click();
  await page.getByRole("radio", { name: "话题标记 vs 主语标记" }).check();
  await page.getByRole("button", { name: "提交" }).click();
  await page.getByRole("button", { name: "下一题" }).click();
  await page.getByRole("radio", { name: "不要把 은/는 简单等同于“是”。" }).check();
  await page.getByRole("button", { name: "提交" }).click();
  await page.getByRole("button", { name: "交卷" }).click();
  await expectText(page, "已掌握 · 点击移出");
};
await passTopicSubjectGate();
const grammarStateAfterGate = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    ability: progress.ability?.grammar,
    learnedGrammar: progress.learnedGrammar?.length ?? 0,
    grammarCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "grammar").length
  };
});
if (grammarStateAfterGate.ability !== 2) issues.push(`passing the grammar gate should record ability 2, found ${grammarStateAfterGate.ability}`);
if (grammarStateAfterGate.learnedGrammar !== 1) issues.push(`passing the grammar gate should persist learnedGrammar, found ${grammarStateAfterGate.learnedGrammar}`);
if (grammarStateAfterGate.grammarCards !== 1) issues.push(`passing the grammar gate should create one grammar SRS card, found ${grammarStateAfterGate.grammarCards}`);
await page.getByRole("button", { name: "已掌握 · 点击移出" }).first().click();
const grammarStateAfterRemove = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    ability: progress.ability?.grammar,
    learnedGrammar: progress.learnedGrammar?.length ?? 0,
    grammarCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "grammar").length
  };
});
if (grammarStateAfterRemove.ability !== 0) issues.push(`removing grammar should retract the evidence-backed ability: ${grammarStateAfterRemove.ability}`);
if (grammarStateAfterRemove.learnedGrammar !== 0) issues.push(`removing grammar should clear learnedGrammar: ${grammarStateAfterRemove.learnedGrammar}`);
if (grammarStateAfterRemove.grammarCards !== 0) issues.push(`removing grammar should remove SRS card: ${grammarStateAfterRemove.grammarCards}`);
await passTopicSubjectGate();
const grammarStateAfterReAdd = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    ability: progress.ability?.grammar,
    learnedGrammar: progress.learnedGrammar?.length ?? 0,
    grammarCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "grammar").length
  };
});
if (grammarStateAfterReAdd.ability !== 2) issues.push(`re-adding the same grammar should not double-count ability: ${grammarStateAfterReAdd.ability}`);
if (grammarStateAfterReAdd.learnedGrammar !== 1) issues.push(`re-adding grammar should restore learnedGrammar: ${grammarStateAfterReAdd.learnedGrammar}`);
if (grammarStateAfterReAdd.grammarCards !== 1) issues.push(`re-adding grammar should restore one SRS card: ${grammarStateAfterReAdd.grammarCards}`);

const lessonSessionFailureContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const lessonSessionFailurePage = await lessonSessionFailureContext.newPage();
lessonSessionFailurePage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`lesson-session-failure ${message.type()}: ${message.text()}`);
});
lessonSessionFailurePage.on("pageerror", (error) => issues.push(`lesson-session-failure pageerror: ${error.message}`));
await openOnboardedLesson(lessonSessionFailurePage, "l01-hangul-map");
await lessonSessionFailurePage.getByLabel("ㄱ + ㅏ").check();
await lessonSessionFailurePage.evaluate(() => {
  window.__kirinaOriginalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItemWithLessonSessionFailure(key, value) {
    if (key === "kirina.lesson-session.v1") throw new DOMException("Quota exceeded", "QuotaExceededError");
    return window.__kirinaOriginalSetItem.call(this, key, value);
  };
});
await lessonSessionFailurePage.getByRole("button", { name: "提交" }).click();
await expectText(lessonSessionFailurePage, "本次练习断点没有写入本地存储");
const failedLessonSessionState = await lessonSessionFailurePage.evaluate(() => {
  Storage.prototype.setItem = window.__kirinaOriginalSetItem;
  delete window.__kirinaOriginalSetItem;
  return localStorage.getItem("kirina.lesson-session.v1");
});
if (failedLessonSessionState) issues.push("failed lesson resume save should not leave a partial lesson session");
await lessonSessionFailureContext.close();

await ensureOnboarded(page);
await page.goto(`${baseUrl}/learn/l01-hangul-map`, { waitUntil: "networkidle" });
await expectText(page, "韩文不是字母表");
await answerDrill(page, l01Lesson.drills[0]);
await expectText(page, "答对了");
const lessonSessionAfterFirstAnswer = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem("kirina.lesson-session.v1") ?? "{\"sessions\":{}}");
  return state.sessions?.["l01-hangul-map"] ?? null;
});
if (lessonSessionAfterFirstAnswer?.currentIndex !== 0) issues.push(`lesson resume should persist current index 0 after first answer, found ${lessonSessionAfterFirstAnswer?.currentIndex}`);
if (lessonSessionAfterFirstAnswer?.answers?.length !== 1) issues.push(`lesson resume should persist one answer after first answer, found ${lessonSessionAfterFirstAnswer?.answers?.length}`);
await page.reload({ waitUntil: "networkidle" });
await expectText(page, "已恢复上次练习");
await expectText(page, "答对了");
await page.getByRole("button", { name: "下一题" }).click();
await completeLessonRun(page, l01Lesson.drills, { startIndex: 1 });
await expectText(page, "100%");
await page.getByRole("button", { name: "继续" }).click();
await expectText(page, "课程成绩已保存");
await expectText(page, "先清到期复习");
await expectText(page, "下一课");
const lessonReviewState = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const cards = Object.values(srs.cards ?? {});
  const lessonCards = cards.filter((card) => card?.payload?.kind === "lesson" && card?.payload?.itemId?.startsWith("lesson:l01-hangul-map:"));
  const mistakeCards = cards.filter((card) => card?.payload?.kind === "mistake" && String(card?.payload?.itemId ?? "").startsWith("lesson:l01-hangul-map:"));
  return {
    score: progress.lessonScores?.["l01-hangul-map"],
    completed: progress.completedLessons?.includes("l01-hangul-map") ?? false,
    lessonCards: lessonCards.length,
    mistakeCards: mistakeCards.length,
    lessonSession: localStorage.getItem("kirina.lesson-session.v1"),
    firstPrompt: lessonCards.find((card) => card?.id === "lesson:l01-hangul-map:1")?.payload?.prompt,
    thirdAnswer: lessonCards.find((card) => card?.id === "lesson:l01-hangul-map:3")?.payload?.answer
  };
});
if (lessonReviewState.score !== 100) issues.push(`finishing a perfect lesson should save score 100, found ${lessonReviewState.score}`);
if (!lessonReviewState.completed) issues.push("finishing a lesson should mark it completed");
if (lessonReviewState.lessonCards !== l01Lesson.drills.length) issues.push(`finishing a perfect lesson should create ${l01Lesson.drills.length} lesson SRS cards, found ${lessonReviewState.lessonCards}`);
if (lessonReviewState.mistakeCards !== 0) issues.push(`finishing a perfect lesson should not create mistake cards, found ${lessonReviewState.mistakeCards}`);
if (lessonReviewState.lessonSession && JSON.parse(lessonReviewState.lessonSession).sessions?.["l01-hangul-map"]) issues.push("finishing and saving a lesson should clear its resume session");
if (lessonReviewState.firstPrompt !== l01Lesson.drills[0].prompt) issues.push(`first lesson SRS prompt mismatch: ${lessonReviewState.firstPrompt}`);
if (lessonReviewState.thirdAnswer !== l01Lesson.drills[2].answer) issues.push(`third lesson SRS answer mismatch: ${lessonReviewState.thirdAnswer}`);

const lowScoreContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const lowScorePage = await lowScoreContext.newPage();
lowScorePage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`low-score ${message.type()}: ${message.text()}`);
});
lowScorePage.on("pageerror", (error) => issues.push(`low-score pageerror: ${error.message}`));
await openOnboardedLesson(lowScorePage, "l01-hangul-map");
const lowScoreWrongIndexes = l01Lesson.drills.map((_, index) => index).filter((index) => index > 0);
const lowScoreExpected = expectedLessonScore(l01Lesson.drills, lowScoreWrongIndexes);
await completeLessonRun(lowScorePage, l01Lesson.drills, { wrongIndexes: lowScoreWrongIndexes });
await expectText(lowScorePage, `${lowScoreExpected}%`);
await lowScorePage.getByRole("button", { name: "继续" }).click();
await expectText(lowScorePage, "成绩已保存，但还未达标");
await expectText(lowScorePage, "重做本课");
await expectText(lowScorePage, "先把本课达标，再进入后续路线或综合测验");
const lowScoreNextLinks = await lowScorePage.getByRole("link", { name: "下一课" }).count();
if (lowScoreNextLinks) issues.push("low-score lesson result should not offer the next lesson");
const lowScoreOldBridgeHint = await lowScorePage.getByText("适合先继续下一课或做综合测验", { exact: false }).count();
if (lowScoreOldBridgeHint) issues.push("low-score lesson bridge should not suggest continuing to the next lesson or quiz before mastery");
const lowScoreState = await lowScorePage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const cards = Object.values(srs.cards ?? {});
  return {
    score: progress.lessonScores?.["l01-hangul-map"],
    completed: progress.completedLessons?.includes("l01-hangul-map") ?? false,
    lessonCards: cards.filter((card) => card?.payload?.kind === "lesson" && String(card?.payload?.itemId ?? "").startsWith("lesson:l01-hangul-map:")).length,
    mistakeCards: cards.filter((card) => card?.payload?.kind === "mistake" && String(card?.payload?.itemId ?? "").startsWith("lesson:l01-hangul-map:")).length
  };
});
if (lowScoreState.score !== lowScoreExpected) issues.push(`low-score lesson attempt should save the score for transparency, found ${lowScoreState.score}`);
if (lowScoreState.completed) issues.push("low-score lesson attempt should not complete the core path");
if (lowScoreState.lessonCards !== 0) issues.push(`low-score lesson attempt should not create whole-lesson review cards, found ${lowScoreState.lessonCards}`);
const lowScoreExpectedMistakes = expectedLessonMistakes(l01Lesson.drills, lowScoreWrongIndexes);
if (lowScoreState.mistakeCards !== lowScoreExpectedMistakes) issues.push(`low-score lesson attempt should still preserve ${lowScoreExpectedMistakes} concrete mistakes for review, found ${lowScoreState.mistakeCards}`);
await lowScorePage.getByRole("button", { name: "重做本课" }).click();
await expectText(lowScorePage, `练习 1 / ${l01Lesson.drills.length}`);
await lowScoreContext.close();

const transferLockContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const transferLockPage = await transferLockContext.newPage();
transferLockPage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`transfer-lock ${message.type()}: ${message.text()}`);
});
transferLockPage.on("pageerror", (error) => issues.push(`transfer-lock pageerror: ${error.message}`));
await transferLockPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
await transferLockPage.evaluate((completedLessons) => {
  const now = new Date().toISOString();
  localStorage.setItem("kirina.progress.v2", JSON.stringify({
    completedLessons,
    lessonScores: Object.fromEntries(completedLessons.map((id) => [id, 92])),
    previewLessonScores: {},
    masteredHangul: [],
    learnedVocab: [],
    learnedGrammar: [],
    learnedNative: [],
    completedMaterials: [],
    materialEvidence: {},
    completedCheckpoints: [],
    checkpointEvidence: {},
    completedTasks: {},
    ability: { script: 24, listening: 18, vocabulary: 8, grammar: 8, pragmatics: 0, native: 0 },
    abilityEvents: {},
    streak: 1,
    lastStudyDate: null,
    minutesGoal: 30,
    updatedAt: now
  }));
}, l06PrerequisiteLessonIds);
await transferLockPage.goto(`${baseUrl}/learn/l06-cafe`, { waitUntil: "networkidle" });
await expectText(transferLockPage, "达标后解锁材料迁移");
await expectText(transferLockPage, "先把本课达到 80%");
const lockedTransferMaterialLinks = await transferLockPage.locator('a[href*="/immersion?material="]').count();
if (lockedTransferMaterialLinks) issues.push("unmastered lesson bridge should render transfer materials as locked cards, not material links");
const lockedTransferCards = await transferLockPage.locator('[aria-disabled="true"]').filter({ hasText: "达标后解锁材料迁移" }).count();
if (!lockedTransferCards) issues.push("unmastered lesson bridge should show an explicit locked material state");
await transferLockContext.close();

const mistakeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const mistakePage = await mistakeContext.newPage();
mistakePage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`mistake ${message.type()}: ${message.text()}`);
});
mistakePage.on("pageerror", (error) => issues.push(`mistake pageerror: ${error.message}`));
await openOnboardedLesson(mistakePage, "l01-hangul-map");
await mistakePage.getByLabel("ㄱ + ㅗ").check();
await mistakePage.getByRole("button", { name: "提交" }).click();
await expectText(mistakePage, "正确答案：ㄱ + ㅏ");
const lessonMistakeBeforeSave = await mistakePage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const cards = Object.values(srs.cards ?? {});
  const mistakes = cards.filter((card) => card?.payload?.kind === "mistake" && String(card?.payload?.itemId ?? "").startsWith("lesson:l01-hangul-map:"));
  return {
    completed: progress.completedLessons?.includes("l01-hangul-map") ?? false,
    mistakeCards: mistakes.length
  };
});
if (lessonMistakeBeforeSave.completed) issues.push("answering one wrong lesson question should not complete the lesson");
if (lessonMistakeBeforeSave.mistakeCards !== 0) issues.push(`lesson mistakes should wait for final lesson save, found ${lessonMistakeBeforeSave.mistakeCards}`);
await mistakePage.getByRole("button", { name: "下一题" }).click();
await completeLessonRun(mistakePage, l01Lesson.drills, { startIndex: 1 });
await expectText(mistakePage, `${expectedLessonScore(l01Lesson.drills, [0])}%`);
await mistakePage.getByRole("button", { name: "继续" }).click();
await expectText(mistakePage, "课程成绩已保存");
const lessonMistakeAfterSave = await mistakePage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const cards = Object.values(srs.cards ?? {});
  const mistakes = cards.filter((card) => card?.payload?.kind === "mistake" && String(card?.payload?.itemId ?? "").startsWith("lesson:l01-hangul-map:"));
  const lessonCards = cards.filter((card) => card?.payload?.kind === "lesson" && String(card?.payload?.itemId ?? "").startsWith("lesson:l01-hangul-map:"));
  return {
    completed: progress.completedLessons?.includes("l01-hangul-map") ?? false,
    mistakeCards: mistakes.length,
    lessonCards: lessonCards.length,
    firstMistakeAnswer: mistakes[0]?.payload?.answer
  };
});
if (!lessonMistakeAfterSave.completed) issues.push("saving a passing lesson with a wrong answer should complete the lesson");
if (lessonMistakeAfterSave.lessonCards !== l01Lesson.drills.length) issues.push(`saving a passing lesson should create ${l01Lesson.drills.length} lesson cards, found ${lessonMistakeAfterSave.lessonCards}`);
if (lessonMistakeAfterSave.mistakeCards !== 1) issues.push(`saving a passing lesson with one wrong answer should create one mistake card, found ${lessonMistakeAfterSave.mistakeCards}`);
if (lessonMistakeAfterSave.firstMistakeAnswer !== "ㄱ + ㅏ") issues.push(`saved lesson mistake should keep canonical answer, found ${lessonMistakeAfterSave.firstMistakeAnswer}`);
await mistakeContext.close();

const blockedMistakeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const blockedMistakePage = await blockedMistakeContext.newPage();
await openOnboardedLesson(blockedMistakePage, "l01-hangul-map");
await blockedMistakePage.evaluate(() => {
  window.__kirinaOriginalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === "kirina.srs.v2") throw new DOMException("Quota exceeded", "QuotaExceededError");
    return window.__kirinaOriginalSetItem.call(this, key, value);
  };
});
await completeLessonRun(blockedMistakePage, l01Lesson.drills);
await blockedMistakePage.getByRole("button", { name: "继续" }).click();
await expectText(blockedMistakePage, "成绩没有写入本地进度");
const blockedMistakeState = await blockedMistakePage.evaluate(() => {
  Storage.prototype.setItem = window.__kirinaOriginalSetItem;
  delete window.__kirinaOriginalSetItem;
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    completed: progress.completedLessons?.includes("l01-hangul-map") ?? false,
    mistakeCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "mistake").length,
    lessonCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "lesson").length
  };
});
if (blockedMistakeState.completed) issues.push("blocked lesson SRS save should not complete the lesson");
if (blockedMistakeState.mistakeCards !== 0) issues.push(`blocked lesson save should not leave mistake cards, found ${blockedMistakeState.mistakeCards}`);
if (blockedMistakeState.lessonCards !== 0) issues.push(`blocked lesson save should not leave lesson cards, found ${blockedMistakeState.lessonCards}`);
await blockedMistakeContext.close();

const lockedLessonContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const lockedLessonPage = await lockedLessonContext.newPage();
lockedLessonPage.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) issues.push(`locked ${message.type()}: ${message.text()}`);
});
lockedLessonPage.on("pageerror", (error) => issues.push(`locked pageerror: ${error.message}`));
await lockedLessonPage.goto(`${baseUrl}/learn/l10-native-softeners`, { waitUntil: "networkidle" });
await expectText(lockedLessonPage, "旁路预览");
await completeLessonRun(lockedLessonPage, l10Lesson.drills, { wrongIndexes: [0, 1] });
await lockedLessonPage.getByRole("button", { name: "继续" }).click();
await expectText(lockedLessonPage, "预览成绩已保存");
const lockedLessonState = await lockedLessonPage.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return {
    completed: progress.completedLessons?.includes("l10-native-softeners") ?? false,
    previewScore: progress.previewLessonScores?.["l10-native-softeners"],
    coreScore: progress.lessonScores?.["l10-native-softeners"],
    nativeAbility: progress.ability?.native ?? 0,
    pragmaticsAbility: progress.ability?.pragmatics ?? 0,
    streak: progress.streak ?? 0,
    lastStudyDate: progress.lastStudyDate ?? null,
    mistakeCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "mistake").length,
    lessonCards: Object.values(srs.cards ?? {}).filter((card) => card?.payload?.kind === "lesson").length
  };
});
if (lockedLessonState.completed) issues.push("locked preview lesson should not mark the core lesson completed");
if (!(Number(lockedLessonState.previewScore) > 0 && Number(lockedLessonState.previewScore) < 80)) {
  issues.push(`locked preview lesson should save a below-mastery preview score, found ${lockedLessonState.previewScore}`);
}
if (lockedLessonState.coreScore !== undefined) issues.push(`locked preview lesson should not save core score, found ${lockedLessonState.coreScore}`);
if (lockedLessonState.nativeAbility !== 0 || lockedLessonState.pragmaticsAbility !== 0) issues.push(`locked preview lesson should not advance native/pragmatics ability, found ${lockedLessonState.nativeAbility}/${lockedLessonState.pragmaticsAbility}`);
if (lockedLessonState.streak !== 0 || lockedLessonState.lastStudyDate !== null) issues.push(`locked preview lesson should not count as a formal study day, found ${lockedLessonState.streak}/${lockedLessonState.lastStudyDate}`);
if (lockedLessonState.mistakeCards !== 0) issues.push(`locked preview lesson should not create mistake cards, found ${lockedLessonState.mistakeCards}`);
if (lockedLessonState.lessonCards !== 0) issues.push(`locked preview lesson should not create lesson review cards, found ${lockedLessonState.lessonCards}`);
await lockedLessonContext.close();

await page.goto(`${baseUrl}/immersion`, { waitUntil: "networkidle" });
await expectText(page, "情境材料不是奖励");
await expectText(page, "真实先修条件");
await expectText(page, "先修未满，原文和朗读先收起来");
await page.getByLabel("韩语复述证据").fill("当前材料草稿不应因重复点击而丢失。");
await page.getByRole("button", { name: "咖啡店真实语速点单" }).click();
const sameMaterialDraft = await page.getByLabel("韩语复述证据").inputValue();
if (sameMaterialDraft !== "当前材料草稿不应因重复点击而丢失。") {
  issues.push(`clicking the active immersion material should preserve its draft, found ${sameMaterialDraft}`);
}
await page.getByRole("button", { name: "显示译文" }).click();
if (await page.getByRole("button", { name: "完成材料并加入 SRS" }).isEnabled()) issues.push("material completion should require evidence before enabling");
await page.getByLabel("听写证据").fill("포장해 주세요.");
await page.getByLabel("韩语复述证据").fill("손님은 아이스 아메리카노를 주문하고 카드로 계산해요.");
await page.getByRole("textbox", { name: "输出草稿" }).fill("저는 카페에서 아이스 아메리카노를 한 잔 주문하고 싶어요.");
await page.locator("label").filter({ hasText: "自然" }).click();
await page.getByLabel("需要修正的弱点").fill("外带表达不够稳");
await page.getByLabel("送回复习的目标改写").fill("아이스 아메리카노 하나 포장해 주세요.");
if (await page.getByRole("button", { name: "保存输出" }).isEnabled()) issues.push("locked material should not allow saving output into the archive");
if (await page.getByRole("button", { name: "完成材料并加入 SRS" }).isEnabled()) issues.push("material completion should still require self-check after dictation, retell, and output evidence");
await page.locator("label").filter({ hasText: "是否先说核心名词再说数量" }).click();
await page.locator("label").filter({ hasText: "是否使用 주세요 或 드릴까요" }).click();
await page.locator("label").filter({ hasText: "是否能不看中文复述交易流程" }).click();
if (await page.getByRole("button", { name: "完成材料并加入 SRS" }).isEnabled()) issues.push("material completion should still require lesson prerequisites after evidence and self-check");
await expectText(page, "先修未满时不开放原文、朗读和输出存档");
await page.evaluate((completedLessons) => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  progress.completedLessons = completedLessons;
  progress.lessonScores = Object.fromEntries(completedLessons.map((id) => [id, 92]));
  progress.ability = { ...(progress.ability ?? {}), script: 36, listening: 28, vocabulary: 22, grammar: 18, pragmatics: progress.ability?.pragmatics ?? 0, native: progress.ability?.native ?? 0 };
  localStorage.setItem("kirina.progress.v2", JSON.stringify(progress));
}, cafePrerequisiteLessonIds);
await page.reload({ waitUntil: "networkidle" });
await expectText(page, "材料实际使用的前置知识均已达标");
await expectText(page, "已恢复这段材料的未完成草稿");
await page.getByRole("button", { name: "显示译文" }).click();
await expectText(page, "欢迎光临");
const restoredMaterialDraft = {
  dictation: await page.getByLabel("听写证据").inputValue(),
  retell: await page.getByLabel("韩语复述证据").inputValue(),
  checkedSelfChecks: await page.evaluate(() => [...document.querySelectorAll("input[type='checkbox']")].filter((input) => input.checked).length)
};
if (restoredMaterialDraft.dictation !== "포장해 주세요.") issues.push(`material draft should restore dictation after reload, found ${restoredMaterialDraft.dictation}`);
if (!restoredMaterialDraft.retell.includes("아이스 아메리카노")) issues.push(`material draft should restore retell after reload, found ${restoredMaterialDraft.retell}`);
if (restoredMaterialDraft.checkedSelfChecks < 3) issues.push(`material draft should restore self-checks after reload, found ${restoredMaterialDraft.checkedSelfChecks}`);
const restoredOutputDraft = await page.getByRole("textbox", { name: "输出草稿" }).inputValue();
if (!restoredOutputDraft.includes("아이스 아메리카노")) issues.push(`material draft should restore output draft after reload, found ${restoredOutputDraft}`);
await page.getByRole("button", { name: "保存输出" }).click();
await expectText(page, "输出档案");
await expectText(page, "绑定中");
await expectText(page, "弱点：外带表达不够稳");
await expectText(page, "目标：아이스 아메리카노 하나 포장해 주세요.");
const outputDraftAfterSave = await page.getByRole("textbox", { name: "输出草稿" }).inputValue();
if (outputDraftAfterSave !== "") issues.push(`output draft should clear after save: ${outputDraftAfterSave}`);
const weakPointAfterSave = await page.getByLabel("需要修正的弱点").inputValue();
if (weakPointAfterSave !== "") issues.push(`weak point should clear after save: ${weakPointAfterSave}`);
const targetRewriteAfterSave = await page.getByLabel("送回复习的目标改写").inputValue();
if (targetRewriteAfterSave !== "") issues.push(`target rewrite should clear after save: ${targetRewriteAfterSave}`);
const outputCardsBeforeCompletion = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  return Object.values(state.cards ?? {}).filter((card) => card?.payload?.kind === "output").length;
});
if (outputCardsBeforeCompletion !== 0) issues.push(`saved output draft should not create formal output SRS before material completion, found ${outputCardsBeforeCompletion}`);
if (!(await page.getByRole("button", { name: "完成材料并加入 SRS" }).isEnabled())) issues.push("material completion should enable after prerequisites, dictation, retell, output evidence, and self-check");
await page.getByRole("button", { name: "完成材料并加入 SRS" }).click();
await page.goto(`${baseUrl}/immersion?material=im-cafe-real-speed`, { waitUntil: "networkidle" });
await expectText(page, "已完成并加入 SRS");
await page.waitForTimeout(80);
const materialEvidenceAfterCompletion = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const srs = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const drafts = JSON.parse(localStorage.getItem("kirina.drafts.v1") ?? "{}");
  const outputCard = Object.values(srs.cards ?? {}).find((card) => card?.payload?.kind === "output" && card?.payload?.prompt?.includes("外带表达"));
  return {
    selfCheckCount: progress.materialEvidence?.["im-cafe-real-speed"]?.selfCheck?.length ?? 0,
    dictation: progress.materialEvidence?.["im-cafe-real-speed"]?.dictation ?? "",
    outputEntryId: progress.materialEvidence?.["im-cafe-real-speed"]?.outputEntryId ?? "",
    outputAnswer: outputCard?.payload?.answer,
    draftRestored: Boolean(drafts.immersion?.["im-cafe-real-speed"])
  };
});
if (materialEvidenceAfterCompletion.selfCheckCount !== 3) issues.push(`material completion should persist 3 self-check items, found ${materialEvidenceAfterCompletion.selfCheckCount}`);
if (!materialEvidenceAfterCompletion.dictation.includes("포장해 주세요")) issues.push("material completion should persist dictation evidence");
if (!materialEvidenceAfterCompletion.outputEntryId.startsWith("output-")) issues.push(`material completion should bind a concrete output entry id, found ${materialEvidenceAfterCompletion.outputEntryId}`);
if (materialEvidenceAfterCompletion.outputAnswer !== "아이스 아메리카노 하나 포장해 주세요.") issues.push(`material completion should create output SRS for target rewrite, found ${materialEvidenceAfterCompletion.outputAnswer}`);
if (materialEvidenceAfterCompletion.draftRestored) issues.push("material completion should not recreate the cleared immersion draft through autosave");
await page.evaluate(() => {
  const now = new Date().toISOString();
  const otherId = "output-smoke-weekend";
  const outputState = JSON.parse(localStorage.getItem("kirina.outputs.v1") ?? "{\"entries\":[]}");
  outputState.entries = [
    {
      id: otherId,
      materialId: "im-weekend-plan",
      materialTitle: "约周末计划和改期",
      mission: "写一段你拒绝某个时间但给出替代方案的韩语对话。",
      draft: "토요일은 힘들 것 같아요. 일요일 점심은 어때요?",
      weakPoint: "힘들 것 같아요",
      targetRewrite: "토요일은 힘들 것 같아요.",
      rubric: ["register"],
      createdAt: now
    },
    ...(outputState.entries ?? [])
  ];
  localStorage.setItem("kirina.outputs.v1", JSON.stringify(outputState));
  const srsState = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{},\"history\":[]}");
  srsState.cards = srsState.cards ?? {};
  srsState.history = srsState.history ?? [];
  srsState.cards[`output:${otherId}`] = {
    id: `output:${otherId}`,
    box: 0,
    dueAt: Date.now(),
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    payload: {
      kind: "output",
      itemId: otherId,
      prompt: "根据弱点重写一句更自然的韩语：拒绝太直接",
      answer: "토요일은 힘들 것 같아요."
    }
  };
  localStorage.setItem("kirina.srs.v2", JSON.stringify(srsState));
});
await page.goto(`${baseUrl}/immersion?material=im-cafe-real-speed`, { waitUntil: "networkidle" });
await expectText(page, "已完成并加入 SRS");
await page.getByRole("button", { name: "清除完成记录与档案" }).click();
await expectText(page, "再次点击会同时移除本段完成记录");
const outputStateAfterFirstClearClick = await page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const outputState = JSON.parse(localStorage.getItem("kirina.outputs.v1") ?? "{\"entries\":[]}");
  return {
    completed: progress.completedMaterials?.includes("im-cafe-real-speed") ?? false,
    evidenceExists: Boolean(progress.materialEvidence?.["im-cafe-real-speed"]),
    activeEntries: (outputState.entries ?? []).filter((entry) => entry?.materialId === "im-cafe-real-speed").length
  };
});
if (!outputStateAfterFirstClearClick.completed) issues.push("first completed-material archive click should not remove completed material before confirmation");
if (!outputStateAfterFirstClearClick.evidenceExists) issues.push("first completed-material archive click should not remove material evidence before confirmation");
if (outputStateAfterFirstClearClick.activeEntries < 1) issues.push("first completed-material archive click should not clear output archive before confirmation");
await page.getByRole("button", { name: "确认清除完成记录" }).click();
await expectText(page, "还没有保存这段材料的输出");
const outputStateAfterClear = await page.evaluate(() => {
  const outputState = JSON.parse(localStorage.getItem("kirina.outputs.v1") ?? "{\"entries\":[]}");
  const srsState = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const progress = JSON.parse(localStorage.getItem("kirina.progress.v2") ?? "{}");
  const outputCards = Object.values(srsState.cards ?? {}).filter((card) => card?.payload?.kind === "output");
  return {
    completed: progress.completedMaterials?.includes("im-cafe-real-speed") ?? false,
    evidenceExists: Boolean(progress.materialEvidence?.["im-cafe-real-speed"]),
    activeEntries: (outputState.entries ?? []).filter((entry) => entry?.materialId === "im-cafe-real-speed").length,
    otherEntries: (outputState.entries ?? []).filter((entry) => entry?.materialId === "im-weekend-plan").length,
    activeCards: outputCards.filter((card) => card?.payload?.answer === "아이스 아메리카노 하나 포장해 주세요.").length,
    otherCards: outputCards.filter((card) => card?.payload?.itemId === "output-smoke-weekend").length
  };
});
if (outputStateAfterClear.completed) issues.push("confirmed archive clear should remove completed material status");
if (outputStateAfterClear.evidenceExists) issues.push("confirmed archive clear should remove material evidence");
if (outputStateAfterClear.activeEntries !== 0) issues.push(`clearing current archive should remove current material entries, found ${outputStateAfterClear.activeEntries}`);
if (outputStateAfterClear.otherEntries !== 1) issues.push(`clearing current archive should keep other material entries, found ${outputStateAfterClear.otherEntries}`);
if (outputStateAfterClear.activeCards !== 0) issues.push(`clearing current archive should remove current output SRS cards, found ${outputStateAfterClear.activeCards}`);
if (outputStateAfterClear.otherCards !== 1) issues.push(`clearing current archive should keep other output SRS cards, found ${outputStateAfterClear.otherCards}`);

await page.evaluate(() => {
  window.__kirinaOriginalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItemWithOutputFailure(key, value) {
    if (key === "kirina.outputs.v1") throw new DOMException("Quota exceeded", "QuotaExceededError");
    return window.__kirinaOriginalSetItem.call(this, key, value);
  };
});
await page.getByRole("textbox", { name: "输出草稿" }).fill("저는 카페에서 아이스 라테를 한 잔 주문하고 싶어요.");
await page.getByLabel("需要修正的弱点").fill("饮品外带表达");
await page.getByLabel("送回复习的目标改写").fill("아이스 라테 한 잔 포장해 주세요.");
await page.getByRole("button", { name: "保存输出" }).click();
await expectText(page, "输出档案没有保存");
const failedOutputState = await page.evaluate(() => {
  Storage.prototype.setItem = window.__kirinaOriginalSetItem;
  delete window.__kirinaOriginalSetItem;
  const outputState = JSON.parse(localStorage.getItem("kirina.outputs.v1") ?? "{\"entries\":[]}");
  const srsState = JSON.parse(localStorage.getItem("kirina.srs.v2") ?? "{\"cards\":{}}");
  const activeOutputCards = Object.values(srsState.cards ?? {}).filter((card) => card?.payload?.kind === "output" && card?.payload?.answer === "아이스 라테 한 잔 포장해 주세요.").length;
  const outputLabel = [...document.querySelectorAll("label")].find((label) => label.textContent?.includes("输出草稿"));
  const draftInput = outputLabel?.querySelector("textarea");
  return {
    draft: draftInput?.value ?? "",
    weakPoint: document.querySelector("input[placeholder*='拒绝']")?.value ?? "",
    targetRewrite: document.querySelector("input[placeholder*='좋긴']")?.value ?? "",
    activeEntries: (outputState.entries ?? []).filter((entry) => entry?.materialId === "im-cafe-real-speed").length,
    activeOutputCards
  };
});
if (failedOutputState.draft !== "저는 카페에서 아이스 라테를 한 잔 주문하고 싶어요.") issues.push("failed output save should keep draft text");
if (failedOutputState.weakPoint !== "饮品外带表达") issues.push("failed output save should keep weak point text");
if (failedOutputState.targetRewrite !== "아이스 라테 한 잔 포장해 주세요.") issues.push("failed output save should keep target rewrite text");
if (failedOutputState.activeEntries !== 0) issues.push(`failed output save should not create archive entries, found ${failedOutputState.activeEntries}`);
if (failedOutputState.activeOutputCards !== 0) issues.push(`failed output save should not create output SRS cards, found ${failedOutputState.activeOutputCards}`);

const keyboardContext = await browser.newContext({ viewport: { width: 320, height: 720 }, deviceScaleFactor: 1 });
const keyboardPage = await keyboardContext.newPage();
await openOnboardedLesson(keyboardPage, "l01-hangul-map");
await answerDrill(keyboardPage, l01Lesson.drills[0]);
await keyboardPage.getByRole("button", { name: "下一题" }).click();
await answerDrill(keyboardPage, l01Lesson.drills[1]);
await keyboardPage.getByRole("button", { name: "下一题" }).click();
await keyboardPage.getByRole("button", { name: "韩文键盘", exact: true }).click();
const keyboardOverflow = await keyboardPage.evaluate(() => {
  const keyboard = document.querySelector('[role="group"][aria-label="韩文屏幕键盘"]');
  if (!(keyboard instanceof HTMLElement)) return [{ missing: true }];
  const viewportWidth = window.innerWidth;
  return [...keyboard.querySelectorAll("button")]
    .map((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left < -1 || rect.right > viewportWidth + 1
        ? { label: button.getAttribute("aria-label") || button.textContent?.trim(), left: rect.left, right: rect.right, viewportWidth }
        : null;
    })
    .filter(Boolean);
});
if (keyboardOverflow.length) issues.push(`mobile-320 Hangul keyboard keys should stay inside the viewport: ${JSON.stringify(keyboardOverflow)}`);
await keyboardContext.close();

const viewportChecks = [
  { width: 320, height: 720, label: "mobile-320" },
  { width: 390, height: 844, label: "mobile-390" },
  { width: 768, height: 960, label: "tablet-768" },
  { width: 1280, height: 900, label: "desktop-1280" },
  { width: 1440, height: 980, label: "desktop-1440" }
];
const mobileRoutes = [
  ["/", "mobile-home.png"],
  ["/path", "mobile-path.png"],
  ["/self-study", "mobile-self-study.png"],
  ["/hangul", "mobile-hangul.png"],
  ["/vocabulary", "mobile-vocabulary.png"],
  ["/grammar", "mobile-grammar.png"],
  ["/native", "mobile-native.png"],
  ["/immersion", "mobile-immersion.png"],
  ["/review", "mobile-review.png"],
  ["/mistakes", "mobile-mistakes.png"],
  ["/quiz", "mobile-quiz.png"],
  ["/learn/l06-cafe", "mobile-lesson-cafe.png"]
];
for (const viewport of viewportChecks) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  for (const [route, screenshotName] of mobileRoutes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const active = document.querySelector('nav[aria-label="主导航"] [aria-current="page"]');
      const nav = active?.closest('nav[aria-label="主导航"]');
      if (!(active instanceof HTMLElement) || !(nav instanceof HTMLElement)) return false;
      const activeRect = active.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      return activeRect.left >= navRect.left - 8 && activeRect.right <= navRect.right + 8;
    }, { timeout: 2000 }).catch(() => {});
    if (viewport.width === 390) {
      await warmLazyMedia(page);
      if (route === "/") {
        await page.screenshot({ path: fileURLToPath(new URL("app-home-narrow.png", outDir)), fullPage: false });
      }
      await page.screenshot({ path: fileURLToPath(new URL(screenshotName, outDir)), fullPage: true });
    }
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2 ? { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth } : null;
    });
    if (overflow) issues.push(`${viewport.label} horizontal overflow on ${route}: ${JSON.stringify(overflow)}`);
    const activeNavVisibility = await page.evaluate(() => {
      const active = document.querySelector('nav[aria-label="主导航"] [aria-current="page"]');
      const nav = active?.closest('nav[aria-label="主导航"]');
      if (!(active instanceof HTMLElement) || !(nav instanceof HTMLElement)) return { found: false, visible: false };
      const activeRect = active.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      return {
        found: true,
        visible: activeRect.left >= navRect.left - 8 && activeRect.right <= navRect.right + 8
      };
    });
    if (!activeNavVisibility.found || !activeNavVisibility.visible) {
      issues.push(`${viewport.label} active navigation item is outside the visible navigation viewport on ${route}`);
    }
    if (viewport.width <= 360) {
      const headerControlOverlap = await page.evaluate(() => {
        const theme = document.querySelector('header .theme-toggle');
        const data = document.querySelector('header details');
        if (!(theme instanceof HTMLElement) || !(data instanceof HTMLElement)) return null;
        const themeRect = theme.getBoundingClientRect();
        const dataRect = data.getBoundingClientRect();
        const overlap = Math.min(themeRect.right, dataRect.right) - Math.max(themeRect.left, dataRect.left);
        return overlap > 1 ? { themeLeft: themeRect.left, themeRight: themeRect.right, dataLeft: dataRect.left, dataRight: dataRect.right } : null;
      });
      if (headerControlOverlap) {
        issues.push(`${viewport.label} header theme and learning-data controls overlap: ${JSON.stringify(headerControlOverlap)}`);
      }
    }
    const elementOverflow = await visibleElementOverflow(page);
    if (elementOverflow.length) {
      issues.push(`${viewport.label} clipped visible elements on ${route}: ${JSON.stringify(elementOverflow.slice(0, 8))}`);
    }
  }
}

await browser.close();

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("Browser smoke passed. Screenshots written to .browser-check/.");

async function verifyLearningDataPanel(page, outDir, issues) {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem("kirina.profile.v2", JSON.stringify({
      name: "Backup Smoke",
      studyMode: "self",
      selfStudyGoal: "foundation",
      selfStudyIntensity: "steady",
      selfStudyFocus: "balanced",
      minutesGoal: 30,
      romanization: "fade",
      createdAt: now,
      updatedAt: now
    }));
    localStorage.setItem("kirina.progress.v2", JSON.stringify({
      completedLessons: ["l01-hangul-map"],
      lessonScores: { "l01-hangul-map": 88 },
      completedTasks: {},
      ability: { script: 12, listening: 6, vocabulary: 0, grammar: 0, pragmatics: 0, native: 0 },
      minutesGoal: 30,
      updatedAt: now
    }));
    localStorage.setItem("kirina.unmanaged", "keep");
  });

  const dataPanel = page.locator('[aria-label="本地学习数据"]');
  await dataPanel.locator("summary").click();
  await dataPanel.getByRole("button", { name: "导出", exact: true }).waitFor({ state: "visible" });

  const download = await Promise.all([
    page.waitForEvent("download"),
    dataPanel.getByRole("button", { name: "导出", exact: true }).click()
  ]).then(([download]) => download).catch((error) => {
    issues.push(`learning data export did not start a download: ${error.message}`);
    return null;
  });
  if (download && !/^kirina-korean-backup-/.test(download.suggestedFilename())) {
    issues.push(`learning data export filename should be Kirina-scoped, found ${download.suggestedFilename()}`);
  }

  const invalidBackupPath = fileURLToPath(new URL("invalid-kirina-backup.json", outDir));
  writeFileSync(invalidBackupPath, JSON.stringify({ version: 99, app: "kirina-korean", entries: {} }));
  const fileChooser = await Promise.all([
    page.waitForEvent("filechooser"),
    dataPanel.getByRole("button", { name: "导入", exact: true }).click()
  ]).then(([chooser]) => chooser).catch((error) => {
    issues.push(`learning data import did not open a file chooser: ${error.message}`);
    return null;
  });
  if (fileChooser) {
    await fileChooser.setFiles(invalidBackupPath);
    await expectText(page, "文件无效");
  }

  await dataPanel.getByRole("button", { name: "保护存储", exact: true }).click();
  await expectText(page, "已持久");

  await dataPanel.getByRole("button", { name: "重置", exact: true }).click();
  await dataPanel.getByRole("button", { name: "确认重置", exact: true }).click();
  await expectText(page, "已重置");
  const resetState = await page.evaluate(() => ({
    profile: localStorage.getItem("kirina.profile.v2"),
    progress: localStorage.getItem("kirina.progress.v2"),
    srs: localStorage.getItem("kirina.srs.v2"),
    outputs: localStorage.getItem("kirina.outputs.v1"),
    unmanaged: localStorage.getItem("kirina.unmanaged")
  }));
  if (resetState.profile !== null || resetState.progress !== null || resetState.srs !== null || resetState.outputs !== null) {
    issues.push("learning data reset should clear managed Kirina learning storage keys");
  }
  if (resetState.unmanaged !== "keep") issues.push("learning data reset should preserve unmanaged localStorage entries");
}

async function ensureOnboarded(targetPage) {
  await targetPage.evaluate(() => {
    const now = new Date().toISOString();
    const raw = localStorage.getItem("kirina.profile.v2");
    const profile = raw ? JSON.parse(raw) : {
      name: "Learner",
      studyMode: "guided",
      selfStudyGoal: "foundation",
      selfStudyIntensity: "steady",
      selfStudyFocus: "balanced",
      minutesGoal: 30,
      romanization: "fade",
      createdAt: now,
      updatedAt: now
    };
    if (!profile.onboardedAt) {
      profile.onboardedAt = now;
      profile.updatedAt = now;
      localStorage.setItem("kirina.profile.v2", JSON.stringify(profile));
    }
  });
}

async function openOnboardedLesson(targetPage, lessonId) {
  await targetPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await ensureOnboarded(targetPage);
  await targetPage.goto(`${baseUrl}/learn/${lessonId}`, { waitUntil: "networkidle" });
}

async function expectText(page, text) {
  const found = await page
    .getByText(text, { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!found) issues.push(`missing text: ${text}`);
}

function expectedLessonScore(drills, wrongIndexes = []) {
  if (!drills.length) return 0;
  const wrong = new Set(wrongIndexes);
  const correct = drills.filter((_, index) => !wrong.has(index)).length;
  return Math.round((correct / drills.length) * 100);
}

function expectedLessonMistakes(drills, wrongIndexes = []) {
  const wrong = new Set(wrongIndexes);
  return drills.filter((_, index) => wrong.has(index)).length;
}

function isAuditoryDrill(drill) {
  return Boolean(drill?.speak && (drill.type === "listen" || drill.type === "dictation"));
}

async function answerDrill(targetPage, drill, { wrong = false } = {}) {
  const skipAudio = targetPage.getByRole("button", { name: "跳过音频题", exact: true });
  if (isAuditoryDrill(drill)) {
    await Promise.race([
      skipAudio.waitFor({ state: "visible" }),
      targetPage.getByRole("textbox", { name: "输入答案" }).waitFor({ state: "visible" }),
      targetPage.getByRole("radio").first().waitFor({ state: "visible" })
    ]);
  }
  if (await skipAudio.isVisible().catch(() => false)) {
    await skipAudio.click();
    return;
  }
  const usesText = drill.type === "type" || drill.type === "dictation" || drill.type === "translate" || (drill.type === "cloze" && !(drill.choices?.length));
  if (usesText) {
    await targetPage.getByRole("textbox", { name: "输入答案" }).fill(wrong ? "오답오답" : drill.answer);
  } else {
    const choice = wrong ? (drill.choices ?? []).find((item) => item !== drill.answer) : drill.answer;
    await targetPage.getByRole("radio", { name: choice, exact: true }).check();
  }
  await targetPage.getByRole("button", { name: "提交" }).click();
}

async function completeLessonRun(targetPage, drills, { wrongIndexes = [], startIndex = 0, finishLabel = "完成课程" } = {}) {
  for (let index = startIndex; index < drills.length; index += 1) {
    await answerDrill(targetPage, drills[index], { wrong: wrongIndexes.includes(index) });
    if (index < drills.length - 1) {
      await targetPage.getByRole("button", { name: "下一题" }).click();
    } else {
      await targetPage.getByRole("button", { name: finishLabel }).click();
    }
  }
}

async function currentDrillPrompt(targetPage) {
  const article = targetPage.locator("article").filter({ has: targetPage.getByRole("button", { name: "提交" }) }).first();
  return (await article.locator("h3").first().textContent())?.trim();
}

async function visibleElementOverflow(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const allowedOverflowAncestor = (element) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const className = typeof node.className === "string" ? node.className : "";
        if (className.includes("nav-scroll") || className.includes("overflow-x-auto") || className.includes("snap-x")) return true;
        const style = window.getComputedStyle(node);
        if ((style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth + 2) return true;
      }
      return false;
    };
    const selectorFor = (element) => {
      const tag = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : "";
      const className = typeof element.className === "string" && element.className.trim()
        ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
      return `${tag}${id}${className}`;
    };
    return [...document.body.querySelectorAll("a,button,input,textarea,select,label,article,section,div")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return null;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
        const className = typeof element.className === "string" ? element.className : "";
        if (className.includes("nav-scroll") || className.includes("overflow-x-auto") || className.includes("snap-x")) return null;
        if (allowedOverflowAncestor(element)) return null;
        if (rect.left < -2 || rect.right > viewportWidth + 2) {
          return {
            selector: selectorFor(element),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            viewportWidth
          };
        }
        return null;
      })
      .filter(Boolean);
  });
}

async function warmLazyMedia(page) {
  await page.evaluate(async () => {
    const step = Math.max(240, Math.floor(window.innerHeight * 0.72));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle").catch(() => {});
}
