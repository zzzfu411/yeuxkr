import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEYS } from "../src/lib/learning/storage.ts";
import {
  clearImmersionMaterialDraft,
  clearSelfStudyCheckpointDraft,
  getImmersionMaterialDraft,
  getLearningDraftStateFromRaw,
  getSelfStudyCheckpointDrafts,
  saveImmersionMaterialDraft,
  saveSelfStudyCheckpointDraft
} from "../src/lib/learning/drafts.ts";

const store = new Map();
let failOnSetKey = "";

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

global.window = {
  localStorage: {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === failOnSetKey) throw new Error("blocked write");
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  },
  dispatchEvent() {}
};

test("learning drafts normalize damaged persisted input", () => {
  const state = getLearningDraftStateFromRaw(JSON.stringify({
    immersion: {
      " im-cafe-real-speed ": {
        dictationEvidence: "  포장해 주세요.  ",
        retellEvidence: "손님은 커피를 주문해요.",
        draft: "아메리카노 주세요.",
        weakPoint: "포장",
        targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
        checkedRubric: ["naturalness", "naturalness", ""],
        selfCheck: ["확인", "확인"],
        selectedOutputId: " output-a ",
        updatedAt: ""
      },
      "": { draft: "drop" }
    },
    selfStudyCheckpoints: {
      " foundation:1 ": { evidence: " 录音 75 秒 ", updatedAt: "" },
      "bad": { evidence: "" }
    }
  }));

  assert.equal(state.immersion["im-cafe-real-speed"].dictationEvidence, "포장해 주세요.");
  assert.deepEqual(state.immersion["im-cafe-real-speed"].checkedRubric, ["naturalness"]);
  assert.deepEqual(state.immersion["im-cafe-real-speed"].selfCheck, ["확인"]);
  assert.equal(state.immersion["im-cafe-real-speed"].selectedOutputId, "output-a");
  assert.equal(state.selfStudyCheckpoints["foundation:1"].evidence, "录音 75 秒");
  assert.equal(state.selfStudyCheckpoints.bad, undefined);
});

test("immersion material drafts save, update, and clear through managed storage", () => {
  store.clear();
  assert.equal(saveImmersionMaterialDraft("im-cafe-real-speed", {
    dictationEvidence: "포장해 주세요.",
    retellEvidence: "손님은 커피를 주문해요.",
    draft: "아메리카노 주세요.",
    weakPoint: "포장",
    targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
    selfCheck: ["是否使用 주세요 或 드릴까요"]
  }), true);

  const saved = getImmersionMaterialDraft("im-cafe-real-speed");
  assert.equal(saved.dictationEvidence, "포장해 주세요.");
  assert.equal(saved.selfCheck.length, 1);

  assert.equal(clearImmersionMaterialDraft("im-cafe-real-speed"), true);
  assert.equal(getImmersionMaterialDraft("im-cafe-real-speed"), null);
});

test("self-study checkpoint drafts save and clear without touching other drafts", () => {
  store.clear();
  assert.equal(saveSelfStudyCheckpointDraft("checkpoint-a", "录音 75 秒，正确率 80%"), true);
  assert.equal(saveSelfStudyCheckpointDraft("checkpoint-b", "韩语输出 3 句"), true);
  assert.equal(getSelfStudyCheckpointDrafts()["checkpoint-a"].evidence, "录音 75 秒，正确率 80%");

  assert.equal(clearSelfStudyCheckpointDraft("checkpoint-a"), true);
  assert.equal(getSelfStudyCheckpointDrafts()["checkpoint-a"], undefined);
  assert.equal(getSelfStudyCheckpointDrafts()["checkpoint-b"].evidence, "韩语输出 3 句");
});

test("draft writes report storage failures", () => {
  store.clear();
  failOnSetKey = STORAGE_KEYS.drafts;
  try {
    assert.equal(saveImmersionMaterialDraft("im-cafe-real-speed", { draft: "아메리카노 주세요." }), false);
    assert.equal(saveSelfStudyCheckpointDraft("checkpoint-a", "录音 75 秒"), false);
  } finally {
    failOnSetKey = "";
  }
});
