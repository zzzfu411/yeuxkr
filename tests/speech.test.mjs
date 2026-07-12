import test from "node:test";
import assert from "node:assert/strict";

const spoken = [];
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

const { speakKorean, speakSequence, stopSpeech } = await import("../src/lib/speech.js");

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
