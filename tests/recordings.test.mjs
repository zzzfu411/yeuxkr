import test from "node:test";
import assert from "node:assert/strict";

let openAttempts = 0;
let writeOutcome = "abort";

const database = {
  objectStoreNames: { contains: () => true },
  close() {},
  transaction() {
    const transaction = {
      objectStore() {
        return {
          put() {
            const request = { result: "request-succeeded" };
            queueMicrotask(() => {
              request.onsuccess?.();
              if (writeOutcome === "complete") transaction.oncomplete?.();
              else transaction.onabort?.();
            });
            return request;
          }
        };
      }
    };
    return transaction;
  }
};

global.window = {
  indexedDB: {
    open() {
      openAttempts += 1;
      const request = {};
      queueMicrotask(() => {
        if (openAttempts === 1) request.onerror?.();
        else {
          request.result = database;
          request.onsuccess?.();
        }
      });
      return request;
    }
  }
};

const { saveLearningRecording } = await import("../src/lib/learning/recordings.ts");

test("recording database retries failed opens and reports success only after transaction commit", async () => {
  const blob = new Blob(["audio"], { type: "audio/webm" });

  assert.equal(await saveLearningRecording(blob, "shadowing"), null);
  assert.equal(openAttempts, 1);

  writeOutcome = "abort";
  assert.equal(await saveLearningRecording(blob, "shadowing"), null);
  assert.equal(openAttempts, 2);

  writeOutcome = "complete";
  const id = await saveLearningRecording(blob, "shadowing");
  assert.match(id, /^shadowing:/);
  assert.equal(openAttempts, 2);
});
