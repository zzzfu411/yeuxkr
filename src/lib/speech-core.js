export const SPEECH_SETTINGS_KEY = "kirina.speech.v1";
export const SPEECH_EVENT_NAME = "kirina:speech";
export const SPEECH_EVENT_PLAYBACK_ERROR = "playback-error";
export const SPEECH_EVENT_PLAYBACK_START = "playback-start";
export const SPEECH_EVENT_PLAYBACK_END = "playback-end";
export const SPEECH_RATE_MIN = 0.6;
export const SPEECH_RATE_MAX = 1.1;

export const defaultSpeechOptions = {
  lang: "ko-KR",
  rate: 0.82,
  pitch: 1,
  volume: 1
};

export const speechRuntime = {
  sequenceToken: 0,
  pendingTimers: [],
  voicesReadyPromise: null,
  voiceProbeCompleted: false,
  playbackRequestCounter: 0,
  activePlaybackRequestId: 0,
  activeAudio: null
};

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function canPlayBundledSpeech() {
  return typeof window !== "undefined" && typeof window.Audio === "function";
}

/** @typedef {{ voiceURI?: string, rate?: number, dismissedVoiceWarning?: boolean }} SpeechSettings */

/** @returns {SpeechSettings} */
export function normalizeSpeechSettings(input) {
  const source = input && typeof input === "object" ? input : {};
  /** @type {SpeechSettings} */
  const settings = {};
  if (typeof source.voiceURI === "string" && source.voiceURI.trim()) settings.voiceURI = source.voiceURI;
  const rate = Number(source.rate);
  if (Number.isFinite(rate) && rate > 0) settings.rate = Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate));
  if (source.dismissedVoiceWarning === true) settings.dismissedVoiceWarning = true;
  return settings;
}

/** @returns {SpeechSettings} */
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

export function isOffline() {
  try {
    return window.navigator?.onLine === false;
  } catch {
    return false;
  }
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

export function getAvailableKoreanVoices() {
  const korean = getVoicesSafe().filter(isKoreanVoice);
  return isOffline() ? korean.filter((voice) => voice.localService === true) : korean;
}

/** @returns {Promise<SpeechSynthesisVoice[]>} */
export function ensureVoicesReady(timeoutMs = 2000) {
  if (!canSpeak()) {
    speechRuntime.voiceProbeCompleted = true;
    return Promise.resolve([]);
  }

  const current = getAvailableKoreanVoices();
  if (current.length) {
    speechRuntime.voiceProbeCompleted = true;
    return Promise.resolve(current);
  }
  if (speechRuntime.voicesReadyPromise) return speechRuntime.voicesReadyPromise;

  const readyPromise = new Promise((resolve) => {
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
      speechRuntime.voiceProbeCompleted = true;
      speechRuntime.voicesReadyPromise = null;
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

  speechRuntime.voicesReadyPromise = readyPromise;
  return readyPromise;
}

export function getKoreanVoiceStatus() {
  if (canPlayBundledSpeech()) return "ready";
  if (!canSpeak()) return "unsupported";
  if (getAvailableKoreanVoices().length) return "ready";
  return speechRuntime.voiceProbeCompleted ? "missing" : "loading";
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
  const nested = error.error;
  const candidates = [
    error.reason,
    typeof nested === "string" ? nested : nested?.name,
    error.name
  ];
  return candidates.some((value) => isGestureBlockToken(value));
}

export function listKoreanVoices() {
  if (!canSpeak()) return [];
  return getAvailableKoreanVoices();
}

export function invalidateSequence() {
  speechRuntime.sequenceToken += 1;
  speechRuntime.pendingTimers.forEach((timer) => window.clearTimeout(timer));
  speechRuntime.pendingTimers = [];
}

export function cancelPlayback() {
  speechRuntime.activePlaybackRequestId = 0;
  const audio = speechRuntime.activeAudio;
  speechRuntime.activeAudio = null;
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

export function stopSpeech() {
  if (!canSpeak() && !canPlayBundledSpeech()) return false;
  invalidateSequence();
  cancelPlayback();
  return true;
}

export function dispatchSpeechEvent(detail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  const CustomEventConstructor = window.CustomEvent ?? globalThis.CustomEvent;
  if (typeof CustomEventConstructor !== "function") return;
  window.dispatchEvent(new CustomEventConstructor(SPEECH_EVENT_NAME, { detail }));
}

export function dispatchPlaybackError(reason, error, requestId) {
  const detail = {
    type: SPEECH_EVENT_PLAYBACK_ERROR,
    reason,
    offline: isOffline()
  };
  if (typeof error === "string" && error) detail.error = error;
  if (Number.isFinite(requestId)) detail.requestId = requestId;
  dispatchSpeechEvent(detail);
}

export function reportPlaybackFailure(options, reason, error, requestId, event = null) {
  dispatchPlaybackError(reason, error, requestId);
  if (typeof options?.onerror === "function") {
    options.onerror.call(null, event ?? { error: error || reason });
  }
}
