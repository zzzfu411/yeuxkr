import test from "node:test";
import assert from "node:assert/strict";
import {
  NATIVE_PORTFOLIO_SCHEMA_VERSION,
  NATIVE_PORTFOLIO_STORAGE_KEY,
  addNativePortfolioEntry,
  countSavedCollocationEvidence,
  deleteNativePortfolioEntry,
  getNativePortfolioStateFromRaw,
  getSavedCollocationEvidence,
  normalizeNativePortfolioState,
  reviseNativePortfolioEntry
} from "../src/lib/learning/native-portfolio.ts";
import { isNativeRoadmapStageComplete, nativeRoadmapStages } from "../src/data/native-roadmap.js";

const store = new Map();
let blockWrites = false;

global.window = {
  localStorage: {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      if (blockWrites) throw new Error("blocked write");
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  },
  dispatchEvent() {}
};

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

const completeDraft = {
  title: "新闻评论录音",
  source: "KBS 뉴스 2026-07-14",
  sourceUrl: "https://news.kbs.co.kr/",
  learningMinutes: 45,
  recordingMinutes: 8,
  mentorFeedback: "结尾立场需要更明确。",
  body: "이 문제는 개인의 선택만으로 설명하기 어렵습니다."
};

test.beforeEach(() => {
  store.clear();
  blockWrites = false;
});

test("saved collocation evidence only counts distinct collocations on persisted learned vocab ids", () => {
  const catalog = [
    {
      id: "saved-a",
      collocations: [
        { ko: "영향을 주다", zh: "施加影响" },
        { ko: "문을 열다", zh: "开门" }
      ]
    },
    {
      id: "saved-b",
      collocations: [
        { ko: "  영향을   주다 ", zh: "产生影响" },
        { ko: "입장을 밝히다", zh: "表明立场" }
      ]
    },
    {
      id: "not-saved",
      collocations: [{ ko: "근거를 제시하다", zh: "提出依据" }]
    }
  ];

  const evidence = getSavedCollocationEvidence(["saved-a", "saved-b", "missing"], catalog);
  assert.equal(evidence.length, 3);
  assert.equal(countSavedCollocationEvidence(["saved-a"], catalog), 2);
  assert.equal(evidence.some((item) => item.ko === "근거를 제시하다"), false);
  assert.deepEqual(evidence.find((item) => item.ko === "영향을 주다")?.vocabIds, ["saved-a", "saved-b"]);
});

test("C1 preview completion requires collocation evidence", () => {
  const preview = nativeRoadmapStages.find((stage) => stage.id === "in-app-domain-transfer");
  const evidence = { ...preview.deliverables };

  assert.equal(isNativeRoadmapStageComplete(preview, { ...evidence, collocations: evidence.collocations - 1 }), false);
  assert.equal(isNativeRoadmapStageComplete(preview, evidence), true);
});

test("legacy array and legacy field names normalize into the current portfolio schema", () => {
  const legacy = [{
    id: "legacy-work",
    name: "旧版评论",
    materialSource: "EBS 라디오",
    url: "https://www.ebs.co.kr/",
    studyMinutes: "35",
    audioMinutes: 6,
    feedback: "连接词需要调整。",
    content: "초고 본문입니다.",
    createdAt: "2026-07-01T00:00:00.000Z",
    history: [{
      content: "첫 번째 초고입니다.",
      changeNote: "导入初稿",
      createdAt: "2026-06-30T00:00:00.000Z"
    }]
  }];

  const state = normalizeNativePortfolioState(legacy);
  assert.equal(state.version, NATIVE_PORTFOLIO_SCHEMA_VERSION);
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].title, "旧版评论");
  assert.equal(state.entries[0].source, "EBS 라디오");
  assert.equal(state.entries[0].learningMinutes, 35);
  assert.equal(state.entries[0].recordingMinutes, 6);
  assert.equal(state.entries[0].mentorFeedback, "连接词需要调整。");
  assert.equal(state.entries[0].revisions[0].body, "첫 번째 초고입니다.");
  assert.equal(getNativePortfolioStateFromRaw("{broken").entries.length, 0);
});

test("portfolio persistence creates, revises with history, and deletes against the latest saved state", () => {
  assert.equal(addNativePortfolioEntry(completeDraft), true);
  const created = getNativePortfolioStateFromRaw(store.get(NATIVE_PORTFOLIO_STORAGE_KEY));
  assert.equal(created.entries.length, 1);
  assert.equal(created.entries[0].revisions.length, 1);

  const entryId = created.entries[0].id;
  const revisedDraft = {
    ...completeDraft,
    learningMinutes: 70,
    recordingMinutes: 14,
    mentorFeedback: "结尾立场已经清楚。",
    body: "이 문제는 개인의 선택을 넘어 제도적 맥락에서 살펴봐야 합니다."
  };
  assert.equal(reviseNativePortfolioEntry(entryId, revisedDraft, "根据导师反馈重写论点"), true);

  const revised = getNativePortfolioStateFromRaw(store.get(NATIVE_PORTFOLIO_STORAGE_KEY));
  assert.equal(revised.entries[0].body, revisedDraft.body);
  assert.equal(revised.entries[0].learningMinutes, 70);
  assert.equal(revised.entries[0].revisions.length, 2);
  assert.equal(revised.entries[0].revisions[0].body, completeDraft.body);
  assert.equal(revised.entries[0].revisions[1].note, "根据导师反馈重写论点");

  assert.equal(deleteNativePortfolioEntry(entryId), true);
  assert.equal(getNativePortfolioStateFromRaw(store.get(NATIVE_PORTFOLIO_STORAGE_KEY)).entries.length, 0);
});

test("invalid drafts and failed browser writes do not replace saved portfolio evidence", () => {
  assert.equal(addNativePortfolioEntry({ ...completeDraft, body: "" }), false);
  assert.equal(store.has(NATIVE_PORTFOLIO_STORAGE_KEY), false);

  assert.equal(addNativePortfolioEntry(completeDraft), true);
  const savedRaw = store.get(NATIVE_PORTFOLIO_STORAGE_KEY);
  blockWrites = true;
  assert.equal(addNativePortfolioEntry({ ...completeDraft, title: "第二条作品" }), false);
  assert.equal(store.get(NATIVE_PORTFOLIO_STORAGE_KEY), savedRaw);
});
