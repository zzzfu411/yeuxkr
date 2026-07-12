import assert from "node:assert/strict";
import test from "node:test";

import { checkLearningStorageHealth, describeStorageHealth, requestLearningStoragePersistence } from "../src/lib/learning/storage-health.ts";

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

test.afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalThis.navigator;
});

test("storage health reports unsupported browsers without throwing", async () => {
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });

  const health = await checkLearningStorageHealth();

  assert.equal(health.supported, false);
  assert.equal(health.status, "unsupported");
  assert.equal(health.label, "不支持");
});

test("storage health warns when persistence is not granted", async () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      storage: {
        estimate: async () => ({ usage: 2_000, quota: 100_000 }),
        persisted: async () => false
      }
    }
  });

  const health = await checkLearningStorageHealth();

  assert.equal(health.status, "warning");
  assert.equal(health.label, "需备份");
  assert.equal(health.usageRatio, 0.02);
});

test("storage persistence request runs before the follow-up health check", async () => {
  let persistCalled = false;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      storage: {
        estimate: async () => ({ usage: 1_000, quota: 100_000 }),
        persisted: async () => persistCalled,
        persist: async () => {
          persistCalled = true;
          return true;
        }
      }
    }
  });

  const health = await requestLearningStoragePersistence();

  assert.equal(persistCalled, true);
  assert.equal(health.status, "secure");
  assert.equal(health.label, "已持久");
});

test("storage health treats near-full quota as critical even when persisted", () => {
  const health = describeStorageHealth({
    supported: true,
    persisted: true,
    usage: 96,
    quota: 100
  });

  assert.equal(health.status, "critical");
  assert.equal(health.label, "空间紧");
});
