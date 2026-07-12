import test from "node:test";
import assert from "node:assert/strict";

const spoken = [];
const utterances = [];
let cancelCount = 0;

global.window = {
  setTimeout(...args) {
    return setTimeout(...args);
  },
  clearTimeout(...args) {
    return clearTimeout(...args);
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
      return [{ lang: "ko-KR", name: "Korean" }];
    }
  }
};

global.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
  }
};
global.window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;

const { speakKorean, speakSequence, stopSpeech, ensureVoicesReady, getKoreanVoiceStatus, getSpeechSettings, saveSpeechSettings, normalizeSpeechSettings } = await import("../src/lib/speech.js");

test("starting a new sequence cancels pending utterances from the previous sequence", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  spoken.length = 0;
  cancelCount = 0;

  assert.equal(speakSequence(["하나", "둘"], 100), true);
  context.mock.timers.tick(0);
  assert.deepEqual(spoken, ["하나"]);

  assert.equal(speakSequence(["셋"], 100), true);
  context.mock.timers.tick(200);
  assert.deepEqual(spoken, ["하나", "셋"]);
  assert.equal(cancelCount >= 2, true);
});

test("single utterance clears pending sequence timers", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  spoken.length = 0;

  speakSequence(["가", "나"], 100);
  context.mock.timers.tick(0);
  speakKorean("다");
  context.mock.timers.tick(200);

  assert.deepEqual(spoken, ["가", "다"]);
});

test("stopSpeech cancels active and pending speech", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  spoken.length = 0;

  speakSequence(["안녕", "하세요"], 100);
  context.mock.timers.tick(0);
  assert.equal(stopSpeech(), true);
  context.mock.timers.tick(200);

  assert.deepEqual(spoken, ["안녕"]);
});

test("speakKorean waits for voices when the list is initially empty", async () => {
  spoken.length = 0;
  const synth = global.window.speechSynthesis;
  const originalGetVoices = synth.getVoices;
  let voicesList = [];
  const listeners = new Set();
  synth.getVoices = () => voicesList;
  synth.addEventListener = (name, handler) => {
    if (name === "voiceschanged") listeners.add(handler);
  };
  synth.removeEventListener = (name, handler) => {
    listeners.delete(handler);
  };

  assert.equal(speakKorean("어"), true);
  assert.deepEqual(spoken, []);

  voicesList = [{ lang: "ko-KR", name: "Korean" }];
  for (const handler of [...listeners]) handler();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(spoken, ["어"]);
  synth.getVoices = originalGetVoices;
  delete synth.addEventListener;
  delete synth.removeEventListener;
});

test("a superseded pending utterance stays silent after voices load", async () => {
  spoken.length = 0;
  const synth = global.window.speechSynthesis;
  const originalGetVoices = synth.getVoices;
  let voicesList = [];
  const listeners = new Set();
  synth.getVoices = () => voicesList;
  synth.addEventListener = (name, handler) => {
    if (name === "voiceschanged") listeners.add(handler);
  };
  synth.removeEventListener = (name, handler) => {
    listeners.delete(handler);
  };

  speakKorean("하나");
  speakKorean("둘");
  voicesList = [{ lang: "ko-KR", name: "Korean" }];
  for (const handler of [...listeners]) handler();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(spoken, ["둘"]);
  synth.getVoices = originalGetVoices;
  delete synth.addEventListener;
  delete synth.removeEventListener;
});

test("ensureVoicesReady resolves immediately when voices exist", async () => {
  const voices = await ensureVoicesReady();
  assert.equal(voices.length, 1);
  assert.equal(voices[0].lang, "ko-KR");
});

test("getKoreanVoiceStatus distinguishes ready, loading, and missing", () => {
  const synth = global.window.speechSynthesis;
  const original = synth.getVoices;
  assert.equal(getKoreanVoiceStatus(), "ready");
  synth.getVoices = () => [];
  assert.equal(getKoreanVoiceStatus(), "loading");
  synth.getVoices = () => [{ lang: "en-US", name: "English" }];
  assert.equal(getKoreanVoiceStatus(), "missing");
  synth.getVoices = original;
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

  spoken.length = 0;
  utterances.length = 0;
  speakKorean("다");
  assert.equal(utterances[0].rate, 0.7);
  speakKorean("라", { rate: 0.9 });
  assert.equal(utterances[1].rate, 0.9);

  delete global.window.localStorage;
});

test("normalizeSpeechSettings drops junk fields", () => {
  assert.deepEqual(normalizeSpeechSettings({ voiceURI: "  ", rate: "abc", dismissedVoiceWarning: "yes", extra: 1 }), {});
  assert.deepEqual(normalizeSpeechSettings({ voiceURI: "v", rate: 0.2, dismissedVoiceWarning: true }), { voiceURI: "v", rate: 0.6, dismissedVoiceWarning: true });
  assert.deepEqual(normalizeSpeechSettings(null), {});
});
