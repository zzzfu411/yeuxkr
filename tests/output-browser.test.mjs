import test from "node:test";
import assert from "node:assert/strict";

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

const { addOutputEntry, clearOutputEntries, clearOutputEntriesByMaterial, getOutputState, removeOutputEntry } = await import("../src/lib/learning/output.ts");

test("output archive tolerates old or damaged localStorage", () => {
  store.clear();
  store.set("kirina.outputs.v1", JSON.stringify({}));

  assert.deepEqual(getOutputState(), { entries: [] });
});

test("legacy output entries fall back from target rewrite to weak point", () => {
  store.clear();
  store.set("kirina.outputs.v1", JSON.stringify({
    entries: [
      {
        id: "legacy-output",
        materialId: "im-cafe-real-speed",
        materialTitle: "咖啡店真实语速点单",
        mission: "mission",
        draft: "아이스 아메리카노 하나 주세요.",
        weakPoint: "포장해 주세요",
        rubric: [],
        createdAt: "2026-06-09T00:00:00.000Z"
      }
    ]
  }));

  assert.equal(getOutputState().entries[0].targetRewrite, "포장해 주세요");
});

test("output archive reports write failure instead of pretending to save", () => {
  store.clear();
  try {
    blockWrites = true;
    const entry = addOutputEntry({
      materialId: "im-cafe-real-speed",
    materialTitle: "咖啡店真实语速点单",
    mission: "mission",
    draft: "아이스 아메리카노 하나 주세요.",
    weakPoint: "포장해 주세요",
    targetRewrite: "포장해서 주세요.",
    rubric: ["naturalness"]
  });

    assert.equal(entry, null);
    assert.deepEqual(getOutputState(), { entries: [] });
  } finally {
    blockWrites = false;
  }
});

test("output archive stores newest entry first and can be cleared", () => {
  store.clear();
  const first = addOutputEntry({
    materialId: "im-cafe-real-speed",
    materialTitle: "咖啡店真实语速点单",
    mission: "mission",
    draft: "아이스 아메리카노 하나 주세요.",
    weakPoint: "포장해 주세요",
    targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
    rubric: ["structure", "naturalness"]
  });
  const second = addOutputEntry({
    materialId: "im-weekend-plan",
    materialTitle: "约周末计划和改期",
    mission: "mission",
    draft: "일요일 점심은 어때요?",
    weakPoint: "힘들 것 같아요",
    targetRewrite: "토요일은 힘들 것 같아요.",
    rubric: ["register"]
  });

  const state = getOutputState();
  assert.equal(state.entries.length, 2);
  assert.equal(state.entries[0].id, second.id);
  assert.equal(state.entries[1].id, first.id);
  assert.deepEqual(state.entries[0].rubric, ["register"]);
  assert.equal(state.entries[0].targetRewrite, "토요일은 힘들 것 같아요.");

  assert.deepEqual(clearOutputEntriesByMaterial("im-weekend-plan"), [second.id]);
  const scopedState = getOutputState();
  assert.equal(scopedState.entries.length, 1);
  assert.equal(scopedState.entries[0].id, first.id);
  assert.deepEqual(clearOutputEntriesByMaterial("missing-material"), []);

  clearOutputEntries();
  assert.deepEqual(getOutputState(), { entries: [] });
});

test("output archive can remove one failed entry without clearing other work", () => {
  store.clear();
  const first = addOutputEntry({
    materialId: "im-cafe-real-speed",
    materialTitle: "咖啡店真实语速点单",
    mission: "mission",
    draft: "아이스 아메리카노 하나 주세요.",
    weakPoint: "포장해 주세요",
    targetRewrite: "아이스 아메리카노 하나 포장해 주세요.",
    rubric: ["structure"]
  });
  const second = addOutputEntry({
    materialId: "im-cafe-real-speed",
    materialTitle: "咖啡店真实语速点单",
    mission: "mission",
    draft: "물 주세요.",
    weakPoint: "주세요",
    targetRewrite: "물 한 잔 주세요.",
    rubric: ["naturalness"]
  });

  assert.equal(removeOutputEntry(second.id), true);
  assert.equal(removeOutputEntry("missing-entry"), false);

  const state = getOutputState();
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].id, first.id);
  assert.equal(state.entries[0].targetRewrite, "아이스 아메리카노 하나 포장해 주세요.");
});
