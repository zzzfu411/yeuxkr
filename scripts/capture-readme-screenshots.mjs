import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hangulGroups } from "../src/data/hangul.js";
import { grammarPoints } from "../src/data/grammar.js";
import { vocab } from "../src/data/lexicon.js";
import { PATH_SEQUENCE } from "../src/data/lessons/path-sequence.js";

const baseUrl = process.env.KIRINA_URL ?? "http://127.0.0.1:3000";
const outDir = new URL("../docs/screenshots/", import.meta.url);
mkdirSync(fileURLToPath(outDir), { recursive: true });

const hangulIds = hangulGroups.flatMap((group) => group.items.map((item) => item.id));
const vocabIds = vocab.slice(0, 48).map((item) => item.id);
const grammarIds = grammarPoints.slice(0, 10).map((item) => item.id);
const throughShopping = PATH_SEQUENCE.slice(0, PATH_SEQUENCE.indexOf("l11-shopping-price") + 1);

function seedLearner({ dueReview = false, completedLessons = [], hangulIds = [], vocabIds = [], grammarIds = [] } = {}) {
  const now = new Date().toISOString();
  const lessonScores = Object.fromEntries(completedLessons.map((id) => [id, 92]));
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
    masteredHangul: hangulIds,
    learnedVocab: vocabIds,
    learnedGrammar: grammarIds,
    learnedNative: [],
    completedMaterials: [],
    completedTasks: {},
    ability: { script: 42, listening: 22, vocabulary: 28, grammar: 14, pragmatics: 4, native: 2 },
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
          }
        }
      : {},
    history: []
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
  });
}

async function waitForDesk(page) {
  await page.waitForFunction(() => document.fonts?.status === "loaded", { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((image) => (
      image.complete ? Promise.resolve() : new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      })
    )));
  });
  await page.waitForFunction(() => {
    const title = document.querySelector(".np-title");
    return Boolean(title?.textContent?.trim()) && !title.textContent.includes("正在读取");
  }, { timeout: 10_000 });
  await page.waitForFunction(() => {
    const logo = document.querySelector(".logo-mark");
    return logo?.textContent?.includes("YEUX KR");
  }, { timeout: 10_000 });
  await page.waitForTimeout(400);
}

async function capture(page, name, href, seedOptions) {
  await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
  await page.evaluate(seedLearner, seedOptions);
  await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
  await waitForDesk(page);
  const file = fileURLToPath(new URL(name, outDir));
  await page.screenshot({ path: file, fullPage: false, type: "png" });
  console.log(`wrote ${name}`);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 980 },
  deviceScaleFactor: 2,
  colorScheme: "light"
});
await context.addInitScript(() => {
  try {
    localStorage.setItem("yeuxkr.theme", "light");
    document.documentElement.setAttribute("data-theme", "light");
  } catch {
    // ignore
  }
});
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: "reduce" });
await mockSpeech(page);

const deskSeed = { dueReview: false, completedLessons: throughShopping, hangulIds, vocabIds, grammarIds };
const reviewSeed = { dueReview: true, completedLessons: throughShopping, hangulIds, vocabIds, grammarIds };

await capture(page, "hero-desk.png", "/", deskSeed);
await capture(page, "path.png", "/path", deskSeed);
await capture(page, "hangul.png", "/hangul", deskSeed);
await capture(page, "immersion.png", "/immersion?material=im-cafe-real-speed", deskSeed);
await capture(page, "lesson.png", "/learn/l06-cafe", deskSeed);
await capture(page, "review.png", "/review", reviewSeed);

await browser.close();
console.log(`README screenshots saved to ${fileURLToPath(outDir)}`);
