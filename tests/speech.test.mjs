import test from "node:test";
import assert from "node:assert/strict";

const spoken = [];
const utterances = [];
const audioInstances = [];
const windowListeners = new Map();
const synthListeners = new Map();
let cancelCount = 0;
let voices = [];

class TestAudio {
  constructor(source) {
    this.src = source;
    this.currentTime = 0;
    this.paused = false;
    audioInstances.push(this);
  }

  play() {
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

class TestCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function addListener(registry, name, handler) {
  const listeners = registry.get(name) ?? new Set();
  listeners.add(handler);
  registry.set(name, listeners);
}

function removeListener(registry, name, handler) {
  registry.get(name)?.delete(handler);
}

function emit(registry, name, event = { type: name }) {
  for (const handler of registry.get(name) ?? []) handler(event);
}

global.window = {
  setTimeout(...args) {
    return setTimeout(...args);
  },
  clearTimeout(...args) {
    return clearTimeout(...args);
  },
  CustomEvent: TestCustomEvent,
  navigator: { onLine: true },
  addEventListener(name, handler) {
    addListener(windowListeners, name, handler);
  },
  removeEventListener(name, handler) {
    removeListener(windowListeners, name, handler);
  },
  dispatchEvent(event) {
    emit(windowListeners, event.type, event);
    return true;
  },
  speechSynthesis: {
    cancel() {
      cancelCount += 1;
    },
    speak(utterance) {
      spoken.push(utterance.text);
      utterances.push(utterance);
    },
    getVoices() {
      return voices;
    },
    addEventListener(name, handler) {
      addListener(synthListeners, name, handler);
    },
    removeEventListener(name, handler) {
      removeListener(synthListeners, name, handler);
    }
  }
};

global.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
  }
};
global.window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;

const {
  __resetSpeechRuntimeForTests,
  canPlayBundledSpeech,
  ensureVoicesReady,
  getBundledSpeechAsset,
  getKoreanVoiceStatus,
  getSpeechSettings,
  normalizeSpeechSettings,
  saveSpeechSettings,
  speakKorean,
  speakSequence,
  stopSpeech,
  SPEECH_EVENT_NAME
} = await import("../src/lib/speech.js");

test.beforeEach(() => {
  spoken.length = 0;
  utterances.length = 0;
  audioInstances.length = 0;
  cancelCount = 0;
  voices = [{ lang: "ko-KR", name: "Korean", voiceURI: "ko-default", localService: true }];
  windowListeners.clear();
  synthListeners.clear();
  global.window.navigator = { onLine: true };
  delete global.window.Audio;
  delete global.window.localStorage;
  __resetSpeechRuntimeForTests();
});

test("bundled Korean recordings work without the browser speech synthesis API", () => {
  const events = [];
  const synthesis = global.window.speechSynthesis;
  const utteranceConstructor = global.window.SpeechSynthesisUtterance;
  delete global.window.speechSynthesis;
  delete global.window.SpeechSynthesisUtterance;
  global.window.Audio = TestAudio;
  global.window.addEventListener(SPEECH_EVENT_NAME, (event) => events.push(event.detail));

  try {
    assert.equal(canPlayBundledSpeech(), true);
    assert.equal(getKoreanVoiceStatus(), "ready");
    assert.match(getBundledSpeechAsset(" 우 "), /^\/assets\/audio\/ko\/[a-f0-9]{20}\.mp3$/);
    assert.notEqual(getBundledSpeechAsset("우"), getBundledSpeechAsset("우유"));
    assert.equal(speakKorean("우"), true);
    assert.equal(audioInstances.length, 1);
    assert.equal(audioInstances[0].src, getBundledSpeechAsset("우"));
    assert.equal(audioInstances[0].playbackRate, 1);

    audioInstances[0].onplaying({});
    audioInstances[0].onended({});
    assert.deepEqual(events.map((event) => event.type), ["playback-start", "playback-end"]);
    assert.equal(events[0].engine, "bundled");
  } finally {
    global.window.speechSynthesis = synthesis;
    global.window.SpeechSynthesisUtterance = utteranceConstructor;
  }
});

test("system Korean speech remains the fallback for content without a bundled recording", () => {
  global.window.Audio = TestAudio;
  assert.equal(getBundledSpeechAsset("테스트에서만 쓰는 미등록 문장"), null);
  assert.equal(speakKorean("테스트에서만 쓰는 미등록 문장"), true);
  assert.deepEqual(spoken, ["테스트에서만 쓰는 미등록 문장"]);
  assert.equal(audioInstances.length, 0);
});

test("stopSpeech pauses bundled playback and clears a pending sequence", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  global.window.Audio = TestAudio;

  assert.equal(speakSequence(["우", "유"], 100), true);
  audioInstances[0].onplaying({});
  assert.equal(stopSpeech(), true);
  context.mock.timers.tick(200);

  assert.equal(audioInstances.length, 1);
  assert.equal(audioInstances[0].paused, true);
});

test("speech sequence waits for one utterance to end before applying the gap", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });

  assert.equal(speakSequence(["하나", "둘"], 100), true);
  assert.deepEqual(spoken, ["하나"]);

  utterances[0].onend({});
  context.mock.timers.tick(99);
  assert.deepEqual(spoken, ["하나"]);
  context.mock.timers.tick(1);
  assert.deepEqual(spoken, ["하나", "둘"]);
  assert.equal(utterances[0].rate, utterances[1].rate);
});

test("starting a new sequence cancels the previous pending continuation", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });

  speakSequence(["첫째", "둘째"], 100);
  utterances[0].onend({});
  speakSequence(["새 문장"], 100);
  context.mock.timers.tick(200);

  assert.deepEqual(spoken, ["첫째", "새 문장"]);
  assert.equal(cancelCount >= 2, true);
});

test("single utterance clears pending sequence timers", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });

  speakSequence(["가", "나"], 100);
  utterances[0].onend({});
  speakKorean("다");
  context.mock.timers.tick(200);

  assert.deepEqual(spoken, ["가", "다"]);
});

test("stopSpeech cancels active and pending speech", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });

  speakSequence(["안녕", "반가워요"], 100);
  utterances[0].onend({});
  assert.equal(stopSpeech(), true);
  context.mock.timers.tick(200);

  assert.deepEqual(spoken, ["안녕"]);
});

test("speakKorean waits for a Korean voice instead of any first-loaded voice", async () => {
  voices = [];
  assert.equal(speakKorean("어"), true);
  assert.deepEqual(spoken, []);

  voices = [{ lang: "en-US", name: "English" }];
  emit(synthListeners, "voiceschanged");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(spoken, []);

  voices = [{ lang: "en-US", name: "English" }, { lang: "ko-KR", name: "Korean" }];
  emit(synthListeners, "voiceschanged");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(spoken, ["어"]);
});

test("a superseded pending utterance stays silent after voices load", async () => {
  voices = [];
  speakKorean("하나");
  speakKorean("둘");
  voices = [{ lang: "ko-KR", name: "Korean" }];
  emit(synthListeners, "voiceschanged");
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(spoken, ["둘"]);
});

test("ensureVoicesReady resolves immediately when a Korean voice exists", async () => {
  const result = await ensureVoicesReady();
  assert.equal(result.length, 1);
  assert.equal(result[0].lang, "ko-KR");
});

test("voice status moves from loading to missing after a completed probe", async () => {
  voices = [];
  assert.equal(getKoreanVoiceStatus(), "loading");
  await ensureVoicesReady(0);
  assert.equal(getKoreanVoiceStatus(), "missing");
  voices = [{ lang: "en-US", name: "English" }];
  assert.equal(getKoreanVoiceStatus(), "missing");
  voices = [{ lang: "ko-KR", name: "Korean" }];
  assert.equal(getKoreanVoiceStatus(), "ready");
});

test("offline playback ignores a saved remote voice and selects a local Korean voice", () => {
  const store = new Map();
  global.window.navigator = { onLine: false };
  global.window.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  };
  voices = [
    { lang: "ko-KR", name: "Remote Korean", voiceURI: "remote-ko", localService: false },
    { lang: "ko-KR", name: "Local Korean", voiceURI: "local-ko", localService: true }
  ];
  saveSpeechSettings({ voiceURI: "remote-ko" });

  assert.equal(speakKorean("오프라인"), true);
  assert.equal(utterances[0].voice.voiceURI, "local-ko");
  assert.equal(getKoreanVoiceStatus(), "ready");
});

test("speech errors dispatch observable events and preserve playback callbacks", () => {
  const events = [];
  let callbackError = null;
  let callbackStarted = false;
  global.window.addEventListener(SPEECH_EVENT_NAME, (event) => events.push(event.detail));

  speakKorean("오류", {
    onstart() {
      callbackStarted = true;
    },
    onerror(event) {
      callbackError = event;
    }
  });
  utterances[0].onstart({});
  const errorEvent = { error: "network" };
  utterances[0].onerror(errorEvent);

  assert.equal(callbackStarted, true);
  assert.equal(callbackError, errorEvent);
  assert.equal(events[0].type, "playback-start");
  assert.deepEqual(events[1], {
    type: "playback-error",
    reason: "synthesis-error",
    offline: false,
    error: "network",
    requestId: 1
  });
});

test("a synchronous speech engine failure reports an error and advances sequences", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const events = [];
  const originalSpeak = global.window.speechSynthesis.speak;
  global.window.addEventListener(SPEECH_EVENT_NAME, (event) => events.push(event.detail));
  global.window.speechSynthesis.speak = () => {
    throw new DOMException("engine unavailable", "InvalidStateError");
  };

  assert.equal(speakSequence(["하나", "둘"], 10), true);
  context.mock.timers.tick(10);
  assert.equal(events.filter((event) => event.type === "playback-error").length, 2);
  assert.equal(events[0].error, "InvalidStateError");

  global.window.speechSynthesis.speak = originalSpeak;
});

test("active cancellation errors from an old utterance do not overwrite the new request", () => {
  const events = [];
  global.window.addEventListener(SPEECH_EVENT_NAME, (event) => events.push(event.detail));

  speakKorean("이전");
  const previous = utterances[0];
  speakKorean("현재");
  previous.onerror({ error: "canceled" });
  utterances[1].onstart({});

  assert.deepEqual(events.map((event) => event.type), ["playback-start"]);
});

test("missing Korean voices finish with a playback error instead of staying loading", async () => {
  const events = [];
  voices = [{ lang: "en-US", name: "English" }];
  global.window.addEventListener(SPEECH_EVENT_NAME, (event) => events.push(event.detail));
  await ensureVoicesReady(0);

  assert.equal(speakKorean("실패"), false);
  assert.deepEqual(spoken, []);
  assert.deepEqual(events.at(-1), {
    type: "playback-error",
    reason: "voice-unavailable",
    offline: false
  });
});

test("speech settings persist, clamp, and apply to playback rate", () => {
  const store = new Map();
  global.window.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };

  assert.deepEqual(getSpeechSettings(), {});
  assert.equal(saveSpeechSettings({ rate: 9 }), true);
  assert.equal(getSpeechSettings().rate, 1.1);
  assert.equal(saveSpeechSettings({ rate: 0.7, voiceURI: "ko-voice-1", dismissedVoiceWarning: true }), true);
  assert.deepEqual(getSpeechSettings(), { voiceURI: "ko-voice-1", rate: 0.7, dismissedVoiceWarning: true });

  speakKorean("다");
  assert.equal(utterances[0].rate, 0.7);
  speakKorean("라", { rate: 0.9 });
  assert.equal(utterances[1].rate, 0.9);
});

test("blocked localStorage falls back to defaults without breaking playback", () => {
  Object.defineProperty(global.window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("blocked", "SecurityError");
    }
  });

  assert.deepEqual(getSpeechSettings(), {});
  assert.equal(speakKorean("저장소"), true);
  assert.deepEqual(spoken, ["저장소"]);
  delete global.window.localStorage;
});

test("normalizeSpeechSettings drops junk fields", () => {
  assert.deepEqual(normalizeSpeechSettings({ voiceURI: "  ", rate: "abc", dismissedVoiceWarning: "yes", extra: 1 }), {});
  assert.deepEqual(normalizeSpeechSettings({ voiceURI: "v", rate: 0.2, dismissedVoiceWarning: true }), { voiceURI: "v", rate: 0.6, dismissedVoiceWarning: true });
  assert.deepEqual(normalizeSpeechSettings(null), {});
});
