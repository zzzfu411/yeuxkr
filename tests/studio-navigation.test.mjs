import test from "node:test";
import assert from "node:assert/strict";
import { navigationGroup, resolvePracticeView, resolveStudyView, studioHref } from "../src/lib/studio-navigation.ts";

test("legacy study, practice and personal routes stay in their parent destination", () => {
  for (const route of ["/path", "/hangul", "/vocabulary", "/grammar", "/immersion", "/native", "/learn/l06-cafe", "/onboarding"]) assert.equal(navigationGroup(route), "/study");
  for (const route of ["/review", "/mistakes", "/quiz"]) assert.equal(navigationGroup(route), "/practice");
  assert.equal(navigationGroup("/self-study"), "/settings");
  assert.equal(navigationGroup("/settings"), "/settings");
  assert.equal(navigationGroup("/unknown"), null);
});

test("unknown or inherited query values fall back to an available page", () => {
  for (const value of [null, "", "constructor", "__proto__", "quiz"]) assert.equal(resolveStudyView(value), "courses");
  for (const value of [null, "", "constructor", "vocabulary"]) assert.equal(resolvePracticeView(value), "review");
  assert.equal(resolveStudyView("listening"), "listening");
  assert.equal(resolvePracticeView("mistakes"), "mistakes");
});

test("material deep links preserve their material, additional query and workbench anchor", () => {
  const href = studioHref("/immersion?material=im-cafe-real-speed&source=review#material-workbench");
  const url = new URL(href, "https://kirina.example");
  assert.equal(url.pathname, "/study");
  assert.equal(url.searchParams.get("view"), "listening");
  assert.equal(url.searchParams.get("material"), "im-cafe-real-speed");
  assert.equal(url.searchParams.get("source"), "review");
  assert.equal(url.hash, "#material-workbench");
  for (const original of ["/learn/l06-cafe#practice", "/onboarding", "/study?view=grammar", "https://example.com/immersion", "//example.com/immersion"]) assert.equal(studioHref(original), original);
});
