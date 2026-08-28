import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const componentSource = readFileSync("src/components/layout/pwa-register.tsx", "utf8");
const compiledComponent = ts.transpileModule(componentSource, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

const desktopSafariUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";
const iosSafariUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";

test("captured install prompt is exposed only through a user-clicked install button", async () => {
  const runtime = createRuntime();
  await runtime.mount();
  const installEvent = createInstallEvent("accepted");

  runtime.browser.dispatch("beforeinstallprompt", installEvent);
  await runtime.flush();

  assert.equal(installEvent.prevented, true);
  assert.equal(installEvent.promptCalls, 0);
  const installButton = findButton(runtime.tree, "添加到桌面");
  assert.ok(installButton);

  await installButton.props.onClick();
  await runtime.flush();
  assert.equal(installEvent.promptCalls, 1);
});

test("a dismissed prompt can be offered again when the browser emits a new install event", async () => {
  const runtime = createRuntime();
  await runtime.mount();
  const dismissedEvent = createInstallEvent("dismissed");

  runtime.browser.dispatch("beforeinstallprompt", dismissedEvent);
  await runtime.flush();
  await findButton(runtime.tree, "添加到桌面").props.onClick();
  await runtime.flush();

  assert.equal(dismissedEvent.promptCalls, 1);
  assert.equal(findButton(runtime.tree, "添加到桌面"), null);

  const nextEvent = createInstallEvent("accepted");
  runtime.browser.dispatch("beforeinstallprompt", nextEvent);
  await runtime.flush();
  const retryButton = findButton(runtime.tree, "添加到桌面");

  assert.ok(retryButton);
  await retryButton.props.onClick();
  await runtime.flush();
  assert.equal(nextEvent.promptCalls, 1);
});

test("appinstalled clears the install entry and ignores later install prompts", async () => {
  const runtime = createRuntime();
  await runtime.mount();
  const installEvent = createInstallEvent("accepted");

  runtime.browser.dispatch("beforeinstallprompt", installEvent);
  await runtime.flush();
  await findButton(runtime.tree, "添加到桌面").props.onClick();
  runtime.browser.dispatch("appinstalled", {});
  await runtime.flush();

  assert.equal(findButton(runtime.tree, "添加到桌面"), null);
  assert.equal(textContent(runtime.tree).includes("添加到主屏幕"), false);

  runtime.browser.dispatch("beforeinstallprompt", createInstallEvent("accepted"));
  await runtime.flush();
  assert.equal(findButton(runtime.tree, "安装应用"), null);
});

test("standalone mode suppresses install UI from media query or iOS navigator state", async () => {
  const mediaRuntime = createRuntime({ standalone: true, userAgent: iosSafariUserAgent, platform: "iPhone" });
  await mediaRuntime.mount();
  mediaRuntime.browser.dispatch("beforeinstallprompt", createInstallEvent("accepted"));
  await mediaRuntime.flush();

  assert.equal(mediaRuntime.module.isStandaloneMode(mediaRuntime.browser.window, mediaRuntime.browser.navigator), true);
  assert.equal(findButton(mediaRuntime.tree, "添加到桌面"), null);
  assert.equal(textContent(mediaRuntime.tree).includes("添加到主屏幕"), false);

  const navigatorRuntime = createRuntime({ navigatorStandalone: true });
  assert.equal(navigatorRuntime.module.isStandaloneMode(navigatorRuntime.browser.window, navigatorRuntime.browser.navigator), true);
});

test("iOS browsers get add-to-home-screen guidance while unsupported browsers stay quiet", async () => {
  const iosRuntime = createRuntime({ userAgent: iosSafariUserAgent, platform: "iPhone" });
  await iosRuntime.mount();

  assert.equal(iosRuntime.module.isIosSafari(iosRuntime.browser.navigator), true);
  assert.match(textContent(iosRuntime.tree), /“分享” → “添加到主屏幕”/);

  const chromeIosRuntime = createRuntime({
    userAgent: iosSafariUserAgent.replace("Version/17.5", "CriOS/126.0.6478.54"),
    platform: "iPhone"
  });
  await chromeIosRuntime.mount();
  assert.equal(chromeIosRuntime.module.isIosSafari(chromeIosRuntime.browser.navigator), true);
  assert.match(textContent(chromeIosRuntime.tree), /“分享” → “添加到主屏幕”/);

  const desktopRuntime = createRuntime();
  await desktopRuntime.mount();
  assert.equal(desktopRuntime.module.isIosSafari(desktopRuntime.browser.navigator), false);
  assert.equal(desktopRuntime.tree, null);
});

test("every visit removes the retired offline worker and Kirina caches", async () => {
  const runtime = createRuntime();
  await runtime.mount();
  await runtime.flush();

  assert.equal(runtime.browser.unregisterCalls, 1);
  assert.equal(runtime.browser.registerCalls, 0);
  assert.deepEqual(runtime.browser.deletedCaches, ["kirina-korean-next-old"]);
  assert.equal(runtime.browser.reloadCalls, 1);
});

test("cleanup leaves unrelated workers and browser caches untouched", async () => {
  const runtime = createRuntime({ legacyWorker: false });
  await runtime.mount();
  await runtime.flush();

  assert.equal(runtime.browser.unregisterCalls, 0);
  assert.deepEqual(runtime.browser.deletedCaches, ["kirina-korean-next-old"]);
  assert.equal(runtime.browser.reloadCalls, 0);
});

test("a legacy-controlled tab reloads even when another tab already removed the registration", async () => {
  const runtime = createRuntime({ hasRegistration: false });
  await runtime.mount();
  await runtime.flush();

  assert.equal(runtime.browser.unregisterCalls, 0);
  assert.equal(runtime.browser.reloadCalls, 1);
  assert.deepEqual(runtime.browser.deletedCaches, ["kirina-korean-next-old"]);
});

test("cleanup does not unregister the same worker filename from another app scope", async () => {
  let unregisterCalls = 0;
  const runtime = createRuntime({ legacyWorker: false });
  const result = await runtime.module.removeLegacyOfflineData({
    controller: null,
    getRegistrations() {
      return Promise.resolve([{
        scope: "https://kirina.test/other/",
        active: { scriptURL: "https://kirina.test/sw.js" },
        installing: null,
        waiting: null,
        unregister() {
          unregisterCalls += 1;
          return Promise.resolve(true);
        }
      }]);
    }
  }, null);

  assert.equal(unregisterCalls, 0);
  assert.equal(result.registrationsRemoved, 0);
});

function createRuntime({ nodeEnv = "production", ...browserOptions } = {}) {
  const browser = createBrowser(browserOptions);
  const hooks = createHookHarness();
  const moduleRecord = { exports: {} };
  const buttonType = Symbol("Button");
  const context = {
    module: moduleRecord,
    exports: moduleRecord.exports,
    require(id) {
      if (id === "react") return hooks.react;
      if (id === "react/jsx-runtime") return { jsx: createElement, jsxs: createElement };
      if (id === "lucide-react") return { MonitorDown: "MonitorDownIcon" };
      if (id === "@/components/ui/button") return { Button: buttonType };
      throw new Error(`Unexpected component import: ${id}`);
    },
    window: browser.window,
    navigator: browser.navigator,
    process: { env: { NODE_ENV: nodeEnv } },
    console,
    Promise,
    URL
  };
  vm.runInNewContext(compiledComponent, context, { filename: "pwa-register.cjs" });
  hooks.setComponent(moduleRecord.exports.PwaRegister);

  return {
    browser,
    module: moduleRecord.exports,
    async mount() {
      hooks.render();
      await hooks.flush();
    },
    flush: hooks.flush,
    get tree() {
      return hooks.tree;
    }
  };
}

function createBrowser({
  standalone = false,
  navigatorStandalone = false,
  userAgent = desktopSafariUserAgent,
  platform = "MacIntel",
  maxTouchPoints = 0,
  legacyWorker = true,
  hasRegistration = true
} = {}) {
  const windowEvents = createEventTarget();
  const serviceWorkerEvents = createEventTarget();
  const displayModeEvents = createEventTarget();
  let timerId = 0;
  let registerCalls = 0;
  let unregisterCalls = 0;
  let reloadCalls = 0;
  const deletedCaches = [];
  const sessionValues = new Map();
  const registration = {
    scope: "https://kirina.test/",
    waiting: null,
    installing: null,
    active: { scriptURL: "https://kirina.test/sw.js" },
    addEventListener() {},
    update() {
      return Promise.resolve();
    }
  };
  const serviceWorker = {
    controller: legacyWorker
      ? { scriptURL: "https://kirina.test/sw.js" }
      : { scriptURL: "https://kirina.test/notifications-worker.js" },
    ready: Promise.resolve(registration),
    addEventListener: serviceWorkerEvents.addEventListener,
    removeEventListener: serviceWorkerEvents.removeEventListener,
    register() {
      registerCalls += 1;
      return Promise.resolve(registration);
    },
    getRegistrations() {
      if (!hasRegistration) return Promise.resolve([]);
      return Promise.resolve([{
        scope: "https://kirina.test/",
        active: legacyWorker
          ? { scriptURL: "https://kirina.test/sw.js" }
          : { scriptURL: "https://kirina.test/notifications-worker.js" },
        installing: null,
        waiting: null,
        unregister() {
          unregisterCalls += 1;
          return Promise.resolve(true);
        }
      }]);
    }
  };
  const mediaQuery = {
    matches: standalone,
    addEventListener: displayModeEvents.addEventListener,
    removeEventListener: displayModeEvents.removeEventListener
  };
  const window = {
    addEventListener: windowEvents.addEventListener,
    removeEventListener: windowEvents.removeEventListener,
    matchMedia() {
      return mediaQuery;
    },
    setTimeout() {
      timerId += 1;
      return timerId;
    },
    clearTimeout() {},
    location: { reload() { reloadCalls += 1; } },
    sessionStorage: {
      getItem(key) {
        return sessionValues.get(key) ?? null;
      },
      setItem(key, value) {
        sessionValues.set(key, String(value));
      },
      removeItem(key) {
        sessionValues.delete(key);
      }
    },
    caches: {
      keys() {
        return Promise.resolve(["kirina-korean-next-old", "unrelated-cache"]);
      },
      delete(name) {
        deletedCaches.push(name);
        return Promise.resolve(true);
      }
    }
  };
  const navigator = {
    userAgent,
    platform,
    maxTouchPoints,
    standalone: navigatorStandalone,
    serviceWorker
  };

  return {
    window,
    navigator,
    dispatch: windowEvents.dispatch,
    get registerCalls() {
      return registerCalls;
    },
    get unregisterCalls() {
      return unregisterCalls;
    },
    get deletedCaches() {
      return [...deletedCaches];
    },
    get reloadCalls() {
      return reloadCalls;
    }
  };
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      const handlers = listeners.get(type) ?? new Set();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    }
  };
}

function createInstallEvent(outcome) {
  let promptCalls = 0;
  let prevented = false;
  return {
    preventDefault() {
      prevented = true;
    },
    prompt() {
      promptCalls += 1;
      return Promise.resolve();
    },
    userChoice: Promise.resolve({ outcome, platform: "web" }),
    get promptCalls() {
      return promptCalls;
    },
    get prevented() {
      return prevented;
    }
  };
}

function createHookHarness() {
  const slots = [];
  let component = null;
  let cursor = 0;
  let dirty = false;
  let pendingEffects = [];
  let tree = null;

  const react = {
    useState(initialValue) {
      const index = cursor;
      cursor += 1;
      if (!slots[index]) {
        slots[index] = {
          value: typeof initialValue === "function" ? initialValue() : initialValue
        };
      }
      const setValue = (nextValue) => {
        const previousValue = slots[index].value;
        const resolvedValue = typeof nextValue === "function" ? nextValue(previousValue) : nextValue;
        if (Object.is(previousValue, resolvedValue)) return;
        slots[index].value = resolvedValue;
        dirty = true;
      };
      return [slots[index].value, setValue];
    },
    useRef(initialValue) {
      const index = cursor;
      cursor += 1;
      if (!slots[index]) slots[index] = { current: initialValue };
      return slots[index];
    },
    useEffect(effect, dependencies) {
      const index = cursor;
      cursor += 1;
      const previous = slots[index];
      const changed = !previous || !sameDependencies(previous.dependencies, dependencies);
      if (!previous) slots[index] = { dependencies: undefined, cleanup: undefined };
      if (changed) pendingEffects.push({ index, effect, dependencies });
    }
  };

  function render() {
    let renderCount = 0;
    do {
      assert.ok(component);
      assert.ok(renderCount < 20, "component did not settle after state updates");
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      tree = component();
      const effects = pendingEffects;
      pendingEffects = [];
      for (const pending of effects) {
        const slot = slots[pending.index];
        slot.cleanup?.();
        slot.cleanup = pending.effect();
        slot.dependencies = pending.dependencies;
      }
      renderCount += 1;
    } while (dirty);
    return tree;
  }

  async function flush() {
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
      if (dirty) render();
    }
  }

  return {
    react,
    setComponent(nextComponent) {
      component = nextComponent;
    },
    render,
    flush,
    get tree() {
      return tree;
    }
  };
}

function sameDependencies(previous, next) {
  if (!previous || !next || previous.length !== next.length) return false;
  return previous.every((value, index) => Object.is(value, next[index]));
}

function createElement(type, props) {
  return { type, props: props ?? {} };
}

function findButton(node, label) {
  if (!node || typeof node !== "object") return null;
  if (typeof node.props?.onClick === "function" && textContent(node).includes(label)) return node;
  const children = Array.isArray(node) ? node : node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const match = findButton(child, label);
    if (match) return match;
  }
  return null;
}

function textContent(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  return textContent(node.props?.children);
}
