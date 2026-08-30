import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPlayQueue,
  firstHangul,
  matchQueueIndex,
  nowPlayingNav,
  pathMatchesTrack,
  splitTrackHref,
  trackProgress,
  wrapQueueIndex
} from "../src/lib/learning/player.ts";

test("play queue skips duplicate hrefs and wraps skip indexes", () => {
  const workspace = {
    recommended: [
      { href: "/review", title: "到期复习", detail: "清队列", minutes: 8, kind: "review" },
      { href: "/learn/l01-hangul-map", title: "韩文地图", detail: "第一课", minutes: 12, kind: "lesson" }
    ],
    openStudy: [
      { href: "/review", title: "复习入口", detail: "重复", minutes: 8, kind: "review" },
      { href: "/hangul", title: "韩文", detail: "字母", minutes: 10, kind: "hangul" }
    ]
  };
  const queue = buildPlayQueue(workspace, false);
  assert.deepEqual(queue.map((track) => track.href), ["/review", "/learn/l01-hangul-map", "/hangul"]);
  assert.equal(matchQueueIndex(queue, "/learn/l01-hangul-map"), 1);
  assert.equal(wrapQueueIndex(0 - 1, queue.length), 2);
  assert.equal(trackProgress(queue[1], "/learn/l01-hangul-map"), 42);
  assert.equal(trackProgress({ ...queue[1], completed: true }, "/path"), 100);
});

test("first visit play queue is only onboarding", () => {
  const workspace = {
    recommended: [{ href: "/learn/l01-hangul-map", title: "韩文地图", detail: "第一课", minutes: 12, kind: "lesson" }],
    openStudy: []
  };
  assert.deepEqual(buildPlayQueue(workspace, true).map((track) => track.href), ["/onboarding"]);
});

test("firstHangul picks a syllable cover glyph", () => {
  assert.equal(firstHangul("안녕하세요", "한"), "안");
  assert.equal(firstHangul("no hangul", "오"), "오");
});

test("path matching keeps home exact and lesson ids distinct", () => {
  assert.equal(pathMatchesTrack("/", "/"), true);
  assert.equal(pathMatchesTrack("/hangul", "/"), false);
  assert.equal(pathMatchesTrack("/learn/l02-vowels", "/learn/l01-hangul-map"), false);
  assert.equal(pathMatchesTrack("/learn/l01-hangul-map", "/learn/l01-hangul-map"), true);
});

test("path matching ignores hash and matches immersion query strings", () => {
  assert.deepEqual(splitTrackHref("/immersion?material=im-cafe-real-speed"), {
    pathname: "/immersion",
    search: "?material=im-cafe-real-speed"
  });
  assert.equal(pathMatchesTrack("/hangul", "/hangul#pairs"), true);
  assert.equal(pathMatchesTrack("/immersion", "/immersion?material=im-cafe-real-speed"), false);
  assert.equal(pathMatchesTrack("/immersion", "/immersion?material=im-cafe-real-speed", "?material=im-cafe-real-speed"), true);
  assert.equal(pathMatchesTrack("/immersion", "/immersion?material=im-cafe-real-speed", "?material=im-other"), false);
});

test("unmatched pages do not pretend to be the first queue track", () => {
  const workspace = {
    recommended: [
      { href: "/review", title: "到期复习", detail: "清队列", minutes: 8, kind: "review" },
      { href: "/immersion?material=im-cafe-real-speed", title: "咖啡店", detail: "材料", minutes: 14, kind: "immersion" }
    ],
    openStudy: []
  };
  const queue = buildPlayQueue(workspace, false);
  assert.equal(matchQueueIndex(queue, "/path"), -1);
  assert.equal(matchQueueIndex(queue, "/settings"), -1);
  assert.equal(matchQueueIndex(queue, "/immersion", "?material=im-cafe-real-speed"), 1);
  assert.equal(matchQueueIndex(queue, "/immersion"), 1);
  assert.equal(matchQueueIndex(queue, "/immersion", "?material=im-other"), -1);
  const unmatched = nowPlayingNav(queue, -1);
  assert.equal(unmatched.inQueue, false);
  assert.equal(unmatched.href, "/review");
  assert.equal(unmatched.nextHref, "/review");
  assert.equal(unmatched.prevHref, "/review");
  const onMaterial = nowPlayingNav(queue, 1);
  assert.equal(onMaterial.inQueue, true);
  assert.equal(onMaterial.nextHref, "/review");
});
