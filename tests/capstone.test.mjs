import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPSTONE_MIN_RECORDED_SECONDS,
  capstoneRecordingCheck,
  capstoneRubric,
  capstoneSystemChecks,
  isValidCapstoneEvidence,
  normalizeCapstoneEvidence
} from "../src/lib/learning/capstone.ts";

const validTranscript = "제 생각에는 도시 생활과 시골 생활이 서로 다른 장점을 가지고 있어요. 도시에서는 교통이 편리하고 필요한 서비스를 쉽게 이용할 수 있기 때문에 시간을 아낄 수 있어요. 예를 들면 늦은 시간에도 병원이나 가게를 찾기 쉬워서 생활이 안정적이에요. 하지만 사람이 많고 소음이 커서 마음이 지칠 때도 있어요. 반면에 시골은 이동이 조금 어렵긴 하지만 자연 속에서 천천히 쉬고 이웃과 가까이 지낼 수 있어요. 그래서 저는 일할 때는 도시에 살고 주말에는 조용한 곳에서 쉬는 방법이 좋다고 생각해요. 결국 중요한 것은 한쪽만 선택하는 것이 아니라 자신의 상황에 맞게 균형을 만드는 일이에요.";
const completeEvidence = {
  transcript: validTranscript,
  weakPoint: "对比后的例子还不够具体",
  targetRewrite: "결국 자신의 생활 방식에 맞는 균형을 만드는 것이 가장 중요하다고 생각해요.",
  rubric: capstoneRubric.map((item) => item.id),
  recordedSeconds: CAPSTONE_MIN_RECORDED_SECONDS,
  recordingId: "capstone:test-recording",
  updatedAt: "2026-07-15T00:00:00.000Z"
};

test("capstone evidence requires system-verifiable structure and diverse Korean", () => {
  assert.equal(capstoneSystemChecks(validTranscript).every((check) => check.passed), true);
  assert.equal(isValidCapstoneEvidence(completeEvidence), true);
  assert.equal(isValidCapstoneEvidence({ ...completeEvidence, transcript: "가".repeat(140) }), false);
  assert.equal(isValidCapstoneEvidence({ ...completeEvidence, transcript: "가나다라마바사아".repeat(20) }), false);
  assert.equal(isValidCapstoneEvidence({ ...completeEvidence, transcript: validTranscript.replace(/반면에|하지만/g, "그리고") }), false);
});

test("capstone evidence cannot replace a two-minute recording with text or checkboxes", () => {
  assert.equal(capstoneRecordingCheck(CAPSTONE_MIN_RECORDED_SECONDS, "capstone:test-recording").passed, true);
  assert.equal(capstoneRecordingCheck(CAPSTONE_MIN_RECORDED_SECONDS, "").passed, false);
  assert.equal(capstoneRecordingCheck(CAPSTONE_MIN_RECORDED_SECONDS - 0.1).passed, false);
  assert.equal(capstoneRecordingCheck(String(CAPSTONE_MIN_RECORDED_SECONDS)).passed, false);
  assert.equal(isValidCapstoneEvidence({ ...completeEvidence, recordedSeconds: CAPSTONE_MIN_RECORDED_SECONDS - 0.1 }), false);
  assert.equal(isValidCapstoneEvidence({ ...completeEvidence, recordedSeconds: undefined }), false);
});

test("legacy capstone work is retained but requires a new recording", () => {
  const legacyEvidence = { ...completeEvidence };
  delete legacyEvidence.recordedSeconds;
  delete legacyEvidence.recordingId;
  const normalized = normalizeCapstoneEvidence(legacyEvidence);

  assert.ok(normalized);
  assert.equal(normalized.transcript, validTranscript);
  assert.equal(normalized.recordedSeconds, 0);
  assert.equal(normalized.recordingId, "");
  assert.equal(isValidCapstoneEvidence(normalized), false);
  assert.equal(normalizeCapstoneEvidence({ ...legacyEvidence, transcript: "가".repeat(140) }), null);
});
