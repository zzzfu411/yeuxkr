"use client";

const DATABASE_NAME = "kirina-learning-recordings";
const DATABASE_VERSION = 1;
const STORE_NAME = "recordings";

export type LearningRecordingKind = "capstone" | "shadowing";

interface LearningRecordingRecord {
  id: string;
  kind: LearningRecordingKind;
  blob: Blob;
  createdAt: string;
}

let databasePromise: Promise<IDBDatabase | null> | null = null;

export function shouldDeleteAbandonedRecording(
  nextRecordingId: string,
  currentRecordingId: string,
  replaceableRecordingId: string,
  savedRecordingId: string
) {
  const id = nextRecordingId.trim();
  if (!id) return false;
  if (id === savedRecordingId.trim()) return false;
  if (id === currentRecordingId.trim()) return false;
  if (id === replaceableRecordingId.trim()) return false;
  return true;
}

export async function saveLearningRecording(blob: Blob, kind: LearningRecordingKind, existingId = "") {
  if (!(blob instanceof Blob) || blob.size <= 0) return null;
  const database = await openDatabase();
  if (!database) return null;
  const id = existingId.trim() || createRecordingId(kind);
  const record: LearningRecordingRecord = { id, kind, blob, createdAt: new Date().toISOString() };
  const saved = await runWrite(database, (store) => store.put(record));
  return saved ? id : null;
}

export async function loadLearningRecording(id: string) {
  const recordingId = id.trim();
  if (!recordingId) return null;
  const database = await openDatabase();
  if (!database) return null;
  const record = await runRequest<LearningRecordingRecord | undefined>(database, "readonly", (store) => store.get(recordingId));
  if (!record) return null;
  return record.blob instanceof Blob && record.blob.size > 0 ? record.blob : null;
}

export async function deleteLearningRecording(id: string) {
  const recordingId = id.trim();
  if (!recordingId) return true;
  const database = await openDatabase();
  if (!database) return false;
  return runWrite(database, (store) => store.delete(recordingId));
}

export async function clearLearningRecordings() {
  if (typeof window === "undefined") return false;
  if (!window.indexedDB) return true;
  const database = await openDatabase();
  if (!database) return false;
  return runWrite(database, (store) => store.clear());
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  const pending = new Promise<IDBDatabase | null>((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          if (databasePromise === pending) databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  databasePromise = pending;
  const database = await pending;
  if (!database && databasePromise === pending) databasePromise = null;
  return database;
}

function runRequest<T = IDBValidKey>(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T | false>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function runWrite(database: IDBDatabase, action: (store: IDBObjectStore) => IDBRequest) {
  return new Promise<boolean>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      action(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function createRecordingId(kind: LearningRecordingKind) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${kind}:${suffix}`;
}
