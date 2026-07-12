const defaultOptions = {
  lang: "ko-KR",
  rate: 0.82,
  pitch: 1,
  volume: 1
};

let sequenceToken = 0;
let pendingTimers = [];

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speakKorean(text, options = {}) {
  if (!canSpeak() || !text) return false;
  if (options.sequenceToken == null) cancelPendingSpeechTimers();
  if (options.cancel !== false) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const speechOptions = { ...options };
  delete speechOptions.cancel;
  delete speechOptions.sequenceToken;
  Object.assign(utterance, { ...defaultOptions, ...speechOptions });
  const voice = pickKoreanVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
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

function cancelPendingSpeechTimers() {
  sequenceToken += 1;
  pendingTimers.forEach((timer) => window.clearTimeout(timer));
  pendingTimers = [];
}

function pickKoreanVoice() {
  const voices = window.speechSynthesis.getVoices?.() ?? [];
  return voices.find((voice) => voice.lang?.toLowerCase().startsWith("ko")) ?? null;
}
