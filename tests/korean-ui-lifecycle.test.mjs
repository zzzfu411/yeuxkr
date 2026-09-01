import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const JSX_RUNTIME = { jsx: createElement, jsxs: createElement, Fragment: Symbol("Fragment") };

test("KoreanInput ignores Enter while an IME composition is active", () => {
  const hooks = createHookHarness();
  const document = { activeElement: null };
  const { KoreanInput } = loadComponent("src/components/korean/korean-input.tsx", {
    react: hooks.react,
    "lucide-react": { Keyboard: "KeyboardIcon" },
    "@/components/korean/hangul-keyboard": { HangulKeyboard: "HangulKeyboard" },
    "@/lib/korean/jamo": createJamoMock(),
    "@/lib/utils": { cn }
  }, { document, window: createMediaWindow() });

  let submissions = 0;
  const props = { value: "answer", onChange() {}, onSubmit() { submissions += 1; } };
  let tree = hooks.render(KoreanInput, props);
  let input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  const inputControl = createInputControl("answer", document);
  input.props.ref.current = inputControl;

  const composingEnter = createKeyEvent("Enter", { isComposing: true });
  input.props.onKeyDown(composingEnter);
  assert.equal(submissions, 0);
  assert.equal(composingEnter.prevented, false);

  input.props.onCompositionStart();
  const compositionRefEnter = createKeyEvent("Enter");
  input.props.onKeyDown(compositionRefEnter);
  assert.equal(submissions, 0);
  assert.equal(compositionRefEnter.prevented, false);

  input.props.onCompositionEnd({ currentTarget: inputControl });
  const legacyImeEnter = createKeyEvent("Enter", { keyCode: 229 });
  input.props.onKeyDown(legacyImeEnter);
  assert.equal(submissions, 0);

  tree = hooks.render(KoreanInput, props);
  input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  const regularEnter = createKeyEvent("Enter");
  input.props.onKeyDown(regularEnter);
  assert.equal(submissions, 1);
  assert.equal(regularEnter.prevented, true);
});

test("KoreanInput screen keys edit at the saved cursor or selection and restore focus", () => {
  const hooks = createHookHarness();
  const document = { activeElement: null };
  const { KoreanInput } = loadComponent("src/components/korean/korean-input.tsx", {
    react: hooks.react,
    "lucide-react": { Keyboard: "KeyboardIcon" },
    "@/components/korean/hangul-keyboard": { HangulKeyboard: "HangulKeyboard" },
    "@/lib/korean/jamo": createJamoMock(),
    "@/lib/utils": { cn }
  }, { document, window: createMediaWindow() });

  let value = "abcd";
  const changed = [];
  const makeProps = () => ({
    value,
    onChange(next) {
      value = next;
      changed.push(next);
    }
  });

  let tree = hooks.render(KoreanInput, makeProps());
  let input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  const inputControl = createInputControl(value, document);
  input.props.ref.current = inputControl;
  findElement(tree, (node) => node.type === "button" && node.props["aria-pressed"] === false).props.onClick();
  tree = hooks.render(KoreanInput, makeProps());

  input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  let keyboard = findElement(tree, (node) => node.type === "HangulKeyboard");
  saveSelection(input, inputControl, document, 1, 3);
  keyboard.props.onJamo("X");
  assert.equal(changed.at(-1), "aXd");
  commitControlledValue(hooks, KoreanInput, makeProps, inputControl);
  assert.deepEqual(inputControl.lastSelection, [2, 2]);
  assert.equal(document.activeElement, inputControl);

  value = "abcd";
  inputControl.value = value;
  tree = hooks.render(KoreanInput, makeProps());
  input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  keyboard = findElement(tree, (node) => node.type === "HangulKeyboard");
  saveSelection(input, inputControl, document, 1, 3);
  keyboard.props.onBackspace();
  assert.equal(changed.at(-1), "ad");
  commitControlledValue(hooks, KoreanInput, makeProps, inputControl);
  assert.deepEqual(inputControl.lastSelection, [1, 1]);

  value = "abcd";
  inputControl.value = value;
  tree = hooks.render(KoreanInput, makeProps());
  input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  keyboard = findElement(tree, (node) => node.type === "HangulKeyboard");
  saveSelection(input, inputControl, document, 2, 2);
  keyboard.props.onBackspace();
  assert.equal(changed.at(-1), "acd");
  commitControlledValue(hooks, KoreanInput, makeProps, inputControl);
  assert.deepEqual(inputControl.lastSelection, [1, 1]);

  value = "abcd";
  inputControl.value = value;
  tree = hooks.render(KoreanInput, makeProps());
  input = findElement(tree, (node) => node.type === "input" && node.props.lang === "ko");
  keyboard = findElement(tree, (node) => node.type === "HangulKeyboard");
  saveSelection(input, inputControl, document, 1, 3);
  keyboard.props.onSpace();
  assert.equal(changed.at(-1), "a d");
  commitControlledValue(hooks, KoreanInput, makeProps, inputControl);
  assert.deepEqual(inputControl.lastSelection, [2, 2]);
  assert.ok(inputControl.focusCalls >= 4);
});

test("HangulKeyboard keeps 24px key tracks at 320px and contains narrower overflow", () => {
  const hooks = createHookHarness();
  const { HangulKeyboard } = loadComponent("src/components/korean/hangul-keyboard.tsx", {
    react: hooks.react,
    "lucide-react": { ArrowBigUp: "ShiftIcon", CornerDownLeft: "EnterIcon", Delete: "DeleteIcon" },
    "@/lib/utils": { cn }
  });
  const tree = hooks.render(HangulKeyboard, { onJamo() {}, onBackspace() {}, onSpace() {} });
  const rows = findElements(tree, (node) => typeof node.props?.style?.gridTemplateColumns === "string");
  const firstRow = rows[0];

  assert.match(tree.props.className, /max-w-full/);
  assert.match(tree.props.className, /overflow-x-auto/);
  assert.match(firstRow.props.style.gridTemplateColumns, /repeat\(10, minmax\(24px, 1fr\)\)/);
  assert.match(firstRow.props.className, /gap-px/);
  assert.ok(10 * 24 + 9 <= 320 - 2 * 14.4 - 2 * 4);

  let prevented = false;
  tree.props.onMouseDown({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test("AppShell stops active and voice-waiting speech when the pathname changes", () => {
  const hooks = createHookHarness();
  let pathname = "/";
  let stops = 0;
  let playing = true;
  let waitingForVoice = true;
  const icons = Object.fromEntries([
    "BookOpen", "BrainCircuit", "CircleAlert", "Compass", "GraduationCap", "LibraryBig", "MessagesSquare",
    "NotebookTabs", "Radio", "RefreshCcw", "Settings2", "Sparkles"
  ].map((name) => [name, `${name}Icon`]));
  const window = {
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    matchMedia() { return { matches: false }; }
  };
  const { AppShell } = loadComponent("src/components/layout/app-shell.tsx", {
    react: hooks.react,
    "next/link": { default: "Link" },
    "next/image": { default: "Image" },
    "next/navigation": { usePathname: () => pathname },
    "lucide-react": icons,
    "@/components/layout/pwa-register": { PwaRegister: "PwaRegister" },
    "@/components/layout/learning-data-panel": { LearningDataPanel: "LearningDataPanel" },
    "@/components/layout/now-playing": { NowPlayingRail: "NowPlayingRail", NowPlayingBar: "NowPlayingBar" },
    "@/components/theme/theme-toggle": { ThemeToggle: "ThemeToggle" },
    "@/components/korean/speech-status": { SpeechStatusBanner: "SpeechStatusBanner" },
    "@/lib/speech": {
      stopSpeech() {
        stops += 1;
        playing = false;
        waitingForVoice = false;
      }
    },
    "@/lib/utils": { cn }
  }, { window });

  hooks.render(AppShell, { children: "page" });
  assert.equal(stops, 0);
  pathname = "/settings";
  hooks.render(AppShell, { children: "settings" });
  assert.equal(stops, 1);
  assert.equal(playing, false);
  assert.equal(waitingForVoice, false);

  playing = true;
  waitingForVoice = true;
  hooks.render(AppShell, { children: "same settings" });
  assert.equal(stops, 1);
  assert.equal(playing, true);
  assert.equal(waitingForVoice, true);
});

test("SpeechSettings reports storage failure and keeps the last persisted controls", () => {
  const hooks = createHookHarness();
  let saveSucceeds = false;
  const saves = [];
  const window = {
    addEventListener() {},
    removeEventListener() {},
    speechSynthesis: { addEventListener() {}, removeEventListener() {} }
  };
  const { SpeechSettings } = loadComponent("src/components/korean/speech-settings.tsx", {
    react: hooks.react,
    "lucide-react": { Volume2: "VolumeIcon" },
    "@/components/ui/button": { Button: "Button" },
    "@/components/korean/speech-status": { useKoreanVoiceStatus: () => ({ status: "ready" }) },
    "@/lib/speech": {
      ensureVoicesReady: () => ({ then() {} }),
      getSpeechSettings: () => ({}),
      listKoreanVoices: () => [],
      saveSpeechSettings(settings) {
        saves.push(settings);
        return saveSucceeds;
      },
      speakKorean() {},
      SPEECH_RATE_MIN: 0.6,
      SPEECH_RATE_MAX: 1.1
    }
  }, { window });

  let tree = hooks.render(SpeechSettings, {});
  let select = findElement(tree, (node) => node.type === "select");
  let range = findElement(tree, (node) => node.type === "input" && node.props.type === "range");
  select.props.onChange({ target: { value: "voice-2" } });
  tree = hooks.render(SpeechSettings, {});
  select = findElement(tree, (node) => node.type === "select");
  assert.equal(select.props.value, "");
  assert.match(textContent(findElement(tree, (node) => node.props?.role === "alert")), /未能保存/);

  range = findElement(tree, (node) => node.type === "input" && node.props.type === "range");
  range.props.onChange({ target: { value: "0.96" } });
  tree = hooks.render(SpeechSettings, {});
  range = findElement(tree, (node) => node.type === "input" && node.props.type === "range");
  assert.equal(range.props.value, 0.82);

  saveSucceeds = true;
  select = findElement(tree, (node) => node.type === "select");
  select.props.onChange({ target: { value: "voice-2" } });
  tree = hooks.render(SpeechSettings, {});
  select = findElement(tree, (node) => node.type === "select");
  assert.equal(select.props.value, "voice-2");
  assert.equal(findElement(tree, (node) => node.props?.role === "alert"), null);
  assert.equal(JSON.stringify(saves), JSON.stringify([{ voiceURI: "voice-2" }, { rate: 0.96 }, { voiceURI: "voice-2" }]));
});

test("shadowing recording releases the acquired stream when recorder construction or start fails", async () => {
  for (const failure of ["constructor", "start"]) {
    const hooks = createHookHarness();
    const streams = [];
    const recorders = [];

    class FailingMediaRecorder {
      constructor() {
        this.state = "inactive";
        this.mimeType = "audio/webm";
        this.ondataavailable = null;
        this.onstop = null;
        recorders.push(this);
        if (failure === "constructor") throw new Error("constructor failed");
      }

      start() {
        if (failure === "start") throw new Error("start failed");
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
      }
    }

    const getUserMedia = async () => {
      const track = { stops: 0, stop() { this.stops += 1; } };
      const stream = { track, getTracks: () => [track] };
      streams.push(stream);
      return stream;
    };
    const { LessonTaskEvidencePanel } = loadLessonEvidencePanels(hooks, { MediaRecorder: FailingMediaRecorder, getUserMedia });
    const props = createShadowingPanelProps();

    let tree = hooks.render(LessonTaskEvidencePanel, props);
    await findButton(tree, "开始录音").props.onClick();
    tree = hooks.render(LessonTaskEvidencePanel, props);

    assert.equal(streams[0].track.stops, 1, `${failure} failure must stop the acquired track`);
    assert.equal(hooks.refs().includes(streams[0]), false, `${failure} failure must clear the stream ref`);
    assert.equal(hooks.refs().some((value) => recorders.includes(value)), false, `${failure} failure must clear the recorder ref`);
    assert.equal(recorders[0].ondataavailable, null);
    assert.equal(recorders[0].onstop, null);
    assert.equal(findButton(tree, "开始录音").props.disabled, false);

    await findButton(tree, "开始录音").props.onClick();
    hooks.render(LessonTaskEvidencePanel, props);
    assert.equal(streams[1].track.stops, 1, `${failure} failure must remain retryable`);
  }
});

test("external recording IDs cancel active shadowing and capstone recorders into a startable state", async (context) => {
  await context.test("shadowing", async () => {
    const hooks = createHookHarness();
    const media = createActiveMediaHarness();
    let saves = 0;
    const { LessonTaskEvidencePanel } = loadLessonEvidencePanels(hooks, {
      MediaRecorder: media.MediaRecorder,
      getUserMedia: media.getUserMedia,
      recordingOverrides: { saveLearningRecording: async () => { saves += 1; return "unexpected"; } }
    });
    const initialProps = createShadowingPanelProps();

    let tree = hooks.render(LessonTaskEvidencePanel, initialProps);
    await findButton(tree, "开始录音").props.onClick();
    tree = hooks.render(LessonTaskEvidencePanel, initialProps);
    assert.ok(findButton(tree, "停止"));

    const externalProps = createShadowingPanelProps({
      evidence: {
        kind: "shadowing",
        text: "",
        recordedSeconds: 8,
        recordingId: "external-shadowing",
        updatedAt: "2026-07-17T00:00:00.000Z"
      }
    });
    hooks.render(LessonTaskEvidencePanel, externalProps);
    await Promise.resolve();
    tree = hooks.render(LessonTaskEvidencePanel, externalProps);

    assert.equal(media.tracks[0].stops, 1);
    assert.equal(media.recorders[0].stops, 1);
    assert.equal(media.recorders[0].onstop, null);
    assert.equal(saves, 0, "cancellation must not persist the partial recording");
    assert.equal(hooks.refs().includes(media.streams[0]), false);
    assert.equal(hooks.refs().includes(media.recorders[0]), false);
    assert.equal(findButton(tree, "开始录音").props.disabled, false);
  });

  await context.test("capstone", async () => {
    const hooks = createHookHarness();
    const media = createActiveMediaHarness();
    let clearedIntervals = 0;
    const window = {
      setInterval() { return 71; },
      clearInterval(id) {
        assert.equal(id, 71);
        clearedIntervals += 1;
      }
    };
    const { CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
      MediaRecorder: media.MediaRecorder,
      getUserMedia: media.getUserMedia,
      window
    });
    const initialProps = createCapstonePanelProps();

    let tree = hooks.render(CapstoneEvidencePanel, initialProps);
    await findButton(tree, "开始录音").props.onClick();
    tree = hooks.render(CapstoneEvidencePanel, initialProps);
    assert.ok(findButton(tree, "停止录音"));

    const externalProps = createCapstonePanelProps({
      evidence: {
        transcript: "",
        weakPoint: "",
        targetRewrite: "",
        rubric: [],
        recordedSeconds: 120,
        recordingId: "external-capstone",
        updatedAt: "2026-07-17T00:00:00.000Z"
      }
    });
    hooks.render(CapstoneEvidencePanel, externalProps);
    await Promise.resolve();
    tree = hooks.render(CapstoneEvidencePanel, externalProps);

    assert.equal(media.tracks[0].stops, 1);
    assert.equal(media.recorders[0].stops, 1);
    assert.equal(media.recorders[0].onstop, null);
    assert.equal(clearedIntervals, 1);
    assert.equal(hooks.refs().includes(media.streams[0]), false);
    assert.equal(hooks.refs().includes(media.recorders[0]), false);
    assert.equal(findButton(tree, "开始录音").props.disabled, false);
  });
});

test("re-recording overwrites an unsaved recording instead of orphaning its blob", async (context) => {
  for (const panel of ["shadowing", "capstone"]) {
    await context.test(panel, async () => {
      const hooks = createHookHarness();
      const media = createActiveMediaHarness();
      const saves = [];
      const deletes = [];
      const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
        MediaRecorder: media.MediaRecorder,
        getUserMedia: media.getUserMedia,
        recordingOverrides: {
          saveLearningRecording: async (blob, kind, existingId) => {
            saves.push({ kind, existingId, size: blob.size });
            return existingId || `${kind}-draft`;
          },
          deleteLearningRecording: async (id) => {
            deletes.push(id);
            return true;
          }
        }
      });
      const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
      const props = panel === "shadowing" ? createShadowingPanelProps() : createCapstonePanelProps();
      const startLabel = "开始录音";
      const stopLabel = panel === "shadowing" ? "停止" : "停止录音";

      let tree = hooks.render(Component, props);
      await findButton(tree, startLabel).props.onClick();
      media.recorders[0].ondataavailable({ data: new Blob(["first"]) });
      tree = hooks.render(Component, props);
      findButton(tree, stopLabel).props.onClick();
      await new Promise((resolve) => setImmediate(resolve));

      tree = hooks.render(Component, props);
      await findButton(tree, startLabel).props.onClick();
      media.recorders[1].ondataavailable({ data: new Blob(["second"]) });
      tree = hooks.render(Component, props);
      findButton(tree, stopLabel).props.onClick();
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(saves.length, 2);
      assert.equal(saves[0].existingId, "");
      assert.equal(saves[1].existingId, `${panel}-draft`);
      assert.deepEqual(deletes, []);
    });
  }
});

test("recording controls stay locked until the asynchronous blob write finishes", async (context) => {
  const source = readFileSync("src/app/learn/[lessonId]/lesson-client.tsx", "utf8");
  assert.match(source, /disabled={!check\.ready \|\| recording \|\| startingRecording \|\| savingRecording}/);
  assert.match(source, /const ready = !recording && !startingRecording && !savingRecording && isValidCapstoneEvidence/);
  assert.match(source, /if \(recording \|\| startingRecording \|\| savingRecording\)/);
  for (const panel of ["shadowing", "capstone"]) {
    await context.test(panel, async () => {
      const hooks = createHookHarness();
      const media = createActiveMediaHarness();
      const saves = [];
      const resolvers = [];
      const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
        MediaRecorder: media.MediaRecorder,
        getUserMedia: media.getUserMedia,
        recordingOverrides: {
          saveLearningRecording: async (blob, kind, existingId) => {
            saves.push({ blob, kind, existingId });
            return new Promise((resolve) => resolvers.push(resolve));
          }
        }
      });
      const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
      const props = panel === "shadowing" ? createShadowingPanelProps() : createCapstonePanelProps();
      const startLabel = "开始录音";
      const stopLabel = panel === "shadowing" ? "停止" : "停止录音";

      let tree = hooks.render(Component, props);
      await findButton(tree, startLabel).props.onClick();
      media.recorders[0].ondataavailable({ data: new Blob(["first"]) });
      tree = hooks.render(Component, props);
      findButton(tree, stopLabel).props.onClick();

      tree = hooks.render(Component, props);
      const savingButton = findButton(tree, "保存录音");
      assert.equal(savingButton.props.disabled, true);
      await savingButton.props.onClick();
      assert.equal(media.recorders.length, 1, "a second recorder must not start while the first blob is being written");
      assert.equal(saves.length, 1);

      resolvers[0](`${panel}-draft`);
      await new Promise((resolve) => setImmediate(resolve));
      tree = hooks.render(Component, props);
      assert.equal(findButton(tree, startLabel).props.disabled, false);
    });
  }
});

test("lesson evidence panels hydrate persisted drafts without overwriting local input", () => {
  const persistedShadowing = {
    kind: "shadowing",
    text: "저는 기억한 문장을 다시 말합니다.",
    recordedSeconds: 4.2,
    recordingId: "shadowing:persisted",
    updatedAt: "2026-08-31T00:00:00.000Z"
  };
  const cleanHooks = createHookHarness();
  const cleanPanels = loadLessonEvidencePanels(cleanHooks, {});
  let tree = cleanHooks.render(cleanPanels.LessonTaskEvidencePanel, createShadowingPanelProps());
  tree = cleanHooks.render(cleanPanels.LessonTaskEvidencePanel, createShadowingPanelProps({ evidence: persistedShadowing }));
  tree = cleanHooks.render(cleanPanels.LessonTaskEvidencePanel, createShadowingPanelProps({ evidence: persistedShadowing }));
  assert.equal(findElement(tree, (node) => node.type === "textarea").props.value, persistedShadowing.text);

  const dirtyHooks = createHookHarness();
  const dirtyPanels = loadLessonEvidencePanels(dirtyHooks, {});
  tree = dirtyHooks.render(dirtyPanels.LessonTaskEvidencePanel, createShadowingPanelProps());
  findElement(tree, (node) => node.type === "textarea").props.onChange({ target: { value: "本地先写下的草稿" } });
  tree = dirtyHooks.render(dirtyPanels.LessonTaskEvidencePanel, createShadowingPanelProps({ evidence: persistedShadowing }));
  tree = dirtyHooks.render(dirtyPanels.LessonTaskEvidencePanel, createShadowingPanelProps({ evidence: persistedShadowing }));
  assert.equal(findElement(tree, (node) => node.type === "textarea").props.value, "本地先写下的草稿");

  const persistedCapstone = {
    transcript: "제 생각은 이렇습니다.",
    weakPoint: "连接词需要更自然",
    targetRewrite: "그래서 다음에는 더 구체적으로 말하겠습니다.",
    rubric: ["position", "reason"],
    recordedSeconds: 0,
    recordingId: "",
    updatedAt: "2026-08-31T00:00:00.000Z"
  };
  const capstoneHooks = createHookHarness();
  const capstonePanels = loadLessonEvidencePanels(capstoneHooks, {});
  tree = capstoneHooks.render(capstonePanels.CapstoneEvidencePanel, createCapstonePanelProps());
  tree = capstoneHooks.render(capstonePanels.CapstoneEvidencePanel, createCapstonePanelProps({ evidence: persistedCapstone }));
  tree = capstoneHooks.render(capstonePanels.CapstoneEvidencePanel, createCapstonePanelProps({ evidence: persistedCapstone }));
  const capstoneTextareas = findElements(tree, (node) => node.type === "textarea");
  assert.deepEqual(capstoneTextareas.map((node) => node.props.value), [
    persistedCapstone.transcript,
    persistedCapstone.targetRewrite
  ]);
  assert.equal(findElements(tree, (node) => node.type === "input").some((node) => node.props.value === persistedCapstone.weakPoint), true);
});

test("MasteryGate reports a failed persistence write and retries without another quiz", () => {
  const hooks = createHookHarness();
  let saveSucceeds = false;
  let saveAttempts = 0;
  const { MasteryGate } = loadComponent("src/components/learning/mastery-gate.tsx", {
    react: hooks.react,
    "lucide-react": { RefreshCcw: "RefreshIcon", ShieldCheck: "ShieldIcon", X: "XIcon" },
    "@/components/learning/drill-runner": { DrillRunner: "DrillRunner" },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/inline-alert": { InlineAlert: "InlineAlert" },
    "@/lib/learning/gate": {
      buildGateQuestions: () => [{ id: "q1" }],
      GATE_PASS_SCORE: 80,
      hasSkippedGateAudio: () => false
    }
  });
  const props = {
    kind: "vocab",
    itemId: "v-test",
    title: "테스트",
    onPassed() {
      saveAttempts += 1;
      return saveSucceeds;
    },
    onClose() {}
  };

  let tree = hooks.render(MasteryGate, props);
  let runner = findElement(tree, (node) => node.type === "DrillRunner");
  runner.props.onResult(100, []);
  tree = hooks.render(MasteryGate, props);
  runner = findElement(tree, (node) => node.type === "DrillRunner");
  let addon = runner.props.resultAddon({ score: 100, answers: [] });
  assert.match(textContent(addon), /没有写入本地存储/);
  assert.doesNotMatch(textContent(addon), /已写入掌握记录/);
  assert.equal(saveAttempts, 1);

  saveSucceeds = true;
  findButton(addon, "重试写入").props.onClick();
  tree = hooks.render(MasteryGate, props);
  runner = findElement(tree, (node) => node.type === "DrillRunner");
  addon = runner.props.resultAddon({ score: 100, answers: [] });
  assert.match(textContent(addon), /掌握记录已写入/);
  assert.equal(saveAttempts, 2);
});

test("MistakesPage remounts retrain runner when the target changes", () => {
  const hooks = createHookHarness();
  const insights = [
    {
      id: "q1",
      itemId: "lesson:q1",
      prompt: "第一题",
      answer: "하나",
      correct: 0,
      wrong: 1,
      box: 0,
      dueAt: 0,
      lastSeenAt: null,
      due: true,
      sourceLabel: "课程练习",
      statusLabel: "现在该处理",
      severity: 7
    },
    {
      id: "q2",
      itemId: "lesson:q2",
      prompt: "第二题",
      answer: "둘",
      correct: 0,
      wrong: 1,
      box: 0,
      dueAt: 0,
      lastSeenAt: null,
      due: true,
      sourceLabel: "课程练习",
      statusLabel: "现在该处理",
      severity: 7
    }
  ];
  const { default: MistakesPage } = loadComponent("src/app/mistakes/page.tsx", {
    react: hooks.react,
    "next/link": { default: "Link" },
    "lucide-react": {
      ArrowRight: "ArrowRightIcon",
      CircleAlert: "CircleAlertIcon",
      Clock: "ClockIcon",
      Play: "PlayIcon",
      RefreshCcw: "RefreshIcon",
      Trash2: "TrashIcon"
    },
    "@/components/assets/visual-panel": { VisualPanel: "VisualPanel" },
    "@/components/learning/drill-runner": { DrillRunner: "DrillRunner" },
    "@/components/learning/learning-compass": { LearningCompass: "LearningCompass" },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/inline-alert": { InlineAlert: "InlineAlert" },
    "@/components/ui/section": {
      ModuleHero: "ModuleHero",
      PageHeader: "PageHeader",
      SectionHeading: "SectionHeading",
      Surface: "Surface"
    },
    "@/components/ui/track-row": { TrackRow: "TrackRow" },
    "@/lib/learning/player": { firstHangul: (value, fallback) => value || fallback },
    "@/lib/learning/mistakes": {
      buildMistakeInsights: () => insights,
      buildRetrainQuestions: (_state, ids) => (ids ?? insights.map((item) => item.id)).map((id) => ({
        id,
        type: "type",
        prompt: id,
        answer: id
      })),
      summarizeMistakes: () => ({ total: 2, due: 2, repeated: 0, stabilizing: 0, mastered: 0 })
    },
    "@/lib/learning/srs": { getSrsStateFromRaw: () => ({ cards: {} }) },
    "@/lib/learning/storage": {
      STORAGE_KEYS: { srs: "srs" },
      useClientNow: () => 0,
      useStorageRaw: () => null
    },
    "@/lib/learning/workspace": {
      gradeReviewCardAndProgress: () => true,
      removeMistakeCardAndPracticeItem: () => true,
      useLearningWorkspace: () => ({ workspace: {} })
    }
  });

  let tree = hooks.render(MistakesPage, {});
  let cards = findElements(tree, (node) => node.props?.item?.id === "q1" || node.props?.item?.id === "q2");
  assert.equal(cards.length, 2);

  cards[0].props.onRetrain("q1");
  tree = hooks.render(MistakesPage, {});
  let runner = findElement(tree, (node) => node.type === "DrillRunner");
  assert.equal(runner.key, 1);
  assert.equal(runner.props.questions[0].id, "q1");

  cards = findElements(tree, (node) => node.props?.item?.id === "q1" || node.props?.item?.id === "q2");
  cards[1].props.onRetrain("q2");
  tree = hooks.render(MistakesPage, {});
  runner = findElement(tree, (node) => node.type === "DrillRunner");
  assert.equal(runner.key, 2);
  assert.equal(runner.props.questions[0].id, "q2");
});

test("onboarding unlocks its voice step only after playback actually starts", () => {
  const hooks = createHookHarness();
  let playbackOptions = null;
  const { OnboardingFlow } = loadComponent("src/components/learning/onboarding-flow.tsx", {
    react: hooks.react,
    "next/link": { default: "Link" },
    "next/navigation": { useRouter: () => ({ replace() {} }) },
    "lucide-react": {
      ArrowRight: "ArrowIcon",
      CheckCircle2: "CheckIcon",
      Volume2: "VolumeIcon"
    },
    "@/components/assets/visual-panel": { VisualPanel: "VisualPanel" },
    "@/components/korean/korean-input": { KoreanInput: "KoreanInput" },
    "@/components/korean/speech-settings": { SpeechSettings: "SpeechSettings" },
    "@/components/korean/speech-status": { useKoreanVoiceStatus: () => ({ status: "ready" }) },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/inline-alert": { InlineAlert: "InlineAlert" },
    "@/components/ui/section": { Surface: "Surface" },
    "@/lib/learning/storage": { nowIso: () => "2026-08-30T00:00:00.000Z" },
    "@/lib/learning/workspace": { useLearningWorkspace: () => ({ saveProfile: () => true }) },
    "@/lib/speech": {
      speakKorean(_text, options) {
        playbackOptions = options;
        return true;
      }
    }
  });

  let tree = hooks.render(OnboardingFlow, {});
  findButton(tree, "我是零基础").props.onClick();
  tree = hooks.render(OnboardingFlow, {});
  findButton(tree, "下一步：检查发音").props.onClick();
  tree = hooks.render(OnboardingFlow, {});

  let next = findButton(tree, "先点试听");
  assert.equal(next.props.disabled, true);
  findButton(tree, "试听").props.onClick();
  tree = hooks.render(OnboardingFlow, {});
  next = findButton(tree, "先点试听");
  assert.equal(next.props.disabled, true);

  playbackOptions.onstart();
  tree = hooks.render(OnboardingFlow, {});
  next = findButton(tree, "下一步：试打韩文");
  assert.equal(next.props.disabled, false);
});

test("ThemeToggle applies valid theme changes received from another tab", () => {
  let subscribe = null;
  let notified = 0;
  let theme = "yuan";
  const listeners = new Map();
  const react = {
    useSyncExternalStore(nextSubscribe, getSnapshot) {
      subscribe = nextSubscribe;
      return getSnapshot();
    }
  };
  const document = {
    documentElement: {
      getAttribute: () => theme,
      setAttribute(_name, value) { theme = value; }
    }
  };
  const window = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    localStorage: { setItem() {} },
    dispatchEvent() {}
  };
  const { ThemeToggle } = loadComponent("src/components/theme/theme-toggle.tsx", { react }, { document, window });

  ThemeToggle();
  const unsubscribe = subscribe(() => { notified += 1; });
  listeners.get("storage")({ key: "unrelated", newValue: "ye" });
  assert.equal(theme, "yuan");
  assert.equal(notified, 0);
  // Legacy dark value migrates to the paper night theme.
  listeners.get("storage")({ key: "yeuxkr.theme", newValue: "dark" });
  assert.equal(theme, "ye");
  assert.equal(notified, 1);
  listeners.get("storage")({ key: "yeuxkr.theme", newValue: "qing" });
  assert.equal(theme, "qing");
  assert.equal(notified, 2);
  unsubscribe();
  assert.equal(listeners.has("storage"), false);
});

test("immersion query changes replace a stale in-page material selection", () => {
  const source = readFileSync("src/app/immersion/page.tsx", "utf8");
  assert.match(source, /const nextMaterialId = requestedMaterialId \|\| defaultMaterialIdRef\.current;/);
  assert.match(source, /if \(nextMaterialId !== displayedMaterialIdRef\.current\) \{\s*setActiveDraftReady\(false\);\s*\}/);
  assert.match(source, /setSelectedMaterialId\(requestedMaterialId\);\s*notifyNowPlayingLocationChange\(\);/);
  assert.match(source, /window\.history\.replaceState\([^;]+;\s*notifyNowPlayingLocationChange\(\);/);
});

test("reselecting the active immersion material keeps the live draft armed", () => {
  const source = readFileSync("src/app/immersion/page.tsx", "utf8");
  const selectMaterial = source.slice(source.indexOf("const selectMaterial"), source.indexOf("const clearActiveArchive"));
  assert.match(selectMaterial, /if \(materialId === active\.id\) \{\s*pinActiveMaterial\(materialId\);\s*return;/);
  assert.match(selectMaterial, /setActiveDraftReady\(false\);\s*pinActiveMaterial\(materialId\);\s*resetMaterialWork\(\);/);
});

test("immersion autosave waits for the current material draft to hydrate", () => {
  const source = readFileSync("src/app/immersion/page.tsx", "utf8");
  assert.match(source, /const hydratedMaterialRef = useRef\(""\);/);
  assert.match(source, /let cancelled = false;\s*hydratedMaterialRef\.current = "";\s*queueMicrotask/);
  assert.match(source, /const savedDraft = getImmersionMaterialDraft\(active\.id\);\s*hydratedMaterialRef\.current = active\.id;/);
  assert.match(source, /if \(!activeDraftReady \|\| suppressDraftSaveRef\.current \|\| hydratedMaterialRef\.current !== active\.id\) return;/);
});

test("clearing an immersion archive cannot immediately recreate its live draft", () => {
  const source = readFileSync("src/app/immersion/page.tsx", "utf8");
  const clearArchive = source.slice(source.indexOf("const clearActiveArchive"), source.indexOf("const finishMaterial"));
  assert.match(clearArchive, /suppressDraftSaveRef\.current = true;\s*setActiveDraftReady\(false\);\s*pinActiveMaterial\(active\.id\);\s*if \(!clearMaterialArchive/);
  assert.match(clearArchive, /if \(draftCleared\) \{[\s\S]*setDictationEvidence\(""\);[\s\S]*setRetellEvidence\(""\);[\s\S]*setDraft\(""\);/);
  assert.match(clearArchive, /queueMicrotask\(\(\) => \{\s*suppressDraftSaveRef\.current = false;\s*setActiveDraftReady\(true\);/);
});

test("finishing an immersion material clears live draft fields then re-enables later saves", () => {
  const source = readFileSync("src/app/immersion/page.tsx", "utf8");
  const finishMaterial = source.slice(source.indexOf("const finishMaterial"), source.indexOf("const focusMaterialPractice"));
  assert.match(finishMaterial, /suppressDraftSaveRef\.current = true;\s*setActiveDraftReady\(false\);\s*pinActiveMaterial\(active\.id\);/);
  assert.match(finishMaterial, /setDictationEvidence\(""\);[\s\S]*setRetellEvidence\(""\);[\s\S]*setDraft\(""\);/);
  assert.match(finishMaterial, /delete next\[active\.id\]/);
  assert.match(finishMaterial, /queueMicrotask\(\(\) => \{\s*suppressDraftSaveRef\.current = false;\s*setActiveDraftReady\(true\);/);
});

test("completed immersion materials do not claim an unfinished draft restore", () => {
  const source = readFileSync("src/app/immersion/page.tsx", "utf8");
  assert.match(source, /draftRestoredFor === active\.id && !completed\.has\(active\.id\)/);
});

test("mistakes retrain grades cards even when they are not yet due", () => {
  const source = readFileSync("src/app/mistakes/page.tsx", "utf8");
  assert.match(source, /gradeReviewCardAndProgress\(card, entry\.correct, \{ allowEarly: true \}\)/);
});

test("paper frames clip media inside the panel instead of hanging tape", () => {
  const visual = readFileSync("src/components/assets/visual-panel.tsx", "utf8");
  const section = readFileSync("src/components/ui/section.tsx", "utf8");
  const selfStudy = readFileSync("src/app/self-study/page.tsx", "utf8");
  const drill = readFileSync("src/components/learning/drill-runner.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(visual, /className=\{\s*cn\("visual-panel relative isolate min-h-56 rounded-none"/);
  assert.match(visual, /<div className="absolute inset-0 overflow-hidden">/);
  assert.match(visual, /\{treatment !== "ambient" \? <span className="paper-tape left-6 top-\[-7px\]"/);
  assert.match(section, /"surface relative p-4 md:p-5"/);
  assert.match(section, /className="studio-panel relative grid lg:grid-cols-\[minmax\(0,1fr\)_minmax\(18rem,0\.44fr\)\]"/);
  assert.doesNotMatch(section, /surface relative overflow-hidden p-4/);
  assert.match(visual, /bg-\[linear-gradient\(140deg,var\(--paper-hi\),var\(--paper-lo\)\)\]/);
  assert.doesNotMatch(visual, /251,252,249/);
  assert.match(css, /\.studio-panel:has\(> \.paper-tape\)::after/);
  assert.match(css, /\.surface:has\(\.studio-panel\)::after/);
  assert.match(css, /\.surface:has\(\.paper-rail > \.paper-tape\)::after/);
  assert.match(css, /\.surface \.visual-panel > \.paper-tape,[\s\S]*\.studio-panel \.visual-panel > \.paper-tape/);
  assert.doesNotMatch(drill, /<div className="grid overflow-hidden rounded-none border/);
  assert.doesNotMatch(drill, /<article className="overflow-hidden rounded-none border/);
  assert.match(selfStudy, /className="studio-panel paper-rail relative grid gap-3 p-5"/);
});

test("paper progress tracks adapt to the active theme", () => {
  for (const file of ["src/app/path/page.tsx", "src/app/native/page.tsx", "src/components/learning/ability-bars.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /bg-\[var\(--track\)\]/, `${file} should use the theme-aware track color`);
    assert.doesNotMatch(source, /bg-\[rgba\(24,28,27,/);
  }
});

test("paper status washes keep the active theme palette", () => {
  const storagePanel = readFileSync("src/components/layout/learning-data-panel.tsx", "utf8");
  const selfStudy = readFileSync("src/app/self-study/page.tsx", "utf8");
  const drill = readFileSync("src/components/learning/drill-runner.tsx", "utf8");
  assert.match(storagePanel, /border-\[color-mix\(in_srgb,var\(--brass\)_42%,var\(--line\)\)\] bg-\[color-mix\(in_srgb,var\(--brass\)_12%,transparent\)\]/);
  assert.doesNotMatch(storagePanel, /rgba\(197,148,77/);
  assert.match(selfStudy, /focus-within:ring-\[color-mix\(in_srgb,var\(--ocean\)_22%,transparent\)\]/);
  assert.doesNotMatch(selfStudy, /rgba\(23,63,115/);
  assert.match(drill, /bg-\[var\(--wash-1\)\]/);
  assert.doesNotMatch(drill, /bg-\[rgba\(24,28,27,/);
});

test("shadowing save is blocked while recording and does not delete the previous blob without a replacement id", () => {
  const source = readFileSync("src/app/learn/[lessonId]/lesson-client.tsx", "utf8");
  const panel = source.slice(source.indexOf("function LessonTaskEvidencePanel"), source.indexOf("function CapstoneEvidencePanel"));
  assert.match(panel, /if \(recording \|\| startingRecording \|\| savingRecording\) \{/);
  assert.match(panel, /if \(ok && expectedRecordingId && recordingId && expectedRecordingId !== recordingId\)/);
  assert.match(panel, /disabled=\{!check\.ready \|\| recording \|\| startingRecording \|\| savingRecording\}/);
});

test("lesson pages remount lesson-scoped client state when the lesson ID changes", async () => {
  const lessons = new Map([
    ["lesson-a", { id: "lesson-a" }],
    ["lesson-b", { id: "lesson-b" }]
  ]);
  const { default: LessonPage } = loadComponent("src/app/learn/[lessonId]/page.tsx", {
    "next/navigation": { notFound() { throw new Error("not found"); } },
    "@/data/curriculum": { getLessonById: (id) => lessons.get(id), lessons: [...lessons.values()] },
    "./lesson-client": { LessonClient: "LessonClient" }
  });

  const first = await LessonPage({ params: Promise.resolve({ lessonId: "lesson-a" }) });
  const second = await LessonPage({ params: Promise.resolve({ lessonId: "lesson-b" }) });
  assert.equal(first.key, "lesson-a");
  assert.equal(second.key, "lesson-b");
});

test("DrillRunner ignores speech events from outside its current audio question", () => {
  const hooks = createHookHarness();
  const listeners = new Map();
  const speechCalls = [];
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? new Set();
      entries.add(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    }
  };
  const { DrillRunner } = loadComponent("src/components/learning/drill-runner.tsx", {
    react: hooks.react,
    "lucide-react": { CircleSlash2: "SkipIcon", Volume2: "VolumeIcon" },
    "@/components/assets/visual-panel": { VisualPanel: "VisualPanel" },
    "@/components/ui/button": { Button: "Button" },
    "@/components/korean/korean-input": { KoreanInput: "KoreanInput" },
    "@/components/korean/speech-status": { useKoreanVoiceStatus: () => ({ status: "ready" }) },
    "@/lib/learning/evidence": { hasKoreanText: () => true },
    "@/lib/learning/ids": { mistakeCardId: (id) => `mistake:${id}` },
    "@/lib/learning/quiz": { checkAnswer: () => true },
    "@/lib/learning/srs": { recordMistake: () => ({}) },
    "@/lib/speech": {
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [{ id: "dictation-1", type: "dictation", prompt: "听写", answer: "안녕", speak: "안녕" }],
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  assert.equal(speechCalls.length, 1);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);
  assert.equal(listeners.has("kirina:speech"), false);

  window.dispatchEvent({ type: "kirina:speech", detail: { type: "playback-start", text: "다른 문장" } });
  tree = hooks.render(DrillRunner, props);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);

  speechCalls[0].options.onstart();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));
});

function loadLessonEvidencePanels(hooks, {
  MediaRecorder,
  getUserMedia,
  window = { setInterval() { return 1; }, clearInterval() {} },
  recordingOverrides = {}
}) {
  const pendingRecording = new Promise(() => {});
  const icons = Object.fromEntries([
    "ArrowLeft", "ArrowRight", "CheckCircle2", "LockKeyhole", "Mic", "Radio", "RefreshCcw", "Route", "Square", "Volume2"
  ].map((name) => [name, `${name}Icon`]));
  const imports = {
    react: hooks.react,
    "next/link": { default: "Link" },
    "lucide-react": icons,
    "@/components/assets/visual-panel": { VisualPanel: "VisualPanel" },
    "@/components/learning/drill-runner": { DrillRunner: "DrillRunner" },
    "@/components/korean/romanization-text": { RomanizationText: "RomanizationText" },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/section": { SectionHeading: "SectionHeading", Surface: "Surface" },
    "@/components/ui/track-row": { TrackRow: "TrackRow" },
    "@/data/curriculum": {
      getLessonPrerequisites: () => [],
      getNextLesson: () => null,
      isLessonMastered: () => false,
      isLessonUnlocked: () => true,
      normalizeTeachEntry: (value) => value,
      UNLOCK_SCORE: 80
    },
    "@/lib/learning/capstone": {
      CAPSTONE_LESSON_ID: "l30-native-capstone",
      CAPSTONE_MIN_HANGUL: 120,
      CAPSTONE_MIN_RECORDED_SECONDS: 120,
      capstoneRecordingCheck: () => ({ passed: false }),
      capstoneRubric: [],
      capstoneSystemChecks: () => [],
      countHangulCharacters: () => 0,
      isValidCapstoneEvidence: () => false
    },
    "@/lib/learning/lesson-bridge": { buildLessonBridge: () => ({}) },
    "@/lib/learning/lesson-assessment": { assessLessonAttempt: () => ({}) },
    "@/lib/learning/lesson-evidence": {
      checkLessonTaskEvidence: () => ({ ready: false, checks: [] }),
      lessonCompletionTask: () => null
    },
    "@/lib/learning/lesson-session": {
      clearLessonPracticeSession: () => true,
      getLessonPracticeSession: () => null,
      saveLessonPracticeSession: () => true
    },
    "@/lib/learning/quiz": { lessonQuestions: () => [] },
    "@/lib/learning/recordings": {
      deleteLearningRecording: async () => true,
      loadLearningRecording: () => pendingRecording,
      saveLearningRecording: async () => null,
      ...recordingOverrides
    },
    "@/lib/learning/path-gates": { getLibraryGateForLesson: () => ({ ok: true, missing: [] }) },
    "@/lib/learning/workspace": {
      ABILITY_LABELS: {},
      libraryCountsFromProgress: () => ({ hangul: 0, vocab: 0, grammar: 0, materials: 0, native: 0 }),
      useLearningWorkspace: () => ({ workspace: { progress: { completedLessons: [], lessonScores: {}, lessonTaskEvidence: {}, capstoneEvidence: {} }, evidence: { validMaterialIds: [] }, nextLesson: null } })
    },
    "@/lib/speech": { speakKorean() {} }
  };
  return loadComponent("src/app/learn/[lessonId]/lesson-client.tsx", imports, {
    Blob,
    MediaRecorder,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    navigator: { mediaDevices: { getUserMedia } },
    performance: { now: () => 1000 },
    queueMicrotask,
    window
  }, (source) => source
    .replace("function LessonTaskEvidencePanel", "export function LessonTaskEvidencePanel")
    .replace("function CapstoneEvidencePanel", "export function CapstoneEvidencePanel"));
}

function createShadowingPanelProps(overrides = {}) {
  return {
    lessonId: "l22-media-shadowing",
    task: { kind: "shadowing", title: "Shadowing", prompt: "Repeat the source", source: "안녕하세요" },
    evidence: undefined,
    onSave: () => true,
    onInvalidateRecording: () => true,
    ...overrides
  };
}

function createCapstonePanelProps(overrides = {}) {
  return {
    evidence: null,
    onSave: () => true,
    onInvalidateRecording: () => true,
    ...overrides
  };
}

function createActiveMediaHarness() {
  const tracks = [];
  const streams = [];
  const recorders = [];

  class ActiveMediaRecorder {
    constructor(stream) {
      this.stream = stream;
      this.state = "inactive";
      this.mimeType = "audio/webm";
      this.ondataavailable = null;
      this.onstop = null;
      this.stops = 0;
      recorders.push(this);
    }

    start() {
      this.state = "recording";
    }

    stop() {
      this.stops += 1;
      this.state = "inactive";
      this.onstop?.();
    }
  }

  return {
    MediaRecorder: ActiveMediaRecorder,
    getUserMedia: async () => {
      const track = { stops: 0, stop() { this.stops += 1; } };
      const stream = { getTracks: () => [track] };
      tracks.push(track);
      streams.push(stream);
      return stream;
    },
    recorders,
    streams,
    tracks
  };
}

function findButton(tree, label) {
  const button = findElement(tree, (node) => node.type === "Button" && textContent(node).includes(label));
  assert.ok(button, `Expected button containing ${label}`);
  return button;
}

function loadComponent(file, imports, globals = {}, transformSource = (source) => source) {
  const source = transformSource(readFileSync(file, "utf8"));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const moduleRecord = { exports: {} };
  const context = {
    module: moduleRecord,
    exports: moduleRecord.exports,
    require(id) {
      if (id === "react/jsx-runtime") return JSX_RUNTIME;
      if (id in imports) return imports[id];
      throw new Error(`Unexpected component import: ${id}`);
    },
    ...globals
  };
  vm.runInNewContext(compiled, context, { filename: file });
  return moduleRecord.exports;
}

function createHookHarness() {
  const slots = [];
  let cursor = 0;
  let pendingEffects = [];

  const scheduleEffect = (effect, dependencies) => {
    const index = cursor;
    cursor += 1;
    const previous = slots[index];
    if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
      pendingEffects.push({ index, effect, dependencies });
    }
  };

  const react = {
    useState(initialValue) {
      const index = cursor;
      cursor += 1;
      if (!slots[index]) slots[index] = { value: typeof initialValue === "function" ? initialValue() : initialValue };
      const setValue = (nextValue) => {
        slots[index].value = typeof nextValue === "function" ? nextValue(slots[index].value) : nextValue;
      };
      return [slots[index].value, setValue];
    },
    useRef(initialValue) {
      const index = cursor;
      cursor += 1;
      if (!slots[index]) slots[index] = { current: initialValue };
      return slots[index];
    },
    useMemo(factory, dependencies) {
      const index = cursor;
      cursor += 1;
      const previous = slots[index];
      if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
        slots[index] = { value: factory(), dependencies };
      }
      return slots[index].value;
    },
    useEffect: scheduleEffect,
    useLayoutEffect: scheduleEffect,
    useSyncExternalStore(_subscribe, getSnapshot) {
      cursor += 1;
      return getSnapshot();
    }
  };

  return {
    react,
    render(component, props) {
      cursor = 0;
      pendingEffects = [];
      const tree = component(props);
      for (const pending of pendingEffects) {
        slots[pending.index]?.cleanup?.();
        slots[pending.index] = {
          dependencies: pending.dependencies,
          cleanup: pending.effect() || undefined
        };
      }
      return tree;
    },
    refs() {
      return slots
        .filter((slot) => slot && Object.prototype.hasOwnProperty.call(slot, "current"))
        .map((slot) => slot.current);
    }
  };
}

function sameDependencies(previous, next) {
  return Array.isArray(previous) && Array.isArray(next)
    && previous.length === next.length
    && previous.every((value, index) => Object.is(value, next[index]));
}

function createElement(type, props, key) {
  return { type, key, props: props ?? {} };
}

function findElement(node, predicate) {
  return findElements(node, predicate)[0] ?? null;
}

function findElements(node, predicate, matches = []) {
  if (node == null || typeof node === "boolean") return matches;
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, predicate, matches);
    return matches;
  }
  if (typeof node !== "object") return matches;
  if (predicate(node)) matches.push(node);
  findElements(node.props?.children, predicate, matches);
  return matches;
}

function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (typeof node !== "object") return String(node);
  return textContent(node.props?.children);
}

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function createJamoMock() {
  return {
    backspaceJamo: (value) => value.slice(0, -1),
    composeJamoInput: (value, jamo) => value + jamo,
    QWERTY_TO_JAMO: { r: "R" }
  };
}

function createMediaWindow() {
  return {
    matchMedia() {
      return { matches: false, addEventListener() {}, removeEventListener() {} };
    }
  };
}

function createKeyEvent(key, { isComposing = false, keyCode = 0 } = {}) {
  return {
    key,
    nativeEvent: { isComposing, keyCode },
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    }
  };
}

function createInputControl(value, document) {
  return {
    value,
    selectionStart: value.length,
    selectionEnd: value.length,
    lastSelection: [value.length, value.length],
    focusCalls: 0,
    focus() {
      this.focusCalls += 1;
      document.activeElement = this;
    },
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
      this.lastSelection = [start, end];
    }
  };
}

function saveSelection(input, control, document, start, end) {
  document.activeElement = control;
  control.selectionStart = start;
  control.selectionEnd = end;
  input.props.onSelect({ currentTarget: control });
  input.props.onBlur({ currentTarget: control });
  document.activeElement = null;
}

function commitControlledValue(hooks, component, makeProps, control) {
  control.value = makeProps().value;
  return hooks.render(component, makeProps());
}
