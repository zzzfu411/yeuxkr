import type { CapstoneEvidence } from "./types.ts";
import { hasKoreanOutputDraft, hasKoreanOutputRewrite } from "./evidence.ts";

export const CAPSTONE_LESSON_ID = "l30-native-capstone";
export const CAPSTONE_MIN_HANGUL = 120;
export const CAPSTONE_MIN_RECORDED_SECONDS = 120;

export const capstoneRubric = [
  { id: "position", label: "开头明确表达立场" },
  { id: "reason", label: "至少给出一个理由和具体例子" },
  { id: "contrast", label: "使用对比或让步连接观点" },
  { id: "landing", label: "结尾回收观点并自然落点" }
] as const;

const rubricIds = new Set<string>(capstoneRubric.map((item) => item.id));

export function countHangulCharacters(value: string) {
  return [...value.normalize("NFC")].filter((char) => /[\u3131-\u318e\uac00-\ud7a3]/u.test(char)).length;
}

export function capstoneSystemChecks(value: string) {
  const text = value.trim();
  const syllables = text.match(/[가-힣]/g) ?? [];
  const words = text.match(/[가-힣]+/g) ?? [];
  const sentenceCount = text
    .split(/[.!?。！？\n]+/u)
    .filter((part) => countHangulCharacters(part) >= 8)
    .length;
  return [
    { id: "length", label: `至少 ${CAPSTONE_MIN_HANGUL} 个韩文字符`, passed: syllables.length >= CAPSTONE_MIN_HANGUL },
    { id: "sentences", label: "至少 4 个完整句子", passed: sentenceCount >= 4 },
    { id: "diversity", label: "词汇与音节没有机械重复", passed: new Set(words).size >= 18 && new Set(syllables).size >= 20 && hasKoreanOutputDraft(text, CAPSTONE_MIN_HANGUL) },
    { id: "position", label: "系统识别到立场框架", passed: /(제 생각|저는|제가 보기|제 입장|개인적으로)/u.test(text) },
    { id: "reason", label: "系统识别到理由或例子", passed: /(왜냐하면|이유|때문|으니까|니까|그래서|예를 들)/u.test(text) },
    { id: "contrast", label: "系统识别到对比或让步", passed: /(반면|하지만|지만|긴 하지만|그런데|그래도)/u.test(text) },
    { id: "landing", label: "系统识别到结论落点", passed: /(결국|따라서|정리하면|그래서|다고 생각|것이 좋|중요하)/u.test(text) }
  ];
}

export function capstoneRecordingCheck(recordedSeconds: unknown, recordingId: unknown = "") {
  const seconds = typeof recordedSeconds === "number" && Number.isFinite(recordedSeconds)
    ? recordedSeconds
    : 0;
  return {
    id: "recording",
    label: `完成至少 ${CAPSTONE_MIN_RECORDED_SECONDS} 秒真实录音`,
    passed: seconds >= CAPSTONE_MIN_RECORDED_SECONDS && typeof recordingId === "string" && recordingId.trim().length > 0
  };
}

export function normalizeCapstoneEvidence(input: unknown): CapstoneEvidence | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Partial<CapstoneEvidence>;
  const transcript = typeof source.transcript === "string" ? source.transcript.trim().slice(0, 4000) : "";
  const weakPoint = typeof source.weakPoint === "string" ? source.weakPoint.trim().slice(0, 500) : "";
  const targetRewrite = typeof source.targetRewrite === "string" ? source.targetRewrite.trim().slice(0, 1000) : "";
  const rubric = Array.isArray(source.rubric)
    ? [...new Set(source.rubric.map(String).filter((id) => rubricIds.has(id)))].slice(0, capstoneRubric.length)
    : [];
  const recordedSeconds = typeof source.recordedSeconds === "number" && Number.isFinite(source.recordedSeconds)
    ? Math.max(0, Math.floor(source.recordedSeconds * 10) / 10)
    : 0;
  const recordingId = typeof source.recordingId === "string" ? source.recordingId.trim().slice(0, 180) : "";
  const updatedAt = typeof source.updatedAt === "string" && source.updatedAt.trim() ? source.updatedAt : new Date().toISOString();
  const evidence = { transcript, weakPoint, targetRewrite, rubric, recordedSeconds: recordingId ? recordedSeconds : 0, recordingId, updatedAt };
  // Keep otherwise complete legacy work visible, but require a new recording before it can pass again.
  return hasCompleteCapstoneArtifact(evidence) ? evidence : null;
}

export function isValidCapstoneEvidence(input: Partial<CapstoneEvidence> | null | undefined) {
  if (!input) return false;
  if (!hasCompleteCapstoneArtifact(input)) return false;
  return capstoneRecordingCheck(input.recordedSeconds, input.recordingId).passed;
}

function hasCompleteCapstoneArtifact(input: Partial<CapstoneEvidence>) {
  if (!capstoneSystemChecks(input.transcript ?? "").every((check) => check.passed)) return false;
  if ((input.weakPoint ?? "").trim().length < 6) return false;
  if (!hasKoreanOutputRewrite(input.targetRewrite ?? "")) return false;
  const checked = new Set(Array.isArray(input.rubric) ? input.rubric : []);
  return capstoneRubric.every((item) => checked.has(item.id));
}
