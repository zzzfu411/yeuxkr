import { BUNDLED_SPEECH_ASSETS } from "../data/speech-assets.generated.js";

const defaultOptions = {
  lang: "ko-KR",
  rate: 0.82,
  pitch: 1,
  volume: 1
};

export const SPEECH_SETTINGS_KEY = "kirina.speech.v1";
export const SPEECH_EVENT_NAME = "kirina:speech";
export const SPEECH_EVENT_PLAYBACK_ERROR = "playback-error";
export const SPEECH_EVENT_PLAYBACK_START = "playback-start";
export const SPEECH_EVENT_PLAYBACK_END = "playback-end";
export const SPEECH_RATE_MIN = 0.6;
export const SPEECH_RATE_MAX = 1.1;

let sequenceToken = 0;
let pendingTimers = [];
let voicesReadyPromise = null;
let voiceProbeCompleted = false;
let playbackRequestCounter = 0;
let activePlaybackRequestId = 0;
let activeAudio = null;

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function canPlayBundledSpeech() {
  return typeof window !== "undefined" && typeof window.Audio === "function";
}

export function getBundledSpeechAsset(text) {
  return BUNDLED_SPEECH_ASSETS[normalizeSpeechText(text)] ?? null;
}

export function normalizeSpeechSettings(input) {
  const source = input && typeof input === "object" ? input : {};
  const settings = {};
  if (typeof source.voiceURI === "string" && source.voiceURI.trim()) settings.voiceURI = source.voiceURI;
  const rate = Number(source.rate);
  if (Number.isFinite(rate) && rate > 0) settings.rate = Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate));
  if (source.dismissedVoiceWarning === true) settings.dismissedVoiceWarning = true;
  return settings;
}

export function getSpeechSettings() {
  if (typeof window === "undefined") return {};
  try {
    const storage = window.localStorage;
    if (!storage) return {};
    const raw = storage.getItem(SPEECH_SETTINGS_KEY);
    if (!raw) return {};
    return normalizeSpeechSettings(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveSpeechSettings(input = {}) {
  if (typeof window === "undefined") return false;
  try {
    const storage = window.localStorage;
    if (!storage) return false;
    const next = normalizeSpeechSettings({ ...getSpeechSettings(), ...input });
    storage.setItem(SPEECH_SETTINGS_KEY, JSON.stringify(next));
    dispatchSpeechEvent({ key: SPEECH_SETTINGS_KEY });
    return true;
  } catch {
    return false;
  }
}

export function ensureVoicesReady(timeoutMs = 2000) {
  if (!canSpeak()) {
    voiceProbeCompleted = true;
    return Promise.resolve([]);
  }

  const current = getAvailableKoreanVoices();
  if (current.length) {
    voiceProbeCompleted = true;
    return Promise.resolve(current);
  }
  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let settled = false;
    let timer;

    const cleanup = () => {
      if (typeof synth.removeEventListener === "function") synth.removeEventListener("voiceschanged", check);
      else if ("onvoiceschanged" in synth && synth.onvoiceschanged === check) synth.onvoiceschanged = null;
      if (timer != null) window.clearTimeout(timer);
    };
    const finish = (voices) => {
      if (settled) return;
      settled = true;
      cleanup();
      voiceProbeCompleted = true;
      voicesReadyPromise = null;
      resolve(voices);
    };
    const check = () => {
      const voices = getAvailableKoreanVoices();
      if (voices.length) finish(voices);
    };

    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", check);
    else if ("onvoiceschanged" in synth) synth.onvoiceschanged = check;
    timer = window.setTimeout(() => finish(getAvailableKoreanVoices()), timeoutMs);
    check();
  });

  return voicesReadyPromise;
}

export function getKoreanVoiceStatus() {
  if (canPlayBundledSpeech()) return "ready";
  if (!canSpeak()) return "unsupported";
  if (getAvailableKoreanVoices().length) return "ready";
  return voiceProbeCompleted ? "missing" : "loading";
}

const GESTURE_BLOCK_TOKENS = new Set([
  "NotAllowedError",
  "play-rejected",
  "needs-gesture",
  "not-allowed"
]);

function isGestureBlockToken(value) {
  return typeof value === "string" && GESTURE_BLOCK_TOKENS.has(value);
}

export function isGestureBlockedPlaybackError(error) {
  if (!error) return false;
  if (typeof error === "string") {
    return isGestureBlockToken(error);
  }
  if (typeof error !== "object") return false;
  if (error.reason === "needs-gesture") return true;
  const nested = error.error;
  const name = typeof error.name === "string"
    ? error.name
    : typeof nested === "string"
      ? nested
      : typeof nested?.name === "string"
        ? nested.name
        : "";
  return isGestureBlockToken(name);
}

export function listKoreanVoices() {
  if (!canSpeak()) return [];
  return getAvailableKoreanVoices();
}

export function speakKorean(text, options = {}) {
  const normalizedText = normalizeSpeechText(text);
  if (!normalizedText) return false;

  if (options.sequenceToken == null) invalidateSequence();
  if (options.cancel !== false) cancelPlayback();

  const bundledAsset = getBundledSpeechAsset(normalizedText);
  if (bundledAsset && canPlayBundledSpeech()) {
    return playBundledSpeech(normalizedText, bundledAsset, options);
  }

  if (!canSpeak()) {
    const reason = canPlayBundledSpeech() ? "asset-unavailable" : "unsupported";
    reportPlaybackFailure(options, reason);
    return false;
  }

  if (getAvailableKoreanVoices().length) {
    return speakNow(normalizedText, options);
  }

  if (voiceProbeCompleted) {
    reportPlaybackFailure(options, "voice-unavailable");
    return false;
  }

  const token = options.sequenceToken ?? sequenceToken;
  ensureVoicesReady().then(() => {
    if (token !== sequenceToken) return;
    speakNow(normalizedText, { ...options, cancel: false });
  });
  return true;
}

export function speakSequence(parts, gapMs = 450) {
  const queue = parts.map(normalizeSpeechText).filter(Boolean);
  if (!queue.length) return false;
  if (!canSpeak() && !canPlayBundledSpeech()) {
    dispatchPlaybackError("unsupported");
    return false;
  }

  invalidateSequence();
  cancelPlayback();
  const token = sequenceToken;
  const gap = Math.max(0, Number(gapMs) || 0);

  const playAt = (index) => {
    if (token !== sequenceToken || index >= queue.length) return;
    speakKorean(queue[index], {
      cancel: false,
      sequenceToken: token,
      onend: () => scheduleNext(index + 1),
      onerror: () => scheduleNext(index + 1)
    });
  };
  const scheduleNext = (index) => {
    if (token !== sequenceToken || index >= queue.length) return;
    const timer = window.setTimeout(() => {
      pendingTimers = pendingTimers.filter((item) => item !== timer);
      playAt(index);
    }, gap);
    pendingTimers.push(timer);
  };

  playAt(0);
  return true;
}

export function stopSpeech() {
  if (!canSpeak() && !canPlayBundledSpeech()) return false;
  invalidateSequence();
  cancelPlayback();
  return true;
}

export function __resetSpeechRuntimeForTests() {
  if (typeof window !== "undefined") {
    pendingTimers.forEach((timer) => window.clearTimeout(timer));
  }
  sequenceToken = 0;
  pendingTimers = [];
  voicesReadyPromise = null;
  voiceProbeCompleted = false;
  playbackRequestCounter = 0;
  activePlaybackRequestId = 0;
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch {}
  }
  activeAudio = null;
}

function playBundledSpeech(text, source, options) {
  const requestId = ++playbackRequestCounter;
  let audio;
  try {
    audio = new window.Audio(source);
  } catch (error) {
    const reason = typeof error?.name === "string" ? error.name : "audio-constructor-failed";
    reportPlaybackFailure(options, "audio-error", reason, requestId);
    return false;
  }

  activePlaybackRequestId = requestId;
  activeAudio = audio;
  const settings = getSpeechSettings();
  audio.preload = "auto";
  audio.playbackRate = clampRate(options.rate ?? settings.rate ?? defaultOptions.rate) / defaultOptions.rate;
  audio.volume = clampVolume(options.volume ?? defaultOptions.volume);
  let started = false;

  audio.onplaying = function handleAudioStart(event) {
    if (requestId !== activePlaybackRequestId || activeAudio !== audio || started) return;
    started = true;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_START, requestId, engine: "bundled", text });
    if (typeof options.onstart === "function") options.onstart.call(this, event);
  };
  audio.onended = function handleAudioEnd(event) {
    if (requestId !== activePlaybackRequestId || activeAudio !== audio) return;
    activePlaybackRequestId = 0;
    activeAudio = null;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_END, requestId, engine: "bundled" });
    if (typeof options.onend === "function") options.onend.call(this, event);
  };
  const detachBlockedAudio = () => {
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // A blocked element should not prevent the synthesis fallback.
    }
    if (activeAudio === audio) activeAudio = null;
  };
  const recoverFromGestureBlock = (event, detail) => {
    if (requestId !== activePlaybackRequestId || activeAudio !== audio) return;
    detachBlockedAudio();
    if (canSpeak() && getAvailableKoreanVoices().length) {
      const started = speakNow(text, { ...options, cancel: false });
      if (started) return;
    }
    if (requestId === activePlaybackRequestId) activePlaybackRequestId = 0;
    reportPlaybackFailure(options, "needs-gesture", detail, requestId, event);
  };
  const fail = (event, error) => {
    if (requestId !== activePlaybackRequestId || activeAudio !== audio) return;
    const detail = typeof error === "string" && error ? error : "media-playback-failed";
    if (isGestureBlockedPlaybackError(detail) || isGestureBlockedPlaybackError(event?.error)) {
      recoverFromGestureBlock(event, detail);
      return;
    }
    activePlaybackRequestId = 0;
    activeAudio = null;
    reportPlaybackFailure(options, "audio-error", detail, requestId, event);
  };
  audio.onerror = function handleAudioError(event) {
    fail(event, mediaErrorReason(audio.error));
  };

  try {
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch((error) => fail({ error }, typeof error?.name === "string" ? error.name : "play-rejected"));
    }
    return true;
  } catch (error) {
    const detail = typeof error?.name === "string" ? error.name : "play-threw";
    if (isGestureBlockedPlaybackError(detail) || isGestureBlockedPlaybackError(error)) {
      recoverFromGestureBlock({ error }, detail);
      return true;
    }
    fail({ error }, detail);
    return false;
  }
}

function speakNow(text, options) {
  const voice = pickKoreanVoice();
  if (!voice) {
    reportPlaybackFailure(options, "voice-unavailable");
    return false;
  }

  const requestId = ++playbackRequestCounter;
  activePlaybackRequestId = requestId;
  const utterance = new SpeechSynthesisUtterance(text);
  const speechOptions = { ...options };
  delete speechOptions.cancel;
  delete speechOptions.sequenceToken;
  const onerror = speechOptions.onerror;
  const onstart = speechOptions.onstart;
  const onend = speechOptions.onend;
  delete speechOptions.onerror;
  delete speechOptions.onstart;
  delete speechOptions.onend;
  const settings = getSpeechSettings();
  const rate = clampRate(speechOptions.rate ?? settings.rate ?? defaultOptions.rate);
  Object.assign(utterance, { ...defaultOptions, ...speechOptions, rate });
  utterance.voice = voice;
  utterance.onerror = function handleSpeechError(event) {
    const reason = event?.error;
    const canceled = reason === "canceled" || reason === "interrupted";
    if (requestId !== activePlaybackRequestId && canceled) return;
    if (requestId !== activePlaybackRequestId) return;
    activePlaybackRequestId = 0;
    if (isGestureBlockedPlaybackError(reason) || isGestureBlockedPlaybackError(event)) {
      reportPlaybackFailure({ onerror }, "needs-gesture", reason, requestId, event);
      return;
    }
    dispatchPlaybackError("synthesis-error", reason, requestId);
    if (typeof onerror === "function") onerror.call(this, event);
  };
  utterance.onstart = function handleSpeechStart(event) {
    if (requestId !== activePlaybackRequestId) return;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_START, requestId, engine: "system", text });
    if (typeof onstart === "function") onstart.call(this, event);
  };
  utterance.onend = function handleSpeechEnd(event) {
    if (requestId !== activePlaybackRequestId) return;
    activePlaybackRequestId = 0;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_END, requestId, engine: "system" });
    if (typeof onend === "function") onend.call(this, event);
  };
  try {
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    if (requestId === activePlaybackRequestId) activePlaybackRequestId = 0;
    const reason = typeof error?.name === "string" ? error.name : "speak-threw";
    if (isGestureBlockedPlaybackError(reason) || isGestureBlockedPlaybackError(error)) {
      reportPlaybackFailure({ onerror }, "needs-gesture", reason, requestId, { error: reason, cause: error });
      return false;
    }
    dispatchPlaybackError("synthesis-error", reason, requestId);
    if (typeof onerror === "function") onerror.call(utterance, { error: reason, cause: error });
    return false;
  }
}

function clampRate(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return defaultOptions.rate;
  return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, value));
}

function clampVolume(volume) {
  const value = Number(volume);
  if (!Number.isFinite(value)) return defaultOptions.volume;
  return Math.min(1, Math.max(0, value));
}

function invalidateSequence() {
  sequenceToken += 1;
  pendingTimers.forEach((timer) => window.clearTimeout(timer));
  pendingTimers = [];
}

function cancelPlayback() {
  activePlaybackRequestId = 0;
  const audio = activeAudio;
  activeAudio = null;
  if (audio) {
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // A failed media cleanup should not prevent the next playback request.
    }
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // A broken synthesis service should not prevent the next request from reporting its own error.
  }
}

function normalizeSpeechText(value) {
  if (typeof value !== "string") return "";
  const text = value.normalize("NFC").replace(/\s+/g, " ").trim();
  return text.length <= 500 ? text : "";
}

function mediaErrorReason(error) {
  if (!error) return "media-error";
  if (typeof error.message === "string" && error.message) return error.message;
  return Number.isFinite(error.code) ? `media-error-${error.code}` : "media-error";
}

function isKoreanVoice(voice) {
  return typeof voice?.lang === "string" && voice.lang.toLowerCase().startsWith("ko");
}

function getVoicesSafe() {
  try {
    return window.speechSynthesis.getVoices?.() ?? [];
  } catch {
    return [];
  }
}

function getAvailableKoreanVoices() {
  const korean = getVoicesSafe().filter(isKoreanVoice);
  return isOffline() ? korean.filter((voice) => voice.localService === true) : korean;
}

function pickKoreanVoice() {
  const korean = getAvailableKoreanVoices();
  if (!korean.length) return null;
  const settings = getSpeechSettings();
  if (settings.voiceURI) {
    const preferred = korean.find((voice) => voice.voiceURI === settings.voiceURI);
    if (preferred) return preferred;
  }
  return korean.find((voice) => voice.localService === true) ?? korean[0];
}

function isOffline() {
  try {
    return window.navigator?.onLine === false;
  } catch {
    return false;
  }
}

function dispatchPlaybackError(reason, error, requestId) {
  const detail = {
    type: SPEECH_EVENT_PLAYBACK_ERROR,
    reason,
    offline: isOffline()
  };
  if (typeof error === "string" && error) detail.error = error;
  if (Number.isFinite(requestId)) detail.requestId = requestId;
  dispatchSpeechEvent(detail);
}

function reportPlaybackFailure(options, reason, error, requestId, event = null) {
  dispatchPlaybackError(reason, error, requestId);
  if (typeof options?.onerror === "function") {
    options.onerror.call(null, event ?? { error: error || reason });
  }
}

function dispatchSpeechEvent(detail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  const CustomEventConstructor = window.CustomEvent ?? globalThis.CustomEvent;
  if (typeof CustomEventConstructor !== "function") return;
  window.dispatchEvent(new CustomEventConstructor(SPEECH_EVENT_NAME, { detail }));
}
