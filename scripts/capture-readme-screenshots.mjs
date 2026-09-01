import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hangulGroups } from "../src/data/hangul.js";
import { grammarPoints } from "../src/data/grammar.js";
import { vocab } from "../src/data/lexicon.js";
import { PATH_SEQUENCE } from "../src/data/lessons/path-sequence.js";

const baseUrl = process.env.KIRINA_URL ?? "http://127.0.0.1:4173";
const docsDir = new URL("../docs/screenshots/", import.meta.url);
const pwaDir = new URL("../public/assets/screenshots/", import.meta.url);
mkdirSync(fileURLToPath(docsDir), { recursive: true });
mkdirSync(fileURLToPath(pwaDir), { recursive: true });

const hangulIds = hangulGroups.flatMap((group) => group.items.map((item) => item.id));
const vocabIds = vocab.slice(0, 48).map((item) => item.id);
const grammarIds = grammarPoints.slice(0, 10).map((item) => item.id);
const throughShopping = PATH_SEQUENCE.slice(0, PATH_SEQUENCE.indexOf("l11-shopping-price") + 1);

function seedLearner({ dueReview = false, completedLessons = [], hangulIds = [], vocabIds = [], grammarIds = [] } = {}) {
  const now = new Date().toISOString();
  const lessonScores = Object.fromEntries(completedLessons.map((id) => [id, 92]));
  localStorage.setItem("yeuxkr.theme", "yuan");
  document.documentElement.setAttribute("data-theme", "yuan");
  localStorage.setItem("kirina.speech.v1", JSON.stringify({ dismissedVoiceWarning: true }));
  localStorage.setItem("kirina.profile.v2", JSON.stringify({
    name: "Learner",
    studyMode: "guided",
    selfStudyGoal: "native",
    selfStudyIntensity: "steady",
    selfStudyFocus: "conversation",
    minutesGoal: 25,
    romanization: "fade",
    onboardedAt: now,
    createdAt: now,
    updatedAt: now
  }));
  localStorage.setItem("kirina.progress.v2", JSON.stringify({
    completedLessons,
    lessonScores,
    previewLessonScores: {},
    lessonListeningEvidence: {},
    lessonProductionEvidence: {},
    lessonTaskEvidence: {},
    masteredHangul: hangulIds,
    learnedVocab: vocabIds,
    learnedGrammar: grammarIds,
    learnedNative: [],
    nativeEvidence: {},
    completedMaterials: [],
    materialEvidence: {},
    capstoneEvidence: null,
    completedCheckpoints: [],
    checkpointEvidence: {},
    completedTasks: {},
    ability: { script: 42, listening: 22, vocabulary: 28, grammar: 14, pragmatics: 4, native: 2 },
    abilityEvents: {},
    practiceItems: {},
    streak: 4,
    lastStudyDate: now.slice(0, 10),
    minutesGoal: 25,
    updatedAt: now
  }));
  localStorage.setItem("kirina.srs.v2", JSON.stringify({
    cards: dueReview
      ? {
          "hangul:v-a": {
            id: "hangul:v-a",
            box: 1,
            dueAt: Date.now() - 1000,
            correct: 3,
            wrong: 0,
            lastSeenAt: null,
            payload: { kind: "hangul", itemId: "v-a", prompt: "ㅏ", answer: "a" }
          },
          "vocab:v-annyeonghaseyo": {
            id: "vocab:v-annyeonghaseyo",
            box: 1,
            dueAt: Date.now() - 500,
            correct: 2,
            wrong: 0,
            lastSeenAt: null,
            payload: { kind: "vocab", itemId: "v-annyeonghaseyo", prompt: "안녕하세요", answer: "你好" }
          },
          "mistake:cafe-order": {
            id: "mistake:cafe-order",
            box: 0,
            dueAt: Date.now() - 250,
            correct: 0,
            wrong: 1,
            lastSeenAt: null,
            payload: {
              kind: "mistake",
              itemId: "cafe-order",
              type: "choice",
              prompt: "咖啡店点单时，“请给我”最稳妥的说法是？",
              answer: "주세요",
              choices: ["주세요", "해요", "입니다", "고마워요"]
            }
          }
        }
      : {},
    history: []
  }));
  localStorage.setItem("kirina.outputs.v1", JSON.stringify({
    entries: [
      {
        id: "output-cafe",
        materialId: "im-cafe-real-speed",
        materialTitle: "咖啡店真实语速点单",
        mission: "用自己的话完成点单",
        draft: "아이스 아메리카노 하나 포장해 주세요.",
        weakPoint: "포장해 주세요",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        rubric: ["naturalness"],
        createdAt: now
      }
    ]
  }));
}

async function mockSpeech(page) {
  await page.addInitScript(() => {
    class ShowcaseSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    }
    const koreanVoice = { lang: "ko-KR", name: "Kirina Showcase Korean", voiceURI: "kirina-showcase-ko", localService: true };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: ShowcaseSpeechSynthesisUtterance });
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
    class ShowcaseAudio {
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
    Object.defineProperty(window, "Audio", { configurable: true, value: ShowcaseAudio });
  });
}

async function waitForPaper(page, { expectText } = {}) {
  await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "yuan", { timeout: 10_000 });
  await page.waitForFunction(() => {
    const logo = document.querySelector(".logo-mark");
    return logo?.textContent?.includes("YEUX KR");
  }, { timeout: 10_000 });
  if (expectText) {
    await page.getByText(expectText, { exact: false }).first().waitFor({ state: "attached", timeout: 15_000 });
  }
  await page.waitForFunction(() => document.fonts?.status === "loaded", { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((image) => (
      image.complete && image.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })
    )));
  });
  await page.waitForFunction(() => {
    const title = document.querySelector(".np-title");
    if (!title) return true;
    const text = title.textContent ?? "";
    return Boolean(text.trim()) && !text.includes("正在读取") && !text.includes("正在整理");
  }, { timeout: 10_000 });
  await page.waitForTimeout(500);
}

async function preparePage(page, href, seedOptions) {
  await page.goto(`${baseUrl}${href}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(seedLearner, seedOptions);
  await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
}

async function capture(page, dest, name, href, seedOptions, { expectText, afterReady } = {}) {
  await preparePage(page, href, seedOptions);
  await waitForPaper(page, { expectText });
  if (afterReady) await afterReady(page);
  const file = fileURLToPath(new URL(name, dest));
  await page.screenshot({ path: file, fullPage: false, type: "png", animations: "disabled" });
  console.log(`wrote ${file}`);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({
  headless: true,
  args: ["--font-render-hinting=none", "--disable-lcd-text"]
});

const deskSeed = { dueReview: true, completedLessons: throughShopping, hangulIds, vocabIds, grammarIds };
const lessonSeed = { dueReview: false, completedLessons: throughShopping, hangulIds, vocabIds, grammarIds };

const docsContext = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  locale: "zh-CN"
});
await docsContext.addInitScript(() => {
  try {
    localStorage.setItem("yeuxkr.theme", "yuan");
    document.documentElement.setAttribute("data-theme", "yuan");
  } catch {
    // ignore
  }
});
const docsPage = await docsContext.newPage();
await docsPage.emulateMedia({ reducedMotion: "reduce" });
await mockSpeech(docsPage);

await capture(docsPage, docsDir, "hero-workspace.png", "/", deskSeed, {
  expectText: "Kirina Korean",
  afterReady: async (page) => {
    await page.getByText("处理到期复习", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.getByText("今日一页", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
  }
});

await capture(docsPage, docsDir, "hangul.png", "/hangul", deskSeed, {
  expectText: "Hangul Studio",
  afterReady: async (page) => {
    await page.getByText("先拆开音节块", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.getByText("가", { exact: true }).first().waitFor({ timeout: 10_000 });
  }
});

await capture(docsPage, docsDir, "immersion.png", "/immersion?material=im-cafe-real-speed", lessonSeed, {
  expectText: "咖啡店真实语速",
  afterReady: async (page) => {
    await page.getByRole("button", { name: "进入听写练习" }).click();
    await page.getByText("逐句听读", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.getByText("遮译文听写", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.evaluate(() => {
      const listen = document.getElementById("material-listen-practice");
      if (!listen) return;
      listen.scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollBy(0, -72);
    });
    await page.waitForTimeout(250);
  }
});

await capture(docsPage, docsDir, "path.png", "/path", deskSeed, {
  expectText: "五阶段能力路线",
  afterReady: async (page) => {
    await page.getByText("文字与声音对齐", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.getByText("语域桥接", { exact: false }).first().waitFor({ timeout: 10_000 });
  }
});

await capture(docsPage, docsDir, "review.png", "/review", deskSeed, {
  expectText: "到期队列",
  afterReady: async (page) => {
    await page.getByText("ㅏ", { exact: false }).first().waitFor({ timeout: 10_000 });
  }
});

await capture(docsPage, docsDir, "lesson.png", "/learn/l06-cafe", lessonSeed, {
  expectText: "咖啡店点单",
  afterReady: async (page) => {
    await page.getByText("先建立直觉", { exact: false }).first().waitFor({ timeout: 10_000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
  }
});

await docsContext.close();

const wideContext = await browser.newContext({
  viewport: { width: 1440, height: 980 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  locale: "zh-CN"
});
await wideContext.addInitScript(() => {
  try {
    localStorage.setItem("yeuxkr.theme", "yuan");
    document.documentElement.setAttribute("data-theme", "yuan");
  } catch {
    // ignore
  }
});
const widePage = await wideContext.newPage();
await widePage.emulateMedia({ reducedMotion: "reduce" });
await mockSpeech(widePage);
await capture(widePage, pwaDir, "home-wide.png", "/", deskSeed, {
  expectText: "Kirina Korean"
});
await wideContext.close();

const narrowContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  locale: "zh-CN",
  isMobile: true,
  hasTouch: true
});
await narrowContext.addInitScript(() => {
  try {
    localStorage.setItem("yeuxkr.theme", "yuan");
    document.documentElement.setAttribute("data-theme", "yuan");
  } catch {
    // ignore
  }
});
const narrowPage = await narrowContext.newPage();
await narrowPage.emulateMedia({ reducedMotion: "reduce" });
await mockSpeech(narrowPage);
await capture(narrowPage, pwaDir, "home-narrow.png", "/", deskSeed, {
  expectText: "오늘, 한 장의 한국어."
});
await narrowContext.close();

await browser.close();
console.log("README and PWA screenshots captured from the running production app.");
