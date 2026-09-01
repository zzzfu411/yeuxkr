"use client";

import { nowIso, parseJson, readJson, STORAGE_KEYS, writeJson } from "./storage.ts";

export interface ImmersionMaterialDraft {
  dictationEvidence: string;
  retellEvidence: string;
  draft: string;
  weakPoint: string;
  targetRewrite: string;
  checkedRubric: string[];
  selfCheck: string[];
  selectedOutputId: string;
  updatedAt: string;
}

export interface SelfStudyCheckpointDraft {
  evidence: string;
  updatedAt: string;
}

export interface LearningDraftState {
  immersion: Record<string, ImmersionMaterialDraft>;
  selfStudyCheckpoints: Record<string, SelfStudyCheckpointDraft>;
}

export function defaultLearningDraftState(): LearningDraftState {
  return { immersion: {}, selfStudyCheckpoints: {} };
}

export function getLearningDraftState() {
  return normalizeLearningDraftState(readJson<Partial<LearningDraftState>>(STORAGE_KEYS.drafts, defaultLearningDraftState()));
}

export function getLearningDraftStateFromRaw(raw: string | null) {
  return normalizeLearningDraftState(parseJson<Partial<LearningDraftState>>(raw, defaultLearningDraftState()));
}

export function saveLearningDraftState(state: LearningDraftState) {
  return writeJson(STORAGE_KEYS.drafts, normalizeLearningDraftState(state));
}

export function resolveImmersionQuerySelection(
  currentSelectedId: string,
  requestedMaterialId: string,
  defaultMaterialId: string
) {
  const selectedMaterialId = requestedMaterialId;
  const currentActiveId = currentSelectedId || requestedMaterialId || defaultMaterialId;
  const nextActiveId = selectedMaterialId || defaultMaterialId;
  return {
    selectedMaterialId,
    shouldResetDraft: currentActiveId !== nextActiveId
  };
}

export function getImmersionMaterialDraft(materialId: string) {
  const cleanId = normalizeDraftId(materialId);
  if (!cleanId) return null;
  return getLearningDraftState().immersion[cleanId] ?? null;
}

export function saveImmersionMaterialDraft(materialId: string, input: Partial<ImmersionMaterialDraft>) {
  const cleanId = normalizeDraftId(materialId);
  if (!cleanId) return false;
  const state = getLearningDraftState();
  const draft = normalizeImmersionMaterialDraft({ ...(state.immersion[cleanId] ?? {}), ...input, updatedAt: nowIso() });
  if (isEmptyImmersionMaterialDraft(draft)) delete state.immersion[cleanId];
  else state.immersion[cleanId] = draft;
  return saveLearningDraftState(state);
}

export function clearImmersionMaterialDraft(materialId: string) {
  const cleanId = normalizeDraftId(materialId);
  if (!cleanId) return false;
  const state = getLearningDraftState();
  if (!state.immersion[cleanId]) return true;
  delete state.immersion[cleanId];
  return saveLearningDraftState(state);
}

export function getSelfStudyCheckpointDrafts() {
  return getLearningDraftState().selfStudyCheckpoints;
}

export function saveSelfStudyCheckpointDraft(checkpointId: string, evidence: string) {
  const cleanId = normalizeDraftId(checkpointId);
  if (!cleanId) return false;
  const state = getLearningDraftState();
  const cleanEvidence = normalizeDraftText(evidence, 4000);
  if (!cleanEvidence) delete state.selfStudyCheckpoints[cleanId];
  else {
    state.selfStudyCheckpoints[cleanId] = {
      evidence: cleanEvidence,
      updatedAt: nowIso()
    };
  }
  return saveLearningDraftState(state);
}

export function clearSelfStudyCheckpointDraft(checkpointId: string) {
  const cleanId = normalizeDraftId(checkpointId);
  if (!cleanId) return false;
  const state = getLearningDraftState();
  if (!state.selfStudyCheckpoints[cleanId]) return true;
  delete state.selfStudyCheckpoints[cleanId];
  return saveLearningDraftState(state);
}

export function normalizeLearningDraftState(input: Partial<LearningDraftState> | null | undefined): LearningDraftState {
  const source = input && typeof input === "object" ? input : {};
  const immersion: LearningDraftState["immersion"] = {};
  if (source.immersion && typeof source.immersion === "object") {
    for (const [rawId, value] of Object.entries(source.immersion).slice(0, 80)) {
      const id = normalizeDraftId(rawId);
      if (!id || !value || typeof value !== "object") continue;
      const draft = normalizeImmersionMaterialDraft(value as Partial<ImmersionMaterialDraft>);
      if (!isEmptyImmersionMaterialDraft(draft)) immersion[id] = draft;
    }
  }

  const selfStudyCheckpoints: LearningDraftState["selfStudyCheckpoints"] = {};
  if (source.selfStudyCheckpoints && typeof source.selfStudyCheckpoints === "object") {
    for (const [rawId, value] of Object.entries(source.selfStudyCheckpoints).slice(0, 120)) {
      const id = normalizeDraftId(rawId);
      if (!id || !value || typeof value !== "object") continue;
      const evidence = normalizeDraftText((value as Partial<SelfStudyCheckpointDraft>).evidence, 4000);
      if (!evidence) continue;
      selfStudyCheckpoints[id] = {
        evidence,
        updatedAt: normalizeDraftDate((value as Partial<SelfStudyCheckpointDraft>).updatedAt)
      };
    }
  }

  return { immersion, selfStudyCheckpoints };
}

function normalizeImmersionMaterialDraft(input: Partial<ImmersionMaterialDraft>): ImmersionMaterialDraft {
  return {
    dictationEvidence: normalizeDraftText(input.dictationEvidence, 4000),
    retellEvidence: normalizeDraftText(input.retellEvidence, 4000),
    draft: normalizeDraftText(input.draft, 5000),
    weakPoint: normalizeDraftText(input.weakPoint, 800),
    targetRewrite: normalizeDraftText(input.targetRewrite, 2000),
    checkedRubric: normalizeStringList(input.checkedRubric, 20, 120),
    selfCheck: normalizeStringList(input.selfCheck, 20, 240),
    selectedOutputId: normalizeDraftId(input.selectedOutputId ?? ""),
    updatedAt: normalizeDraftDate(input.updatedAt)
  };
}

function isEmptyImmersionMaterialDraft(draft: ImmersionMaterialDraft) {
  return !draft.dictationEvidence &&
    !draft.retellEvidence &&
    !draft.draft &&
    !draft.weakPoint &&
    !draft.targetRewrite &&
    !draft.checkedRubric.length &&
    !draft.selfCheck.length &&
    !draft.selectedOutputId;
}

function normalizeDraftId(input: unknown) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value || value.length > 240) return "";
  return value.replace(/\s+/g, " ");
}

function normalizeDraftText(input: unknown, maxLength: number) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
}

function normalizeStringList(input: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((item) => normalizeDraftText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function normalizeDraftDate(input: unknown) {
  return typeof input === "string" && input.trim() ? input : nowIso();
}
