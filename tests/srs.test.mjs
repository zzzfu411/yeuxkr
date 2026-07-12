import test from "node:test";
import assert from "node:assert/strict";
import { BOX_INTERVALS } from "./helpers/srs-core.mjs";
import { todayKey } from "../src/lib/learning/storage.ts";

test("SRS intervals are non-decreasing", () => {
  for (let index = 1; index < BOX_INTERVALS.length; index += 1) {
    assert.equal(BOX_INTERVALS[index] >= BOX_INTERVALS[index - 1], true);
  }
});

test("SRS has enough boxes for long-term memory", () => {
  assert.equal(BOX_INTERVALS.length >= 6, true);
  assert.equal(BOX_INTERVALS.at(-1) >= 1000 * 60 * 60 * 24 * 14, true);
});

test("todayKey uses the local calendar date", () => {
  const date = new Date(2026, 5, 8, 0, 30, 0);
  assert.equal(todayKey(date), "2026-06-08");
});
