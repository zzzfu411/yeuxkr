"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CheckCircle2, Mic, Radio, Square, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading, Surface } from "@/components/ui/section";

import { CAPSTONE_MIN_HANGUL, CAPSTONE_MIN_RECORDED_SECONDS, capstoneRecordingCheck, capstoneRubric, capstoneSystemChecks, countHangulCharacters, isValidCapstoneEvidence } from "@/lib/learning/capstone";

import { checkLessonTaskEvidence, type LessonCompletionTask } from "@/lib/learning/lesson-evidence";

import { deleteLearningRecording, loadLearningRecording, saveLearningRecording } from "@/lib/learning/recordings";

import type { CapstoneEvidence } from "@/lib/learning/types";
import { speakKorean } from "@/lib/speech";

type LessonTaskDraftSnapshot = {
  kind: LessonCompletionTask["kind"];
  text: string;
  recordedSeconds: number;
  recordingId: string;
};

type RecordingDraftRecovery = {
  recordingId: string;
  recordedSeconds: number;
  audioUrl: string;
};

function lessonTaskDraftSnapshot(taskKind: LessonCompletionTask["kind"], evidence?: LessonTaskEvidencePanelProps["evidence"]): LessonTaskDraftSnapshot {
  return {
    kind: evidence?.kind ?? taskKind,
    text: evidence?.text ?? "",
    recordedSeconds: evidence?.recordedSeconds ?? 0,
    recordingId: evidence?.recordingId ?? ""
  };
}

function sameLessonTaskDraft(left: LessonTaskDraftSnapshot, right: LessonTaskDraftSnapshot) {
  return left.kind === right.kind
    && left.text === right.text
    && left.recordedSeconds === right.recordedSeconds
    && left.recordingId === right.recordingId;
}

type LessonTaskEvidencePanelProps = {
  lessonId: string;
  task: LessonCompletionTask;
  evidence?: { kind: "paragraph" | "retell" | "shadowing"; text: string; recordedSeconds: number; recordingId?: string; updatedAt: string };
  onSave: (lessonId: string, input: unknown, expectedRecordingId: string) => boolean;
  onInvalidateRecording: (lessonId: string, recordingId: string) => boolean;
};

export function LessonTaskEvidencePanel({
  lessonId,
  task,
  evidence,
  onSave,
  onInvalidateRecording
}: LessonTaskEvidencePanelProps) {
  const [text, setText] = useState(evidence?.text ?? "");
  const [recordedSeconds, setRecordedSeconds] = useState(evidence?.recordedSeconds ?? 0);
  const [recordingId, setRecordingId] = useState(evidence?.recordingId ?? "");
  const [recording, setRecording] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const [recordingLoadRetry, setRecordingLoadRetry] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioUrlRef = useRef("");
  const recordingIdRef = useRef(evidence?.recordingId ?? "");
  const savedRecordingIdRef = useRef(evidence?.recordingId ?? "");
  const draftBaseRecordingIdRef = useRef(evidence?.recordingId ?? "");
  const invalidateRecordingRef = useRef(onInvalidateRecording);
  const mountedRef = useRef(true);
  const startingRecordingRef = useRef(false);
  const savingRecordingRef = useRef(false);
  const recordingSaveTokenRef = useRef(0);
  const recordingRequestRef = useRef(0);
  const recordingLoadTokenRef = useRef(0);
  const recordingRecoveryRef = useRef<RecordingDraftRecovery | null>(null);
  const incomingDraft = useMemo(
    () => lessonTaskDraftSnapshot(task.kind, evidence),
    [evidence, task.kind]
  );
  const incomingDraftSignature = useMemo(() => JSON.stringify(incomingDraft), [incomingDraft]);
  const previousIncomingDraftSignatureRef = useRef(incomingDraftSignature);
  const draftBaselineRef = useRef(incomingDraft);
  const draftEvidence = useMemo(() => ({ kind: task.kind, text, recordedSeconds, recordingId: recordingId || undefined, updatedAt: new Date(0).toISOString() }), [recordedSeconds, recordingId, task.kind, text]);
  const check = checkLessonTaskEvidence(task, draftEvidence);
  const saved = Boolean(
    evidence &&
    checkLessonTaskEvidence(task, evidence).ready &&
    evidence.kind === draftEvidence.kind &&
    evidence.text.trim() === draftEvidence.text.trim() &&
    evidence.recordedSeconds === draftEvidence.recordedSeconds &&
    (evidence.recordingId ?? "") === (draftEvidence.recordingId ?? "")
  );

  useEffect(() => {
    const nextSavedRecordingId = evidence?.recordingId ?? "";
    if (recordingIdRef.current === savedRecordingIdRef.current || !nextSavedRecordingId) {
      draftBaseRecordingIdRef.current = nextSavedRecordingId;
    }
    savedRecordingIdRef.current = nextSavedRecordingId;
    invalidateRecordingRef.current = onInvalidateRecording;
  }, [evidence?.recordingId, onInvalidateRecording]);

  useEffect(() => {
    if (incomingDraftSignature === previousIncomingDraftSignatureRef.current) return;
    const previousDraft = draftBaselineRef.current;
    const currentDraft = { kind: task.kind, text, recordedSeconds, recordingId };
    previousIncomingDraftSignatureRef.current = incomingDraftSignature;
    draftBaselineRef.current = incomingDraft;
    if (
      recording
      || startingRecording
      || savingRecording
      || startingRecordingRef.current
      || savingRecordingRef.current
      || !sameLessonTaskDraft(currentDraft, previousDraft)
    ) return;
    setText(incomingDraft.text);
    setRecordedSeconds(incomingDraft.recordedSeconds);
    setRecordingId(incomingDraft.recordingId);
    recordingIdRef.current = incomingDraft.recordingId;
    savedRecordingIdRef.current = incomingDraft.recordingId;
    draftBaseRecordingIdRef.current = incomingDraft.recordingId;
    setMessage("");
  }, [incomingDraft, incomingDraftSignature, recordedSeconds, recording, recordingId, savingRecording, startingRecording, task.kind, text]);

  useEffect(() => {
    let cancelled = false;
    recordingRequestRef.current += 1;
    const loadToken = ++recordingLoadTokenRef.current;
    startingRecordingRef.current = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStartingRecording(false);
      setRecording(false);
      setAudioUrl("");
    });
    if (task.kind === "shadowing" && evidence?.recordingId) {
      void loadLearningRecording(evidence.recordingId).then((blob) => {
        if (cancelled || loadToken !== recordingLoadTokenRef.current) return;
        if (!blob) {
          if (!invalidateRecordingRef.current(lessonId, evidence.recordingId!)) {
            setMessage("录音文件不存在，但学习进度没有同步更新；请释放存储空间后刷新重试。");
            return;
          }
          setRecordedSeconds(0);
          setRecordingId("");
          recordingIdRef.current = "";
          savedRecordingIdRef.current = "";
          draftBaseRecordingIdRef.current = "";
          setMessage("已保存的录音文件不存在，需要重新录音或完成听后复现。");
          return;
        }
        const nextUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextUrl;
        setAudioUrl(nextUrl);
      });
    }
    return () => {
      cancelled = true;
      recordingRequestRef.current += 1;
      recordingLoadTokenRef.current += 1;
      startingRecordingRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      startedAtRef.current = 0;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
    };
  }, [evidence?.recordingId, lessonId, recordingLoadRetry, task.kind]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recordingRequestRef.current += 1;
      const draftRecordingId = recordingIdRef.current;
      if (draftRecordingId && draftRecordingId !== savedRecordingIdRef.current) void deleteLearningRecording(draftRecordingId);
    };
  }, []);

  const retryPersistedRecordingLoad = (requestId: number, expectedRecordingId = recordingIdRef.current) => {
    if (
      mountedRef.current
      && requestId === recordingRequestRef.current
      && savedRecordingIdRef.current
      && expectedRecordingId === savedRecordingIdRef.current
    ) {
      setRecordingLoadRetry((value) => value + 1);
    }
  };

  const restoreRecordingDraftAfterFailure = (requestId: number) => {
    if (!mountedRef.current || requestId !== recordingRequestRef.current) return false;
    const recovery = recordingRecoveryRef.current;
    if (!recovery) return true;
    recordingRecoveryRef.current = null;
    recordingIdRef.current = recovery.recordingId;
    setRecordingId(recovery.recordingId);
    setRecordedSeconds(recovery.recordedSeconds);
    if (audioUrlRef.current !== recovery.audioUrl) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = recovery.audioUrl;
    }
    setAudioUrl(recovery.audioUrl);
    return true;
  };

  const startRecording = async () => {
    if (recording || startingRecordingRef.current || savingRecordingRef.current) return;
    startingRecordingRef.current = true;
    setStartingRecording(true);
    const requestId = ++recordingRequestRef.current;
    recordingLoadTokenRef.current += 1;
    recordingRecoveryRef.current = {
      recordingId: recordingIdRef.current,
      recordedSeconds,
      audioUrl: audioUrlRef.current
    };
    setMessage("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("当前浏览器不能录音，可以用下方的听后复现完成本课。");
      startingRecordingRef.current = false;
      setStartingRecording(false);
      retryPersistedRecordingLoad(requestId);
      return;
    }
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let recordingStartedSuccessfully = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || requestId !== recordingRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const activeStream = stream;
      streamRef.current = activeStream;
      const activeRecorder = new MediaRecorder(activeStream);
      recorder = activeRecorder;
      recorderRef.current = activeRecorder;
      chunksRef.current = [];
      const replaceableRecordingId = recordingIdRef.current
        && recordingIdRef.current !== savedRecordingIdRef.current
        ? recordingIdRef.current
        : "";
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      activeRecorder.onstop = async () => {
        const previousRecordingId = recordingIdRef.current;
        const seconds = Math.max(0, (performance.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: activeRecorder.mimeType || "audio/webm" });
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!mountedRef.current || requestId !== recordingRequestRef.current) return;
        setRecording(false);
        const saveToken = ++recordingSaveTokenRef.current;
        savingRecordingRef.current = true;
        setSavingRecording(true);
        try {
          if (!blob.size) {
            if (restoreRecordingDraftAfterFailure(requestId)) {
              setMessage("没有取得有效音频数据，已保留上一轮录音；请重新录音或使用听后复现。");
              retryPersistedRecordingLoad(requestId);
            }
            return;
          }
          const nextRecordingId = await saveLearningRecording(blob, "shadowing", replaceableRecordingId);
          if (!nextRecordingId) {
            if (restoreRecordingDraftAfterFailure(requestId)) {
              setMessage("录音没能保存，上一轮录音还在；也可以用听后复现完成本课。");
              retryPersistedRecordingLoad(requestId);
            }
            return;
          }
          if (!mountedRef.current || requestId !== recordingRequestRef.current) {
            await deleteLearningRecording(nextRecordingId);
            return;
          }
          if (previousRecordingId && previousRecordingId !== savedRecordingIdRef.current && previousRecordingId !== nextRecordingId) {
            void deleteLearningRecording(previousRecordingId);
          }
          recordingIdRef.current = nextRecordingId;
          recordingRecoveryRef.current = null;
          setRecordingId(nextRecordingId);
          setRecordedSeconds(Math.round(seconds * 10) / 10);
          const nextUrl = URL.createObjectURL(blob);
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = nextUrl;
          setAudioUrl(nextUrl);
        } catch {
          if (restoreRecordingDraftAfterFailure(requestId)) {
            setMessage("录音没能保存，上一轮录音还在；也可以用听后复现完成本课。");
            retryPersistedRecordingLoad(requestId);
          }
        } finally {
          if (recordingSaveTokenRef.current === saveToken) {
            savingRecordingRef.current = false;
            if (mountedRef.current) setSavingRecording(false);
          }
        }
      };
      startedAtRef.current = performance.now();
      activeRecorder.start();
      if (recordingIdRef.current === savedRecordingIdRef.current) {
        draftBaseRecordingIdRef.current = savedRecordingIdRef.current;
      }
      setRecordedSeconds(0);
      setRecordingId("");
      setRecording(true);
      recordingStartedSuccessfully = true;
    } catch {
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current === recorder) recorderRef.current = null;
      if (streamRef.current === stream) streamRef.current = null;
      chunksRef.current = [];
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        setRecording(false);
        setMessage("没有取得麦克风权限或录音启动失败，可以用下方的听后复现完成本课。");
      }
    } finally {
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        startingRecordingRef.current = false;
        setStartingRecording(false);
        if (!recordingStartedSuccessfully) retryPersistedRecordingLoad(requestId);
      }
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const save = () => {
    if (recording || startingRecording || savingRecording) {
      setMessage(savingRecording ? "录音保存中，请稍候再保存作品。" : "录音进行中，先停止后再保存作品。");
      return;
    }
    if (!check.ready) {
      setMessage("作品还没满足完成条件，请补齐未通过项。");
      return;
    }
    const expectedRecordingId = draftBaseRecordingIdRef.current;
    const ok = onSave(lessonId, draftEvidence, expectedRecordingId);
    if (ok && expectedRecordingId && recordingId && expectedRecordingId !== recordingId) {
      void deleteLearningRecording(expectedRecordingId);
    }
    if (ok) {
      savedRecordingIdRef.current = recordingId;
      draftBaseRecordingIdRef.current = recordingId;
    }
    setMessage(ok ? "本课作品已保存，可以继续完成课程题目。" : "作品没有保存，请释放存储空间后重试。");
  };

  return (
    <Surface id="lesson-task-evidence" className="scroll-mt-40 lg:scroll-mt-28">
      <SectionHeading kicker="本课任务" title={task.title} />
      <p className="max-w-3xl leading-7 text-[var(--muted)]">{task.prompt}</p>

      {task.source ? (
        <div className="mt-4 rounded-[var(--radius)] border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="eyebrow">跟读原文</strong>
            <Button type="button" variant="secondary" size="sm" onClick={() => speakKorean(task.source!)}>
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              播放
            </Button>
          </div>
          {task.kind === "retell" ? (
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">打开原文，听完后请合上</summary>
              <p className="hangul-display mt-3 text-lg font-bold leading-8" lang="ko">{task.source}</p>
            </details>
          ) : (
            <p className="hangul-display mt-3 text-xl font-normal leading-8" lang="ko">{task.source}</p>
          )}
        </div>
      ) : null}

      {task.kind === "shadowing" ? (
        <div className="mt-4 grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash-1)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <strong>最后一轮录音</strong>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {recordedSeconds ? `已录 ${recordedSeconds.toFixed(1)} 秒。` : "录完后先回听，再保存作品。"}
            </p>
            {audioUrl ? <><audio className="mt-3 w-full" controls src={audioUrl} /><a href={audioUrl} download={`kirina-${lessonId}-recording`} className="focus-ring mt-2 inline-flex min-h-11 items-center underline underline-offset-4">下载这段录音</a></> : null}
          </div>
          {recording ? (
            <Button type="button" variant="secondary" onClick={stopRecording}>
              <Square className="h-4 w-4" aria-hidden="true" />
              停止
            </Button>
          ) : (
            <Button type="button" onClick={startRecording} disabled={startingRecording || savingRecording}>
              <Mic className="h-4 w-4" aria-hidden="true" />
              {savingRecording ? "保存录音" : startingRecording ? "请求麦克风" : "开始录音"}
            </Button>
          )}
        </div>
      ) : null}

      <label className="mt-4 grid gap-2 text-sm font-semibold">
        {task.kind === "shadowing" ? "无法录音时：听后凭记忆复现整句" : task.kind === "retell" ? "你的韩语复述" : "你的韩语段落"}
        <textarea
          className="focus-ring hangul-display min-h-40 w-full resize-y rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--card)] p-4 text-lg font-normal leading-8"
          value={text}
          lang="ko"
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
          placeholder="한국어로 직접 써 보세요."
        />
      </label>

      <div className="mt-4 grid gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--green-soft)] p-4">
        {check.checks.map((item) => (
          <span key={item.id} className={`flex items-center gap-2 text-sm font-bold ${item.passed ? "text-[var(--celadon-text)]" : "text-[var(--muted)]"}`}>
            {item.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" aria-hidden="true" />}
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={!check.ready || recording || startingRecording || savingRecording}>保存作品</Button>
        {saved ? <span className="text-sm font-semibold text-[var(--celadon-text)]">作品已保存</span> : null}
        {message ? <span className="text-sm font-bold text-[var(--muted)]" role="status">{message}</span> : null}
      </div>
    </Surface>
  );
}

function sameCapstoneDraft(left: Omit<CapstoneEvidence, "updatedAt">, right: Omit<CapstoneEvidence, "updatedAt">) {
  return left.transcript === right.transcript
    && left.weakPoint === right.weakPoint
    && left.targetRewrite === right.targetRewrite
    && left.recordedSeconds === right.recordedSeconds
    && left.recordingId === right.recordingId
    && left.rubric.length === right.rubric.length
    && left.rubric.every((item, index) => item === right.rubric[index]);
}

export function CapstoneEvidencePanel({
  evidence,
  onSave,
  onInvalidateRecording
}: {
  evidence: CapstoneEvidence | null;
  onSave: (input: Omit<CapstoneEvidence, "updatedAt">, expectedRecordingId: string) => boolean;
  onInvalidateRecording: (recordingId: string) => boolean;
}) {
  const savedRecordingId = evidence?.recordingId ?? "";
  const incomingDraft = useMemo(() => ({
    transcript: evidence?.transcript ?? "",
    weakPoint: evidence?.weakPoint ?? "",
    targetRewrite: evidence?.targetRewrite ?? "",
    rubric: [...(evidence?.rubric ?? [])],
    recordedSeconds: evidence?.recordedSeconds ?? 0,
    recordingId: evidence?.recordingId ?? ""
  }), [evidence?.recordedSeconds, evidence?.recordingId, evidence?.rubric, evidence?.targetRewrite, evidence?.transcript, evidence?.weakPoint]);
  const [draft, setDraft] = useState<Omit<CapstoneEvidence, "updatedAt">>(() => incomingDraft);
  const [status, setStatus] = useState<"idle" | "saved" | "error">(() => isValidCapstoneEvidence(evidence) ? "saved" : "idle");
  const [recording, setRecording] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const [recordingLoadRetry, setRecordingLoadRetry] = useState(0);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordingMessage, setRecordingMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioUrlRef = useRef("");
  const recordingIdRef = useRef(savedRecordingId);
  const savedRecordingIdRef = useRef(savedRecordingId);
  const draftBaseRecordingIdRef = useRef(savedRecordingId);
  const invalidateRecordingRef = useRef(onInvalidateRecording);
  const mountedRef = useRef(true);
  const startingRecordingRef = useRef(false);
  const savingRecordingRef = useRef(false);
  const recordingSaveTokenRef = useRef(0);
  const recordingRequestRef = useRef(0);
  const recordingLoadTokenRef = useRef(0);
  const recordingRecoveryRef = useRef<RecordingDraftRecovery | null>(null);
  const incomingDraftSignature = useMemo(() => JSON.stringify(incomingDraft), [incomingDraft]);
  const previousIncomingDraftSignatureRef = useRef(incomingDraftSignature);
  const draftBaselineRef = useRef(incomingDraft);
  const hangulCount = countHangulCharacters(draft.transcript);
  const systemChecks = capstoneSystemChecks(draft.transcript);
  const recordingCheck = capstoneRecordingCheck(draft.recordedSeconds, draft.recordingId);
  const ready = !recording && !startingRecording && !savingRecording && isValidCapstoneEvidence({ ...draft, updatedAt: evidence?.updatedAt ?? "" });

  useEffect(() => {
    if (recordingIdRef.current === savedRecordingIdRef.current || !savedRecordingId) {
      draftBaseRecordingIdRef.current = savedRecordingId;
    }
    savedRecordingIdRef.current = savedRecordingId;
    invalidateRecordingRef.current = onInvalidateRecording;
  }, [onInvalidateRecording, savedRecordingId]);

  useEffect(() => {
    if (incomingDraftSignature === previousIncomingDraftSignatureRef.current) return;
    const previousDraft = draftBaselineRef.current;
    previousIncomingDraftSignatureRef.current = incomingDraftSignature;
    draftBaselineRef.current = incomingDraft;
    if (
      recording
      || startingRecording
      || savingRecording
      || startingRecordingRef.current
      || savingRecordingRef.current
      || !sameCapstoneDraft(draft, previousDraft)
    ) return;
    setDraft(incomingDraft);
    recordingIdRef.current = incomingDraft.recordingId;
    savedRecordingIdRef.current = incomingDraft.recordingId;
    draftBaseRecordingIdRef.current = incomingDraft.recordingId;
    setStatus(isValidCapstoneEvidence(evidence) ? "saved" : "idle");
    setRecordingMessage("");
  }, [draft, evidence, incomingDraft, incomingDraftSignature, recording, savingRecording, startingRecording]);

  useEffect(() => {
    let cancelled = false;
    recordingRequestRef.current += 1;
    const loadToken = ++recordingLoadTokenRef.current;
    startingRecordingRef.current = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStartingRecording(false);
      setRecording(false);
      setRecordingElapsed(0);
      setAudioUrl("");
    });
    if (savedRecordingId) {
      void loadLearningRecording(savedRecordingId).then((blob) => {
        if (cancelled || loadToken !== recordingLoadTokenRef.current) return;
        if (!blob) {
          if (!invalidateRecordingRef.current(savedRecordingId)) {
            setRecordingMessage("录音文件不存在，但终课完成状态没有同步更新；请释放存储空间后刷新重试。");
            return;
          }
          recordingIdRef.current = "";
          savedRecordingIdRef.current = "";
          draftBaseRecordingIdRef.current = "";
          setDraft((current) => ({ ...current, recordedSeconds: 0, recordingId: "" }));
          setStatus("idle");
          setRecordingMessage("已保存的录音文件不存在，终课完成状态已撤回，请重新录制。");
          return;
        }
        const nextAudioUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
      });
    }
    return () => {
      cancelled = true;
      recordingRequestRef.current += 1;
      recordingLoadTokenRef.current += 1;
      startingRecordingRef.current = false;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      startedAtRef.current = 0;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
    };
  }, [recordingLoadRetry, savedRecordingId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recordingRequestRef.current += 1;
      const draftRecordingId = recordingIdRef.current;
      if (draftRecordingId && draftRecordingId !== savedRecordingIdRef.current) void deleteLearningRecording(draftRecordingId);
    };
  }, []);

  const retryPersistedRecordingLoad = (requestId: number, expectedRecordingId = recordingIdRef.current) => {
    if (
      mountedRef.current
      && requestId === recordingRequestRef.current
      && savedRecordingIdRef.current
      && expectedRecordingId === savedRecordingIdRef.current
    ) {
      setRecordingLoadRetry((value) => value + 1);
    }
  };

  const restoreRecordingDraftAfterFailure = (requestId: number) => {
    if (!mountedRef.current || requestId !== recordingRequestRef.current) return false;
    const recovery = recordingRecoveryRef.current;
    if (!recovery) return true;
    recordingRecoveryRef.current = null;
    recordingIdRef.current = recovery.recordingId;
    setDraft((current) => ({ ...current, recordedSeconds: recovery.recordedSeconds, recordingId: recovery.recordingId }));
    if (audioUrlRef.current !== recovery.audioUrl) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = recovery.audioUrl;
    }
    setAudioUrl(recovery.audioUrl);
    return true;
  };

  const startRecording = async () => {
    if (recording || startingRecordingRef.current || savingRecordingRef.current) return;
    startingRecordingRef.current = true;
    setStartingRecording(true);
    const requestId = ++recordingRequestRef.current;
    recordingLoadTokenRef.current += 1;
    recordingRecoveryRef.current = {
      recordingId: recordingIdRef.current,
      recordedSeconds: draft.recordedSeconds,
      audioUrl: audioUrlRef.current
    };
    setRecordingMessage("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingMessage("当前浏览器不支持录音，终课作品需要换用支持麦克风录制的浏览器完成。");
      startingRecordingRef.current = false;
      setStartingRecording(false);
      retryPersistedRecordingLoad(requestId);
      return;
    }

    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let recordingStartedSuccessfully = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || requestId !== recordingRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const activeStream = stream;
      streamRef.current = activeStream;
      const activeRecorder = new MediaRecorder(activeStream);
      recorder = activeRecorder;
      recorderRef.current = activeRecorder;
      chunksRef.current = [];
      const replaceableRecordingId = recordingIdRef.current
        && recordingIdRef.current !== savedRecordingIdRef.current
        ? recordingIdRef.current
        : "";
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      activeRecorder.onstop = async () => {
        const previousRecordingId = recordingIdRef.current;
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        const seconds = Math.max(0, Math.floor((performance.now() - startedAtRef.current) / 100) / 10);
        const blob = new Blob(chunksRef.current, { type: activeRecorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        activeStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!mountedRef.current || requestId !== recordingRequestRef.current) return;
        setRecording(false);
        setRecordingElapsed(seconds);
        const saveToken = ++recordingSaveTokenRef.current;
        savingRecordingRef.current = true;
        setSavingRecording(true);
        try {
          if (blob.size === 0) {
            if (restoreRecordingDraftAfterFailure(requestId)) {
              setRecordingMessage("没有取得有效音频数据，已保留上一轮录音；请重新录制。");
              retryPersistedRecordingLoad(requestId);
            }
            return;
          }

          const nextRecordingId = await saveLearningRecording(blob, "capstone", replaceableRecordingId);
          if (!nextRecordingId) {
            if (restoreRecordingDraftAfterFailure(requestId)) {
              setRecordingMessage("录音没能保存，上一轮录音还在；请释放浏览器空间后重试。");
              retryPersistedRecordingLoad(requestId);
            }
            return;
          }
          if (!mountedRef.current || requestId !== recordingRequestRef.current) {
            await deleteLearningRecording(nextRecordingId);
            return;
          }
          if (previousRecordingId && previousRecordingId !== savedRecordingIdRef.current && previousRecordingId !== nextRecordingId) {
            void deleteLearningRecording(previousRecordingId);
          }
          recordingIdRef.current = nextRecordingId;
          recordingRecoveryRef.current = null;
          const nextAudioUrl = URL.createObjectURL(blob);
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = nextAudioUrl;
          setAudioUrl(nextAudioUrl);
          setDraft((current) => ({ ...current, recordedSeconds: seconds, recordingId: nextRecordingId }));
          setRecordingMessage(seconds >= CAPSTONE_MIN_RECORDED_SECONDS
            ? "录音时长已达标，请先回听，再保存终课作品。"
            : `本次录音 ${seconds.toFixed(1)} 秒，还需至少 ${(CAPSTONE_MIN_RECORDED_SECONDS - seconds).toFixed(1)} 秒。`);
        } catch {
          if (restoreRecordingDraftAfterFailure(requestId)) {
            setRecordingMessage("录音没能保存，上一轮录音还在；请释放浏览器空间后重试。");
            retryPersistedRecordingLoad(requestId);
          }
        } finally {
          if (recordingSaveTokenRef.current === saveToken) {
            savingRecordingRef.current = false;
            if (mountedRef.current) setSavingRecording(false);
          }
        }
      };

      startedAtRef.current = performance.now();
      activeRecorder.start(1000);
      if (recordingIdRef.current === savedRecordingIdRef.current) {
        draftBaseRecordingIdRef.current = savedRecordingIdRef.current;
      }
      setAudioUrl("");
      setDraft((current) => ({ ...current, recordedSeconds: 0, recordingId: "" }));
      setStatus("idle");
      setRecordingElapsed(0);
      setRecording(true);
      recordingStartedSuccessfully = true;
      timerRef.current = window.setInterval(() => {
        const seconds = Math.max(0, Math.floor((performance.now() - startedAtRef.current) / 100) / 10);
        setRecordingElapsed(seconds);
      }, 250);
    } catch {
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // Stopping tracks below remains the final cleanup path.
          }
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current === recorder) recorderRef.current = null;
      if (streamRef.current === stream) streamRef.current = null;
      chunksRef.current = [];
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        setRecording(false);
        setRecordingMessage("没有取得麦克风权限或录音启动失败，请允许麦克风后重试。");
      }
    } finally {
      if (mountedRef.current && requestId === recordingRequestRef.current) {
        startingRecordingRef.current = false;
        setStartingRecording(false);
        if (!recordingStartedSuccessfully) retryPersistedRecordingLoad(requestId);
      }
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const toggleRubric = (id: string) => {
    setStatus("idle");
    setDraft((current) => ({
      ...current,
      rubric: current.rubric.includes(id) ? current.rubric.filter((item) => item !== id) : [...current.rubric, id]
    }));
  };

  const saveCapstone = () => {
    if (recording || startingRecording || savingRecording) {
      setRecordingMessage(savingRecording ? "录音保存中，请稍候再保存终课作品。" : "录音进行中，先停止后再保存终课作品。");
      return;
    }
    const expectedRecordingId = draftBaseRecordingIdRef.current;
    const saved = onSave(draft, expectedRecordingId);
    if (saved && expectedRecordingId && draft.recordingId && expectedRecordingId !== draft.recordingId) {
      void deleteLearningRecording(expectedRecordingId);
    }
    if (saved) {
      savedRecordingIdRef.current = draft.recordingId;
      draftBaseRecordingIdRef.current = draft.recordingId;
    }
    setStatus(saved ? "saved" : "error");
  };

  return (
    <Surface className="border-[var(--line)]">
      <div id="capstone-evidence" className="scroll-mt-40 lg:scroll-mt-28">
        <SectionHeading
          kicker="收尾练习"
          title="保存终课作品，再确认达标"
          copy="课程题目只能检查结构识别。录制至少两分钟口语，并保存韩语输出稿、弱点和目标改写后，终课才算完成。"
        />
        <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--seal-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong>两分钟真实口语录音</strong>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${recordingCheck.passed ? "text-[var(--celadon-text)]" : "text-[var(--seal-ink)]"}`}>
                {recordingCheck.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Radio className="h-4 w-4" aria-hidden="true" />}
                {recordingCheck.passed ? "时长已达标" : `至少 ${CAPSTONE_MIN_RECORDED_SECONDS} 秒`}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">
              {recording
                ? `录音中 ${recordingElapsed.toFixed(1)} / ${CAPSTONE_MIN_RECORDED_SECONDS.toFixed(1)} 秒`
                : draft.recordedSeconds > 0
                  ? `有效录音 ${draft.recordedSeconds.toFixed(1)} 秒。`
                  : "尚未完成有效录音；文本与自检不能替代录音。"}
            </p>
            {audioUrl ? <><audio className="mt-3 w-full" controls src={audioUrl} /><a href={audioUrl} download="kirina-capstone-recording" className="focus-ring mt-2 inline-flex min-h-11 items-center underline underline-offset-4">下载这段录音</a></> : null}
            {recordingMessage ? <p className="mt-2 text-sm font-bold text-[var(--muted)]" role="status">{recordingMessage}</p> : null}
          </div>
          {recording ? (
            <Button type="button" variant="secondary" onClick={stopRecording}>
              <Square className="h-4 w-4" aria-hidden="true" />
              停止录音
            </Button>
          ) : (
            <Button type="button" onClick={startRecording} disabled={startingRecording || savingRecording}>
              <Mic className="h-4 w-4" aria-hidden="true" />
              {savingRecording ? "保存录音" : startingRecording ? "请求麦克风" : draft.recordedSeconds > 0 ? "重新录音" : "开始录音"}
            </Button>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <label className="grid gap-2 text-sm font-semibold">
            两分钟结构化输出稿
            <textarea
              className="focus-ring min-h-72 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--card)] p-3 leading-7"
              value={draft.transcript}
              lang="ko"
              spellCheck={false}
              onChange={(event) => {
                setStatus("idle");
                setDraft((current) => ({ ...current, transcript: event.target.value }));
              }}
              placeholder="用韩语写下立场、理由、例子、对比或让步，以及最终落点。"
            />
            <span className="text-xs font-bold text-[var(--muted)]">韩文字符 {hangulCount}/{CAPSTONE_MIN_HANGUL}，建议先口述录音，再把实际表达转写到这里。</span>
          </label>
          <div className="grid content-start gap-3">
            <div className="grid gap-1.5 rounded-[var(--radius)] border-l-2 border-[var(--seal)] bg-[var(--wash-2)] p-3">
              <strong className="eyebrow">系统结构检查</strong>
              {systemChecks.map((check) => (
                <span key={check.id} className={`flex items-center gap-2 text-xs font-bold ${check.passed ? "text-[var(--celadon-text)]" : "text-[var(--muted)]"}`}>
                  {check.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-[var(--line-strong)]" aria-hidden="true" />}
                  {check.label}
                </span>
              ))}
            </div>
            <div className="grid gap-2">
              {capstoneRubric.map((item) => {
                const checked = draft.rubric.includes(item.id);
                return (
                  <label key={item.id} className={`focus-ring grid cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 rounded-[var(--radius)] border p-3 text-sm font-medium ${checked ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-[var(--card)]"}`}>
                    <input className="sr-only" type="checkbox" checked={checked} onChange={() => toggleRubric(item.id)} />
                    <span className={`grid h-6 w-6 place-items-center rounded-[6px] border ${checked ? "border-[var(--celadon)] bg-[var(--celadon)] text-[var(--ink-inv)]" : "border-[var(--line-strong)]"}`}>
                      {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </span>
                    {item.label}
                  </label>
                );
              })}
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              当前最需要修正的弱点
              <input
                className="focus-ring min-h-11 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--card)] px-3"
                value={draft.weakPoint}
                onChange={(event) => {
                  setStatus("idle");
                  setDraft((current) => ({ ...current, weakPoint: event.target.value }));
                }}
                placeholder="例如：理由展开太短，转折仍像中文"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              送回复习的目标改写
              <textarea
                className="focus-ring min-h-24 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--card)] p-3 leading-7"
                value={draft.targetRewrite}
                lang="ko"
                spellCheck={false}
                onChange={(event) => {
                  setStatus("idle");
                  setDraft((current) => ({ ...current, targetRewrite: event.target.value }));
                }}
                placeholder="用更自然的韩语重写最不稳的一段。"
              />
            </label>
            <Button
              type="button"
              disabled={!ready}
              onClick={saveCapstone}
            >
              保存终课作品
            </Button>
            <p role="status" aria-live="polite" className="min-h-5 text-sm font-bold text-[var(--muted)]">
              {status === "saved" ? "终课作品已保存，可以完成课程题目并确认结果。" : status === "error" ? "作品没有保存，请释放空间后重试。" : ready ? "完成条件已满足，可以保存。" : "录制至少 120 秒口语，再完成结构检查、四项自检、弱点和韩语目标改写。文本或勾选不能替代录音。"}
            </p>
          </div>
        </div>
      </div>
    </Surface>
  );
}
