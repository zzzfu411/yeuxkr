"use client";

import { nowIso, parseJson, readJson, STORAGE_KEYS, writeJson } from "./storage.ts";

export interface OutputEntry {
  id: string;
  materialId: string;
  materialTitle: string;
  mission: string;
  draft: string;
  weakPoint: string;
  targetRewrite: string;
  rubric: string[];
  createdAt: string;
}

export interface OutputState {
  entries: OutputEntry[];
}

const FALLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";

export function defaultOutputState(): OutputState {
  return { entries: [] };
}

export function getOutputState() {
  return normalizeOutputState(readJson<Partial<OutputState>>(STORAGE_KEYS.outputs, defaultOutputState()));
}

export function getOutputStateFromRaw(raw: string | null) {
  return normalizeOutputState(parseJson<Partial<OutputState>>(raw, defaultOutputState()));
}

export function saveOutputState(state: OutputState) {
  return writeJson(STORAGE_KEYS.outputs, normalizeOutputState(state));
}

export function addOutputEntry(input: Omit<OutputEntry, "id" | "createdAt" | "targetRewrite"> & { targetRewrite?: string }) {
  const state = getOutputState();
  const entry: OutputEntry = {
    ...input,
    targetRewrite: String(input.targetRewrite || input.weakPoint || ""),
    id: `output-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso()
  };
  return saveOutputState({ entries: [entry, ...state.entries].slice(0, 120) }) ? entry : null;
}

export function clearOutputEntries() {
  return saveOutputState(defaultOutputState());
}

export function clearOutputEntriesByMaterial(materialId: string) {
  const state = getOutputState();
  const removed = state.entries.filter((entry) => entry.materialId === materialId).map((entry) => entry.id);
  if (!removed.length) return [];
  return saveOutputState({ entries: state.entries.filter((entry) => entry.materialId !== materialId) }) ? removed : [];
}

export function removeOutputEntry(entryId: string) {
  const state = getOutputState();
  const nextEntries = state.entries.filter((entry) => entry.id !== entryId);
  if (nextEntries.length === state.entries.length) return false;
  return saveOutputState({ entries: nextEntries });
}

function normalizeOutputState(input: Partial<OutputState> | null | undefined): OutputState {
  return {
    entries: Array.isArray(input?.entries)
      ? input.entries
          .filter((entry) => entry?.materialId && entry?.draft)
          .map((entry) => ({
            id: String(entry.id || `legacy-${entry.materialId}-${entry.createdAt ?? ""}`),
            materialId: String(entry.materialId),
            materialTitle: String(entry.materialTitle || entry.materialId),
            mission: String(entry.mission || ""),
            draft: String(entry.draft),
            weakPoint: String(entry.weakPoint || ""),
            targetRewrite: String(entry.targetRewrite || entry.weakPoint || ""),
            rubric: Array.isArray(entry.rubric) ? entry.rubric.map(String) : [],
            createdAt: String(entry.createdAt || FALLBACK_CREATED_AT)
          }))
          .slice(0, 120)
      : []
  };
}
