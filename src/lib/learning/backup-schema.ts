import { STORAGE_KEYS } from "./storage.ts";

type Check = (value: unknown, path: string) => string | null;
const text: Check = (v, p) => typeof v === "string" ? null : `${p} 应为文字`;
const number: Check = (v, p) => typeof v === "number" && Number.isFinite(v) ? null : `${p} 应为有限数值`;
const boolean: Check = (v, p) => typeof v === "boolean" ? null : `${p} 应为布尔值`;
const nullable = (check: Check): Check => (v, p) => v === null ? null : check(v, p);
const list = (check: Check): Check => (v, p) => {
  if (!Array.isArray(v)) return `${p} 应为列表`;
  for (let i = 0; i < v.length; i++) { const error = check(v[i], `${p}[${i}]`); if (error) return error; }
  return null;
};
const record = (check: Check): Check => (v, p) => {
  if (!isPlainRecord(v)) return `${p} 应为对象`;
  for (const [key, value] of Object.entries(v)) { const error = check(value, `${p}.${key}`); if (error) return error; }
  return null;
};
const oneOf = (...values: unknown[]): Check => (v, p) => values.includes(v) ? null : `${p} 的取值不受支持`;
// Older backups may omit fields introduced later. Present fields must have valid shapes.
const shape = (fields: Record<string, Check>, required: string[] = []): Check => (v, p) => {
  if (!isPlainRecord(v)) return `${p} 应为对象`;
  for (const key of required) if (!(key in v)) return `${p}.${key} 缺失`;
  for (const [key, check] of Object.entries(fields)) {
    if (!(key in v)) continue;
    const error = check(v[key], `${p}.${key}`); if (error) return error;
  }
  return null;
};
const strings = list(text);
const numbers = record(number);
const questionType = oneOf("choice", "listen", "type", "dictation", "cloze", "translate");
const taskEvidence = shape({ kind: oneOf("paragraph", "retell", "shadowing"), text, recordedSeconds: number, recordingId: text, updatedAt: text });
const capstone = shape({ transcript: text, weakPoint: text, targetRewrite: text, rubric: strings, recordedSeconds: number, recordingId: text, updatedAt: text });
const portfolioDraft = { id: text, title: text, source: text, sourceUrl: text, learningMinutes: number, recordingMinutes: number, mentorFeedback: text, body: text, createdAt: text, updatedAt: text };
const schemas: Record<string, Check> = {
  [STORAGE_KEYS.profile]: shape({
    name: text, studyMode: oneOf("guided", "self"), selfStudyGoal: oneOf("foundation", "travel", "media", "native"),
    selfStudyIntensity: oneOf("light", "steady", "deep"), selfStudyFocus: oneOf("balanced", "listening", "reading", "conversation"),
    minutesGoal: number, romanization: oneOf("fade", "always", "hidden"), onboardedAt: text, createdAt: text, updatedAt: text
  }),
  [STORAGE_KEYS.progress]: shape({
    completedLessons: strings, lessonScores: numbers, previewLessonScores: numbers,
    lessonListeningEvidence: record(boolean), lessonProductionEvidence: record(boolean), lessonTaskEvidence: record(taskEvidence),
    masteredHangul: strings, learnedVocab: strings, learnedGrammar: strings, learnedNative: strings,
    nativeEvidence: record(shape({ listened: boolean, retell: text, transfer: text, updatedAt: text })),
    completedMaterials: strings, materialEvidence: record(shape({ dictation: text, retell: text, selfCheck: strings, outputEntryId: text, updatedAt: text })),
    capstoneEvidence: nullable(capstone), completedCheckpoints: strings, checkpointEvidence: record(text), completedTasks: record(text),
    ability: numbers, abilityEvents: record((v, p) => typeof v === "number" ? number(v, p) : numbers(v, p)),
    practiceItems: record(shape({ attempts: number, correct: number, wrong: number, streak: number, lastCorrect: boolean, lastSeenAt: text, lastSource: oneOf("lesson", "review", "quiz") })),
    streak: number, lastStudyDate: nullable(text), minutesGoal: number, updatedAt: text
  }),
  [STORAGE_KEYS.srs]: shape({
    cards: record(shape({ id: text, box: number, dueAt: number, correct: number, wrong: number, lastSeenAt: nullable(number), ease: number, intervalDays: number, lapses: number,
      payload: shape({ kind: oneOf("hangul", "pronunciation", "vocab", "grammar", "native", "material", "output", "mistake", "lesson", "soundChange"), itemId: text, type: questionType,
        prompt: text, answer: text, acceptable: strings, choices: strings, explain: text, speak: text, clozeText: text, hint: text }, ["kind", "itemId"])
    }, ["payload"])),
    history: list(shape({ id: text, isCorrect: boolean, at: number, box: number }, ["id", "isCorrect", "at"]))
  }),
  [STORAGE_KEYS.outputs]: shape({ entries: list(shape({ id: text, materialId: text, materialTitle: text, mission: text, draft: text, weakPoint: text, targetRewrite: text, rubric: strings, createdAt: text }, ["id"])) }),
  [STORAGE_KEYS.nativePortfolio]: shape({ version: oneOf(1), entries: list(shape({ ...portfolioDraft, revisions: list(shape({ ...portfolioDraft, note: text })) }, ["id"])) }),
  [STORAGE_KEYS.lessonSession]: shape({ sessions: record(shape({ lessonId: text, currentIndex: number, finished: boolean, updatedAt: text,
    answers: list(shape({ questionId: text, answer: text, correct: boolean, skipped: boolean }, ["questionId", "answer"]))
  })) }),
  [STORAGE_KEYS.drafts]: shape({
    immersion: record(shape({ dictationEvidence: text, retellEvidence: text, draft: text, weakPoint: text, targetRewrite: text, checkedRubric: strings, selfCheck: strings, selectedOutputId: text, updatedAt: text })),
    selfStudyCheckpoints: record(shape({ evidence: text, updatedAt: text }))
  }),
  [STORAGE_KEYS.speech]: shape({ voiceURI: text, rate: number, dismissedVoiceWarning: boolean }),
  // Retired mistake metadata is ignored during migration, but must still be structured JSON.
  [STORAGE_KEYS.mistakes]: (v, p) => isPlainRecord(v) || Array.isArray(v) ? null : `${p} 应为旧版错题对象或列表`
};

export function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

export function validateBackupEntry(key: string, raw: unknown): string | null {
  if (!Object.prototype.hasOwnProperty.call(schemas, key)) return `不支持的数据项：${key}`;
  if (typeof raw !== "string") return `${key} 应为 JSON 文字`;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return `${key} 不是有效 JSON`; }
  return schemas[key](value, key);
}
