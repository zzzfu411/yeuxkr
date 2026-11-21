import { BUNDLED_SPEECH_ASSETS } from "../data/speech-assets.generated.js";
import {
  SPEECH_SETTINGS_KEY,
  SPEECH_EVENT_NAME,
  SPEECH_EVENT_PLAYBACK_ERROR,
  SPEECH_EVENT_PLAYBACK_START,
  SPEECH_EVENT_PLAYBACK_END,
  SPEECH_RATE_MIN,
  SPEECH_RATE_MAX,
  defaultSpeechOptions,
  speechRuntime,
  canSpeak,
  canPlayBundledSpeech,
  normalizeSpeechSettings,
  getSpeechSettings,
  saveSpeechSettings,
  getAvailableKoreanVoices,
  ensureVoicesReady,
  getKoreanVoiceStatus,
  isGestureBlockedPlaybackError,
  listKoreanVoices,
  invalidateSequence,
  cancelPlayback,
  stopSpeech,
  dispatchSpeechEvent,
  dispatchPlaybackError,
  reportPlaybackFailure
} from "./speech-core.js";

export {
  SPEECH_SETTINGS_KEY,
  SPEECH_EVENT_NAME,
  SPEECH_EVENT_PLAYBACK_ERROR,
  SPEECH_EVENT_PLAYBACK_START,
  SPEECH_EVENT_PLAYBACK_END,
  SPEECH_RATE_MIN,
  SPEECH_RATE_MAX,
  canSpeak,
  canPlayBundledSpeech,
  normalizeSpeechSettings,
  getSpeechSettings,
  saveSpeechSettings,
  ensureVoicesReady,
  getKoreanVoiceStatus,
  isGestureBlockedPlaybackError,
  listKoreanVoices,
  stopSpeech
};

export function getBundledSpeechAsset(text) {
  return BUNDLED_SPEECH_ASSETS[normalizeSpeechText(text)] ?? null;
}

export function speakKorean(text, options = {}) {
  const normalizedText = normalizeSpeechText(text);
  if (!normalizedText) return false;

  if (options.sequenceToken == null) invalidateSequence();
  if (options.cancel !== false) cancelPlayback();

  const bundledAsset = getBundledSpeechAsset(normalizedText);
  const preferSystemVoice = options.preferSystemVoice === true && canSpeak() && getAvailableKoreanVoices().length > 0;
  if (!preferSystemVoice && bundledAsset && canPlayBundledSpeech()) {
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

  if (speechRuntime.voiceProbeCompleted) {
    reportPlaybackFailure(options, "voice-unavailable");
    return false;
  }

  const token = options.sequenceToken ?? speechRuntime.sequenceToken;
  ensureVoicesReady().then(() => {
    if (token !== speechRuntime.sequenceToken) return;
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
  const token = speechRuntime.sequenceToken;
  const gap = Math.max(0, Number(gapMs) || 0);
  let consecutiveErrors = 0;

  const playAt = (index) => {
    if (token !== speechRuntime.sequenceToken || index >= queue.length) return;
    speakKorean(queue[index], {
      cancel: false,
      sequenceToken: token,
      onend: () => {
        consecutiveErrors = 0;
        scheduleNext(index + 1);
      },
      onerror: (event) => {
        consecutiveErrors += 1;
        if (
          isGestureBlockedPlaybackError(event) ||
          event?.reason === "unsupported" ||
          consecutiveErrors >= 3
        ) {
          invalidateSequence();
          return;
        }
        scheduleNext(index + 1);
      }
    });
  };
  const scheduleNext = (index) => {
    if (token !== speechRuntime.sequenceToken || index >= queue.length) return;
    const timer = window.setTimeout(() => {
      speechRuntime.pendingTimers = speechRuntime.pendingTimers.filter((item) => item !== timer);
      playAt(index);
    }, gap);
    speechRuntime.pendingTimers.push(timer);
  };

  playAt(0);
  return true;
}

export function __resetSpeechRuntimeForTests() {
  if (typeof window !== "undefined") {
    speechRuntime.pendingTimers.forEach((timer) => window.clearTimeout(timer));
  }
  speechRuntime.sequenceToken = 0;
  speechRuntime.pendingTimers = [];
  speechRuntime.voicesReadyPromise = null;
  speechRuntime.voiceProbeCompleted = false;
  speechRuntime.playbackRequestCounter = 0;
  speechRuntime.activePlaybackRequestId = 0;
  if (speechRuntime.activeAudio) {
    try {
      speechRuntime.activeAudio.pause();
    } catch {}
  }
  speechRuntime.activeAudio = null;
}

function playBundledSpeech(text, source, options) {
  const requestId = ++speechRuntime.playbackRequestCounter;
  let audio;
  try {
    audio = new window.Audio(source);
  } catch (error) {
    const reason = typeof error?.name === "string" ? error.name : "audio-constructor-failed";
    reportPlaybackFailure(options, "audio-error", reason, requestId);
    return false;
  }

  speechRuntime.activePlaybackRequestId = requestId;
  speechRuntime.activeAudio = audio;
  const settings = getSpeechSettings();
  audio.preload = "auto";
  audio.playbackRate = clampRate(options.rate ?? settings.rate ?? defaultSpeechOptions.rate) / defaultSpeechOptions.rate;
  audio.volume = clampVolume(options.volume ?? defaultSpeechOptions.volume);
  let started = false;

  audio.onplaying = function handleAudioStart(event) {
    if (requestId !== speechRuntime.activePlaybackRequestId || speechRuntime.activeAudio !== audio || started) return;
    started = true;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_START, requestId, engine: "bundled", text });
    if (typeof options.onstart === "function") options.onstart.call(this, event);
  };
  audio.onended = function handleAudioEnd(event) {
    if (requestId !== speechRuntime.activePlaybackRequestId || speechRuntime.activeAudio !== audio) return;
    speechRuntime.activePlaybackRequestId = 0;
    speechRuntime.activeAudio = null;
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
    if (speechRuntime.activeAudio === audio) speechRuntime.activeAudio = null;
  };
  const recoverFromGestureBlock = (event, detail) => {
    if (requestId !== speechRuntime.activePlaybackRequestId || speechRuntime.activeAudio !== audio) return;
    detachBlockedAudio();
    if (canSpeak() && getAvailableKoreanVoices().length) {
      const startedFallback = speakNow(text, { ...options, cancel: false });
      if (startedFallback) return;
    }
    if (requestId === speechRuntime.activePlaybackRequestId) speechRuntime.activePlaybackRequestId = 0;
    reportPlaybackFailure(options, "needs-gesture", detail, requestId, event);
  };
  const fail = (event, error) => {
    if (requestId !== speechRuntime.activePlaybackRequestId || speechRuntime.activeAudio !== audio) return;
    const detail = typeof error === "string" && error ? error : "media-playback-failed";
    if (isGestureBlockedPlaybackError(detail) || isGestureBlockedPlaybackError(event?.error)) {
      recoverFromGestureBlock(event, detail);
      return;
    }
    detachBlockedAudio();
    if (canSpeak() && getAvailableKoreanVoices().length) {
      const startedFallback = speakNow(text, { ...options, cancel: false });
      if (startedFallback) return;
    }
    if (requestId === speechRuntime.activePlaybackRequestId) speechRuntime.activePlaybackRequestId = 0;
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

  const requestId = ++speechRuntime.playbackRequestCounter;
  speechRuntime.activePlaybackRequestId = requestId;
  const utterance = new SpeechSynthesisUtterance(text);
  const speechOptions = { ...options };
  delete speechOptions.cancel;
  delete speechOptions.sequenceToken;
  delete speechOptions.preferSystemVoice;
  const onerror = speechOptions.onerror;
  const onstart = speechOptions.onstart;
  const onend = speechOptions.onend;
  delete speechOptions.onerror;
  delete speechOptions.onstart;
  delete speechOptions.onend;
  const settings = getSpeechSettings();
  const rate = clampRate(speechOptions.rate ?? settings.rate ?? defaultSpeechOptions.rate);
  Object.assign(utterance, { ...defaultSpeechOptions, ...speechOptions, rate });
  utterance.voice = voice;
  utterance.onerror = function handleSpeechError(event) {
    const reason = event?.error;
    const canceled = reason === "canceled" || reason === "interrupted";
    if (requestId !== speechRuntime.activePlaybackRequestId && canceled) return;
    if (requestId !== speechRuntime.activePlaybackRequestId) return;
    speechRuntime.activePlaybackRequestId = 0;
    if (isGestureBlockedPlaybackError(reason) || isGestureBlockedPlaybackError(event)) {
      reportPlaybackFailure({ onerror }, "needs-gesture", reason, requestId, event);
      return;
    }
    dispatchPlaybackError("synthesis-error", reason, requestId);
    if (typeof onerror === "function") onerror.call(this, event);
  };
  utterance.onstart = function handleSpeechStart(event) {
    if (requestId !== speechRuntime.activePlaybackRequestId) return;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_START, requestId, engine: "system", text });
    if (typeof onstart === "function") onstart.call(this, event);
  };
  utterance.onend = function handleSpeechEnd(event) {
    if (requestId !== speechRuntime.activePlaybackRequestId) return;
    speechRuntime.activePlaybackRequestId = 0;
    dispatchSpeechEvent({ type: SPEECH_EVENT_PLAYBACK_END, requestId, engine: "system" });
    if (typeof onend === "function") onend.call(this, event);
  };
  try {
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    if (requestId === speechRuntime.activePlaybackRequestId) speechRuntime.activePlaybackRequestId = 0;
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
  if (!Number.isFinite(value) || value <= 0) return defaultSpeechOptions.rate;
  return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, value));
}

function clampVolume(volume) {
  const value = Number(volume);
  if (!Number.isFinite(value)) return defaultSpeechOptions.volume;
  return Math.min(1, Math.max(0, value));
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
