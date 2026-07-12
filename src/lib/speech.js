const defaultOptions = {
  lang: "ko-KR",
  rate: 0.82,
  pitch: 1,
  volume: 1
};

export const SPEECH_SETTINGS_KEY = "kirina.speech.v1";
export const SPEECH_RATE_MIN = 0.6;
export const SPEECH_RATE_MAX = 1.1;

let sequenceToken = 0;
let pendingTimers = [];
let voicesReadyPromise = null;

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
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
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(SPEECH_SETTINGS_KEY);
    if (!raw) return {};
    return normalizeSpeechSettings(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveSpeechSettings(input = {}) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const next = normalizeSpeechSettings({ ...getSpeechSettings(), ...input });
    window.localStorage.setItem(SPEECH_SETTINGS_KEY, JSON.stringify(next));
    if (typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
      window.dispatchEvent(new window.CustomEvent("kirina:speech", { detail: { key: SPEECH_SETTINGS_KEY } }));
    }
    return true;
  } catch {
    return false;
  }
}

export function ensureVoicesReady(timeoutMs = 2000) {
  if (!canSpeak()) return Promise.resolve([]);
  const current = getVoicesSafe();
  if (current.length) return Promise.resolve(current);
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      voicesReadyPromise = null;
      if (typeof synth.removeEventListener === "function") synth.removeEventListener("voiceschanged", finish);
      resolve(getVoicesSafe());
    };
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", finish);
    else if ("onvoiceschanged" in synth) synth.onvoiceschanged = finish;
    window.setTimeout(finish, timeoutMs);
  });
  return voicesReadyPromise;
}

export function getKoreanVoiceStatus() {
  if (!canSpeak()) return "unsupported";
  const voices = getVoicesSafe();
  if (!voices.length) return "loading";
  return voices.some(isKoreanVoice) ? "ready" : "missing";
}

export function listKoreanVoices() {
  if (!canSpeak()) return [];
  return getVoicesSafe().filter(isKoreanVoice);
}

export function speakKorean(text, options = {}) {
  if (!canSpeak() || !text) return false;
  if (options.sequenceToken == null) cancelPendingSpeechTimers();
  if (options.cancel !== false) window.speechSynthesis.cancel();
  if (getVoicesSafe().length) {
    speakNow(text, options);
    return true;
  }
  const token = options.sequenceToken ?? sequenceToken;
  ensureVoicesReady().then(() => {
    if (token !== sequenceToken) return;
    speakNow(text, { ...options, cancel: false });
  });
  return true;
}

export function speakSequence(parts, gapMs = 450) {
  if (!canSpeak()) return false;
  cancelPendingSpeechTimers();
  const token = ++sequenceToken;
  window.speechSynthesis.cancel();
  parts.forEach((part, index) => {
    const timer = window.setTimeout(() => {
      if (token === sequenceToken) speakKorean(part, { rate: index === 0 ? 0.72 : 0.86, cancel: false, sequenceToken: token });
    }, gapMs * index);
    pendingTimers.push(timer);
  });
  return true;
}

export function stopSpeech() {
  if (!canSpeak()) return false;
  cancelPendingSpeechTimers();
  window.speechSynthesis.cancel();
  return true;
}

function speakNow(text, options) {
  const utterance = new SpeechSynthesisUtterance(text);
  const speechOptions = { ...options };
  delete speechOptions.cancel;
  delete speechOptions.sequenceToken;
  const settings = getSpeechSettings();
  const rate = clampRate(speechOptions.rate ?? settings.rate ?? defaultOptions.rate);
  Object.assign(utterance, { ...defaultOptions, ...speechOptions, rate });
  const voice = pickKoreanVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function clampRate(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return defaultOptions.rate;
  return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, value));
}

function cancelPendingSpeechTimers() {
  sequenceToken += 1;
  pendingTimers.forEach((timer) => window.clearTimeout(timer));
  pendingTimers = [];
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

function pickKoreanVoice() {
  const voices = getVoicesSafe();
  if (!voices.length) return null;
  const settings = getSpeechSettings();
  if (settings.voiceURI) {
    const preferred = voices.find((voice) => voice.voiceURI === settings.voiceURI);
    if (preferred && isKoreanVoice(preferred)) return preferred;
  }
  const korean = voices.filter(isKoreanVoice);
  if (!korean.length) return null;
  return korean.find((voice) => voice.localService) ?? korean[0];
}
