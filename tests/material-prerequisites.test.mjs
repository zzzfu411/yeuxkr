import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/data/curriculum.js";
import { getMissingMaterialPrerequisiteIds, immersionMaterials } from "../src/data/materials.ts";

const expectedPrerequisites = {
  "im-cafe-real-speed": ["l37-numbers-counters", "l06-cafe", "l11-shopping-price"],
  "im-subway-directions": ["l37-numbers-counters", "l07-location", "l40-requests", "l09-connectors", "l12-time-plans", "l42-ability-obligation"],
  "im-convenience-payment": ["l37-numbers-counters", "l06-cafe", "l11-shopping-price"],
  "im-pharmacy-symptoms": ["l37-numbers-counters", "l09-connectors", "l16-because", "l18-health", "l19-family-honorific"],
  "im-hotel-checkin": ["l07-location", "l38-time-date", "l08-past", "l13-permission", "l42-ability-obligation", "l27-honorific-register"],
  "im-weekend-plan": ["l38-time-date", "l16-because", "l20-invitation", "l10-native-softeners", "l28-soft-refusal"],
  "im-slow-news-climate": ["l39-hamnida", "l42-ability-obligation", "l43-adnominal", "l21-slow-news", "l25-retelling", "l26-indirect-speech"],
  "im-apartment-repair": ["l38-time-date", "l39-hamnida", "l13-permission", "l42-ability-obligation", "l16-because", "l17-phone-message", "l27-honorific-register"],
  "im-clinic-appointment": ["l38-time-date", "l39-hamnida", "l13-permission", "l16-because", "l17-phone-message", "l18-health", "l27-honorific-register", "l28-soft-refusal"],
  "im-group-chat-schedule": ["l07-location", "l38-time-date", "l09-connectors", "l12-time-plans", "l42-ability-obligation", "l20-invitation", "l23-social-posts"],
  "im-weather-alert-news": ["l39-hamnida", "l09-connectors", "l42-ability-obligation", "l16-because", "l43-adnominal", "l21-slow-news"],
  "im-social-review": ["l08-past", "l09-connectors", "l22-media-shadowing", "l23-social-posts", "l24-opinion-paragraph"],
  "im-work-feedback": ["l09-connectors", "l42-ability-obligation", "l27-honorific-register", "l10-native-softeners"],
  "im-podcast-opinion": ["l09-connectors", "l45-desire-intent", "l43-adnominal", "l24-opinion-paragraph", "l26-indirect-speech", "l29-abstract-discussion"],
  "im-news-comment-thread": ["l39-hamnida", "l09-connectors", "l16-because", "l43-adnominal", "l23-social-posts", "l24-opinion-paragraph", "l26-indirect-speech", "l29-abstract-discussion"],
  "im-academic-seminar-question": ["l39-hamnida", "l09-connectors", "l42-ability-obligation", "l45-desire-intent", "l43-adnominal", "l27-honorific-register", "l29-abstract-discussion"],
  "im-opinion-mini-essay": ["l09-connectors", "l15-comparison", "l16-because", "l43-adnominal", "l24-opinion-paragraph", "l26-indirect-speech", "l30-native-capstone"]
};

test("every immersion material declares audited, known prerequisites", () => {
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  assert.equal(immersionMaterials.length, Object.keys(expectedPrerequisites).length);

  for (const material of immersionMaterials) {
    assert.deepEqual(material.requiredLessons, expectedPrerequisites[material.id], material.id);
    assert.equal(new Set(material.requiredLessons).size, material.requiredLessons.length, `${material.id} has duplicate prerequisites`);
    assert.ok(material.requiredLessons.every((lessonId) => lessonIds.has(lessonId)), `${material.id} references an unknown lesson`);
    assert.ok(material.recommendedLessons.every((lessonId) => material.requiredLessons.includes(lessonId)), `${material.id} recommendations must remain completion-safe`);
    assert.notDeepEqual(material.requiredLessons, material.recommendedLessons, `${material.id} must not reuse recommendations as its audit`);
  }
});

test("zero progress keeps every material locked and reports every missing lesson", () => {
  for (const material of immersionMaterials) {
    assert.deepEqual(getMissingMaterialPrerequisiteIds(material), material.requiredLessons, material.id);
    assert.deepEqual(getMissingMaterialPrerequisiteIds(material, []), material.requiredLessons, material.id);
  }
});

test("legacy completedLessons-only progress unlocks without a storage migration", () => {
  for (const material of immersionMaterials) {
    const legacyProgress = { completedLessons: [...material.requiredLessons] };
    assert.deepEqual(getMissingMaterialPrerequisiteIds(material, legacyProgress.completedLessons), [], material.id);

    const partialProgress = { completedLessons: material.requiredLessons.slice(0, -1) };
    assert.deepEqual(
      getMissingMaterialPrerequisiteIds(material, partialProgress.completedLessons),
      material.requiredLessons.slice(-1),
      material.id
    );
  }
});

test("material evidence targets are reachable by the end of each core milestone", () => {
  const targets = { m1: 2, m2: 4, m3: 8 };
  for (const [milestoneId, target] of Object.entries(targets)) {
    const stageEndOrder = Math.max(...lessons.filter((lesson) => lesson.milestone === milestoneId).map((lesson) => lesson.order));
    const masteredIds = lessons.filter((lesson) => lesson.order <= stageEndOrder).map((lesson) => lesson.id);
    const available = immersionMaterials.filter((material) => getMissingMaterialPrerequisiteIds(material, masteredIds).length === 0);
    assert.ok(available.length >= target, `${milestoneId} only exposes ${available.length}/${target} materials`);
  }
});
