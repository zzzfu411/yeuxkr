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
  const { AppShellContent: AppShell } = loadComponent("src/components/layout/app-shell.tsx", {
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
    ,"@/lib/learning/use-learning-workspace": { LearningWorkspaceProvider: "LearningWorkspaceProvider" }
  }, { window }, source => source.replace("function AppShellContent", "export function AppShellContent"));

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

test("LessonResultActions latches the first save click until success or error retry", () => {
  const hooks = createHookHarness();
  const { LessonResultActions } = loadLessonEvidencePanels(hooks, {});
  let saves = 0;
  const props = createLessonResultActionsProps({
    onSave() {
      saves += 1;
      return true;
    }
  });

  let tree = hooks.render(LessonResultActions, props);
  const continueButton = findButton(tree, "继续");
  continueButton.props.onClick();
  continueButton.props.onClick();
  assert.equal(saves, 1);

  tree = hooks.render(LessonResultActions, props);
  assert.equal(findButton(tree, "继续").props.disabled, true);

  const previewHooks = createHookHarness();
  const previewPanels = loadLessonEvidencePanels(previewHooks, {});
  let previewSaves = 0;
  let previewTree = previewHooks.render(previewPanels.LessonResultActions, createLessonResultActionsProps({
    score: 80,
    assessment: {
      overallPassed: true,
      productionRequired: true,
      productionPassed: false,
      productionCorrect: 0,
      productionTotal: 1,
      listeningRequired: false,
      listeningPassed: true,
      listeningDeferred: false,
      listeningSkipped: false,
      listeningCorrect: 0,
      listeningTotal: 0,
      corePassed: false
    },
    onSave() {
      previewSaves += 1;
      return true;
    }
  }));
  const previewButton = findButton(previewTree, "保存本次结果");
  previewButton.props.onClick();
  previewButton.props.onClick();
  assert.equal(previewSaves, 1);

  const errorHooks = createHookHarness();
  const errorPanels = loadLessonEvidencePanels(errorHooks, {});
  let retries = 0;
  let errorTree = errorHooks.render(errorPanels.LessonResultActions, createLessonResultActionsProps({
    saveError: true,
    onSave() {
      retries += 1;
      return false;
    }
  }));
  const retryButton = findButton(errorTree, "重新保存");
  retryButton.props.onClick();
  assert.equal(retries, 1);
  errorTree = errorHooks.render(errorPanels.LessonResultActions, createLessonResultActionsProps({
    saveError: true,
    onSave() {
      retries += 1;
      return true;
    }
  }));
  findButton(errorTree, "重新保存").props.onClick();
  findButton(errorTree, "重新保存").props.onClick();
  assert.equal(retries, 2);
});

test("recording controls stay locked until the asynchronous blob write finishes", async (context) => {
  const source = readFileSync("src/components/learning/lesson-evidence-panels.tsx", "utf8");
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

test("missing recording entities clear optimistic save baselines", async (context) => {
  await context.test("shadowing fallback", async () => {
    const hooks = createHookHarness();
    const expectedRecordingIds = [];
    let invalidatedRecordingId = "";
    const { LessonTaskEvidencePanel } = loadLessonEvidencePanels(hooks, {
      lessonEvidenceOverrides: { checkLessonTaskEvidence: () => ({ ready: true, checks: [] }) },
      recordingOverrides: { loadLearningRecording: async () => null }
    });
    const persisted = {
      kind: "shadowing",
      text: "저는 기억한 문장을 다시 말합니다.",
      recordedSeconds: 4.2,
      recordingId: "shadowing:missing",
      updatedAt: "2026-09-02T00:00:00.000Z"
    };
    const props = createShadowingPanelProps({
      evidence: persisted,
      onInvalidateRecording: (_lessonId, recordingId) => {
        invalidatedRecordingId = recordingId;
        return true;
      },
      onSave: (_lessonId, _input, expectedRecordingId) => {
        expectedRecordingIds.push(expectedRecordingId);
        return true;
      }
    });

    hooks.render(LessonTaskEvidencePanel, props);
    await new Promise((resolve) => setImmediate(resolve));
    const clearedProps = { ...props, evidence: undefined };
    const tree = hooks.render(LessonTaskEvidencePanel, clearedProps);
    findButton(tree, "保存作品").props.onClick();

    assert.equal(invalidatedRecordingId, persisted.recordingId);
    assert.deepEqual(expectedRecordingIds, [""]);
  });

  await context.test("capstone replacement", async () => {
    const hooks = createHookHarness();
    const expectedRecordingIds = [];
    let invalidatedRecordingId = "";
    const { CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
      capstoneOverrides: {
        capstoneRecordingCheck: () => ({ passed: true }),
        isValidCapstoneEvidence: () => true
      },
      recordingOverrides: { loadLearningRecording: async () => null }
    });
    const persisted = {
      transcript: "제 생각은 이렇습니다.",
      weakPoint: "연결어를 더 자연스럽게 쓰기",
      targetRewrite: "그래서 다음에는 더 구체적으로 말하겠습니다.",
      rubric: [],
      recordedSeconds: 120,
      recordingId: "capstone:missing",
      updatedAt: "2026-09-02T00:00:00.000Z"
    };
    const props = createCapstonePanelProps({
      evidence: persisted,
      onInvalidateRecording: (recordingId) => {
        invalidatedRecordingId = recordingId;
        return true;
      },
      onSave: (_input, expectedRecordingId) => {
        expectedRecordingIds.push(expectedRecordingId);
        return true;
      }
    });

    hooks.render(CapstoneEvidencePanel, props);
    await new Promise((resolve) => setImmediate(resolve));
    const clearedProps = { ...props, evidence: null };
    const tree = hooks.render(CapstoneEvidencePanel, clearedProps);
    findButton(tree, "保存终课作品").props.onClick();

    assert.equal(invalidatedRecordingId, persisted.recordingId);
    assert.deepEqual(expectedRecordingIds, [""]);
  });
});

test("recording replacements can save after persisted evidence is removed", async (context) => {
  for (const panel of ["shadowing", "capstone"]) {
    await context.test(panel, async () => {
      const hooks = createHookHarness();
      const media = createActiveMediaHarness();
      const expectedRecordingIds = [];
      const overrides = panel === "shadowing"
        ? {
            lessonEvidenceOverrides: { checkLessonTaskEvidence: () => ({ ready: true, checks: [] }) }
          }
        : {
            capstoneOverrides: {
              capstoneRecordingCheck: () => ({ passed: true }),
              isValidCapstoneEvidence: () => true
            }
          };
      const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
        ...overrides,
        MediaRecorder: media.MediaRecorder,
        getUserMedia: media.getUserMedia,
        recordingOverrides: {
          saveLearningRecording: async (_blob, kind) => `${kind}:replacement`
        }
      });
      const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
      const persisted = panel === "shadowing"
        ? {
            kind: "shadowing",
            text: "",
            recordedSeconds: 4.2,
            recordingId: "shadowing:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          }
        : {
            transcript: "旧稿",
            weakPoint: "旧弱点",
            targetRewrite: "오래된 목표 문장",
            rubric: [],
            recordedSeconds: 120,
            recordingId: "capstone:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          };
      const props = panel === "shadowing"
        ? createShadowingPanelProps({
            evidence: persisted,
            onSave: (_lessonId, _input, expectedRecordingId) => {
              expectedRecordingIds.push(expectedRecordingId);
              return true;
            }
          })
        : createCapstonePanelProps({
            evidence: persisted,
            onSave: (_input, expectedRecordingId) => {
              expectedRecordingIds.push(expectedRecordingId);
              return true;
            }
      });

      let tree = hooks.render(Component, props);
      await findButton(tree, panel === "shadowing" ? "开始录音" : "重新录音").props.onClick();
      media.recorders[0].ondataavailable({ data: new Blob(["replacement"]) });
      tree = hooks.render(Component, props);
      findButton(tree, panel === "shadowing" ? "停止" : "停止录音").props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
      tree = hooks.render(Component, props);

      const clearedProps = { ...props, evidence: panel === "shadowing" ? undefined : null };
      tree = hooks.render(Component, clearedProps);
      findButton(tree, panel === "shadowing" ? "保存作品" : "保存终课作品").props.onClick();

      assert.deepEqual(expectedRecordingIds, [""]);
    });
  }
});

test("delayed persisted recording lookups cannot invalidate an active replacement", async (context) => {
  for (const panel of ["shadowing", "capstone"]) {
    await context.test(panel, async () => {
      const hooks = createHookHarness();
      const media = createActiveMediaHarness();
      let resolveLoad;
      const pendingLoad = new Promise((resolve) => {
        resolveLoad = resolve;
      });
      let invalidations = 0;
      const overrides = panel === "shadowing"
        ? { lessonEvidenceOverrides: { checkLessonTaskEvidence: () => ({ ready: true, checks: [] }) } }
        : { capstoneOverrides: { capstoneRecordingCheck: () => ({ passed: true }), isValidCapstoneEvidence: () => true } };
      const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
        ...overrides,
        MediaRecorder: media.MediaRecorder,
        getUserMedia: media.getUserMedia,
        recordingOverrides: { loadLearningRecording: () => pendingLoad }
      });
      const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
      const persisted = panel === "shadowing"
        ? {
            kind: "shadowing",
            text: "",
            recordedSeconds: 4.2,
            recordingId: "shadowing:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          }
        : {
            transcript: "旧稿",
            weakPoint: "旧弱点",
            targetRewrite: "오래된 목표 문장",
            rubric: [],
            recordedSeconds: 120,
            recordingId: "capstone:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          };
      const props = panel === "shadowing"
        ? createShadowingPanelProps({
            evidence: persisted,
            onInvalidateRecording: () => {
              invalidations += 1;
              return true;
            }
          })
        : createCapstonePanelProps({
            evidence: persisted,
            onInvalidateRecording: () => {
              invalidations += 1;
              return true;
            }
          });

      let tree = hooks.render(Component, props);
      await findButton(tree, panel === "shadowing" ? "开始录音" : "重新录音").props.onClick();
      resolveLoad(null);
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(invalidations, 0, "the superseded lookup must not revoke persisted evidence");
      tree = hooks.render(Component, props);
      assert.ok(findButton(tree, panel === "shadowing" ? "停止" : "停止录音"));
    });
  }
});

test("persisted recording lookups still hydrate after a denied microphone request", async (context) => {
  for (const panel of ["shadowing", "capstone"]) {
    await context.test(panel, async () => {
      const hooks = createHookHarness();
      const media = createActiveMediaHarness();
      let resolveLoad;
      let loadCalls = 0;
      const pendingLoad = new Promise((resolve) => {
        resolveLoad = resolve;
      });
      const overrides = panel === "shadowing"
        ? { lessonEvidenceOverrides: { checkLessonTaskEvidence: () => ({ ready: true, checks: [] }) } }
        : { capstoneOverrides: { capstoneRecordingCheck: () => ({ passed: true }), isValidCapstoneEvidence: () => true } };
      const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
        ...overrides,
        MediaRecorder: media.MediaRecorder,
        getUserMedia: async () => {
          throw new Error("permission denied");
        },
        recordingOverrides: {
          loadLearningRecording: () => {
            loadCalls += 1;
            return loadCalls === 1 ? pendingLoad : Promise.resolve(new Blob(["persisted"]));
          }
        }
      });
      const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
      const persisted = panel === "shadowing"
        ? {
            kind: "shadowing",
            text: "",
            recordedSeconds: 4.2,
            recordingId: "shadowing:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          }
        : {
            transcript: "旧稿",
            weakPoint: "旧弱点",
            targetRewrite: "오래된 목표 문장",
            rubric: [],
            recordedSeconds: 120,
            recordingId: "capstone:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          };
      const savedInputs = [];
      const props = panel === "shadowing"
        ? createShadowingPanelProps({
            evidence: persisted,
            onSave: (_lessonId, input) => {
              savedInputs.push(input);
              return true;
            }
          })
        : createCapstonePanelProps({
            evidence: persisted,
            onSave: (input) => {
              savedInputs.push(input);
              return true;
            }
          });

      let tree = hooks.render(Component, props);
      await findButton(tree, panel === "shadowing" ? "开始录音" : "重新录音").props.onClick();
      resolveLoad(new Blob(["persisted"]));
      await new Promise((resolve) => setImmediate(resolve));
      tree = hooks.render(Component, props);
      await new Promise((resolve) => setImmediate(resolve));
      tree = hooks.render(Component, props);

      assert.ok(loadCalls >= 2, "a failed replacement should retry the persisted lookup");
      assert.ok(findElement(tree, (node) => node.type === "audio"), "a denied replacement must not hide persisted playback");
      const saveButton = findButton(tree, panel === "shadowing" ? "保存作品" : "保存终课作品");
      assert.equal(saveButton.props.disabled, false, "a denied replacement must keep the prior draft saveable");
      saveButton.props.onClick();
      assert.equal(savedInputs.length, 1);
      assert.equal(savedInputs[0].recordingId, persisted.recordingId);
      assert.equal(savedInputs[0].recordedSeconds, persisted.recordedSeconds);
    });
  }
});

test("failed recording replacements restore the prior draft and playback", async (context) => {
  for (const panel of ["shadowing", "capstone"]) {
    for (const failure of ["empty", "save"]) {
      await context.test(`${panel} ${failure}`, async () => {
        const hooks = createHookHarness();
        const media = createActiveMediaHarness();
        const savedInputs = [];
        const overrides = panel === "shadowing"
          ? { lessonEvidenceOverrides: { checkLessonTaskEvidence: () => ({ ready: true, checks: [] }) } }
          : { capstoneOverrides: { capstoneRecordingCheck: () => ({ passed: true }), isValidCapstoneEvidence: () => true } };
        const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
          ...overrides,
          MediaRecorder: media.MediaRecorder,
          getUserMedia: media.getUserMedia,
          recordingOverrides: {
            loadLearningRecording: async () => new Blob(["persisted"]),
            saveLearningRecording: async () => failure === "save" ? null : "unused"
          }
        });
        const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
        const persisted = panel === "shadowing"
          ? {
              kind: "shadowing",
              text: "",
              recordedSeconds: 4.2,
              recordingId: "shadowing:original",
              updatedAt: "2026-09-02T00:00:00.000Z"
            }
          : {
              transcript: "旧稿",
              weakPoint: "旧弱点",
              targetRewrite: "오래된 목표 문장",
              rubric: [],
              recordedSeconds: 120,
              recordingId: "capstone:original",
              updatedAt: "2026-09-02T00:00:00.000Z"
            };
        const props = panel === "shadowing"
          ? createShadowingPanelProps({
              evidence: persisted,
              onSave: (_lessonId, input) => {
                savedInputs.push(input);
                return true;
              }
            })
          : createCapstonePanelProps({
              evidence: persisted,
              onSave: (input) => {
                savedInputs.push(input);
                return true;
              }
            });

        let tree = hooks.render(Component, props);
        await new Promise((resolve) => setImmediate(resolve));
        tree = hooks.render(Component, props);
        await findButton(tree, panel === "shadowing" ? "开始录音" : "重新录音").props.onClick();
        if (failure === "save") media.recorders[0].ondataavailable({ data: new Blob(["replacement"]) });
        tree = hooks.render(Component, props);
        findButton(tree, panel === "shadowing" ? "停止" : "停止录音").props.onClick();
        await new Promise((resolve) => setImmediate(resolve));
        tree = hooks.render(Component, props);
        await new Promise((resolve) => setImmediate(resolve));
        tree = hooks.render(Component, props);

        assert.ok(findElement(tree, (node) => node.type === "audio"), "the prior playback should remain available");
        assert.match(textContent(tree), panel === "shadowing" ? /已录 4\.2 秒/ : /有效录音 120\.0 秒/);
        const saveButton = findButton(tree, panel === "shadowing" ? "保存作品" : "保存终课作品");
        assert.equal(saveButton.props.disabled, false, "a failed replacement must leave the prior draft saveable");
        saveButton.props.onClick();
        assert.equal(savedInputs.length, 1);
        assert.equal(savedInputs[0].recordingId, persisted.recordingId);
        assert.equal(savedInputs[0].recordedSeconds, persisted.recordedSeconds);
      });
    }
  }
});

test("deferred missing recording lookups are processed after a failed replacement", async (context) => {
  for (const panel of ["shadowing", "capstone"]) {
    await context.test(panel, async () => {
      const hooks = createHookHarness();
      const media = createActiveMediaHarness();
      let resolveLoad;
      let loadCalls = 0;
      const pendingLoad = new Promise((resolve) => {
        resolveLoad = resolve;
      });
      let invalidations = 0;
      const overrides = panel === "shadowing"
        ? { lessonEvidenceOverrides: { checkLessonTaskEvidence: () => ({ ready: true, checks: [] }) } }
        : { capstoneOverrides: { capstoneRecordingCheck: () => ({ passed: true }), isValidCapstoneEvidence: () => true } };
      const { LessonTaskEvidencePanel, CapstoneEvidencePanel } = loadLessonEvidencePanels(hooks, {
        ...overrides,
        MediaRecorder: media.MediaRecorder,
        getUserMedia: async () => {
          throw new Error("permission denied");
        },
        recordingOverrides: {
          loadLearningRecording: () => {
            loadCalls += 1;
            return loadCalls === 1 ? pendingLoad : Promise.resolve(null);
          }
        }
      });
      const Component = panel === "shadowing" ? LessonTaskEvidencePanel : CapstoneEvidencePanel;
      const persisted = panel === "shadowing"
        ? {
            kind: "shadowing",
            text: "",
            recordedSeconds: 4.2,
            recordingId: "shadowing:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          }
        : {
            transcript: "旧稿",
            weakPoint: "旧弱点",
            targetRewrite: "오래된 목표 문장",
            rubric: [],
            recordedSeconds: 120,
            recordingId: "capstone:original",
            updatedAt: "2026-09-02T00:00:00.000Z"
          };
      const props = panel === "shadowing"
        ? createShadowingPanelProps({
            evidence: persisted,
            onInvalidateRecording: () => {
              invalidations += 1;
              return true;
            }
          })
        : createCapstonePanelProps({
            evidence: persisted,
            onInvalidateRecording: () => {
              invalidations += 1;
              return true;
            }
          });

      let tree = hooks.render(Component, props);
      await findButton(tree, panel === "shadowing" ? "开始录音" : "重新录音").props.onClick();
      resolveLoad(null);
      await new Promise((resolve) => setImmediate(resolve));
      tree = hooks.render(Component, props);
      await new Promise((resolve) => setImmediate(resolve));
      tree = hooks.render(Component, props);

      assert.ok(loadCalls >= 2, "the failed replacement should retry the persisted lookup");
      assert.equal(invalidations, 1, "the retry should revoke the missing persisted recording");
      assert.ok(findButton(tree, "保存"));
    });
  }
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
  assert.match(textContent(addon), /学习记录和复习卡没有保存/);
  assert.doesNotMatch(textContent(addon), /小测已通过，正在保存/);
  assert.equal(saveAttempts, 1);

  saveSucceeds = true;
  findButton(addon, "重试保存").props.onClick();
  tree = hooks.render(MasteryGate, props);
  runner = findElement(tree, (node) => node.type === "DrillRunner");
  addon = runner.props.resultAddon({ score: 100, answers: [] });
  assert.match(textContent(addon), /学习记录和复习卡已保存/);
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
    },
    "@/lib/learning/use-learning-workspace": {
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
  assert.equal(runner.props.onAnswer({ question: { id: "q1" }, correct: true }), false);

  cards = findElements(tree, (node) => node.props?.item?.id === "q1" || node.props?.item?.id === "q2");
  cards[1].props.onRetrain("q2");
  tree = hooks.render(MistakesPage, {});
  runner = findElement(tree, (node) => node.type === "DrillRunner");
  assert.equal(runner.key, 2);
  assert.equal(runner.props.questions[0].id, "q2");
});

test("onboarding unlocks only after playback and recovers from a failed sample", () => {
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
    "@/lib/learning/use-learning-workspace": { useLearningWorkspace: () => ({ saveProfile: () => true }) },
    "@/lib/speech": {
      speakKorean(_text, options) {
        playbackOptions = options;
        return true;
      },
      stopSpeech() {}
    }
  }, { window: { setTimeout, clearTimeout } });

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

  const firstPlayback = playbackOptions;
  playbackOptions.onerror({ error: "media-playback-failed" });
  tree = hooks.render(OnboardingFlow, {});
  assert.equal(findButton(tree, "暂时没声音，先去打字").props.disabled, false);
  findButton(tree, "试听").props.onClick();
  tree = hooks.render(OnboardingFlow, {});
  firstPlayback.onstart();
  tree = hooks.render(OnboardingFlow, {});
  assert.equal(findButton(tree, "先点试听").props.disabled, true, "an earlier request cannot complete a retry");
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
  assert.match(source, /gradeReviewCardAndProgress\(card, entry\.correct, \{ allowEarly: true, skipped: Boolean\(entry\.skipped\) \}\)/);
});

test("all-due mistake retrain requests every selected card", () => {
  const source = readFileSync("src/app/mistakes/page.tsx", "utf8");
  assert.match(source, /buildRetrainQuestions\(srsState, ids, ids\?\.length \?\? 8\)/);
});

test("audio skip goes through onAnswer so review and retrain can reschedule", () => {
  const source = readFileSync("src/components/learning/drill-runner.tsx", "utf8");
  assert.match(source, /const entry = \{ question, answer: "", correct: false, skipped: true \};\s*if \(onAnswer\?\.\(entry\) === false\) return;/);
});

test("review and retrain refuse answers when the queued card disappears", () => {
  const review = readFileSync("src/app/review/page.tsx", "utf8");
  const mistakes = readFileSync("src/app/mistakes/page.tsx", "utf8");
  assert.match(review, /card \? submitReviewCardAndProgress\(card, entry\.correct, \{ skipped: Boolean\(entry\.skipped\) \}\)/);
  assert.match(review, /result\.reason === "storage"/);
  assert.match(mistakes, /if \(!card \|\| !gradeReviewCardAndProgress\(card, entry\.correct, \{ allowEarly: true, skipped: Boolean\(entry\.skipped\) \}\)\)/);
});

test("cinematic scene frames clip media and keep film texture inside the image", () => {
  const visual = readFileSync("src/components/assets/visual-panel.tsx", "utf8");
  const section = readFileSync("src/components/ui/section.tsx", "utf8");
  const selfStudy = readFileSync("src/app/self-study/page.tsx", "utf8");
  const drill = readFileSync("src/components/learning/drill-runner.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(visual, /className=\{\s*cn\("visual-panel relative isolate min-h-56"/);
  assert.match(visual, /<div className="absolute inset-0 overflow-hidden">/);
  assert.match(visual, /<div className="film-grain pointer-events-none absolute inset-0"/);
  assert.doesNotMatch(visual, /paper-tape/);
  assert.match(section, /"surface relative p-4 md:p-5"/);
  assert.match(section, /className="module-hero studio-panel"/);
  assert.doesNotMatch(section, /surface relative overflow-hidden p-4/);
  assert.match(visual, /bg-\[linear-gradient\(140deg,var\(--paper-hi\),var\(--paper-lo\)\)\]/);
  assert.doesNotMatch(visual, /251,252,249/);
  assert.match(css, /\.film-grain \{/);
  assert.match(css, /\.module-hero \{/);
  assert.match(css, /\.paper-tape \{ display: none !important; \}/);
  assert.match(css, /--hero-radius:/);
  assert.doesNotMatch(drill, /<div className="grid overflow-hidden rounded-none border/);
  assert.doesNotMatch(drill, /<article className="overflow-hidden rounded-none border/);
  assert.match(selfStudy, /className="studio-panel paper-rail relative grid gap-3 p-5"/);
});

test("progress tracks adapt to the active seasonal theme", () => {
  for (const file of ["src/app/path/page.tsx", "src/app/native/page.tsx", "src/components/learning/ability-bars.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /bg-\[var\(--track\)\]/, `${file} should use the theme-aware track color`);
    assert.doesNotMatch(source, /bg-\[rgba\(24,28,27,/);
  }
});

test("status washes keep the active seasonal theme palette", () => {
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
  const source = readFileSync("src/components/learning/lesson-evidence-panels.tsx", "utf8");
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
    ,"@/lib/site-metadata": { pageMetadata: () => ({}) }
  });

  const first = await LessonPage({ params: Promise.resolve({ lessonId: "lesson-a" }) });
  const second = await LessonPage({ params: Promise.resolve({ lessonId: "lesson-b" }) });
  assert.equal(first.key, "lesson-a");
  assert.equal(second.key, "lesson-b");
});

test("DrillRunner ignores speech events from outside its current audio question", async () => {
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
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
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);
  assert.equal(listeners.has("kirina:speech"), false);

  speechCalls[0].options.onerror({ error: "network-before-start" });
  tree = hooks.render(DrillRunner, props);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);
  assert.ok(findButton(tree, "跳过音频题"));

  window.dispatchEvent({ type: "kirina:speech", detail: { type: "playback-start", text: "다른 문장" } });
  tree = hooks.render(DrillRunner, props);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);

  speechCalls[0].options.onstart();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));

  speechCalls[0].options.onerror({ error: "network" });
  tree = hooks.render(DrillRunner, props);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);
  assert.ok(findButton(tree, "跳过音频题"));
});

test("DrillRunner treats autoplay NotAllowedError as a retryable gesture, not a missing voice", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [{
      id: "listen-1",
      type: "listen",
      prompt: "听选",
      answer: "안녕",
      choices: ["안녕", "학교"],
      speak: "안녕"
    }],
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  speechCalls[0].options.onerror({ error: "NotAllowedError", reason: "needs-gesture" });
  tree = hooks.render(DrillRunner, props);

  assert.equal(findElement(tree, (node) => node.type === "Button" && textContent(node).includes("跳过音频题")), null);
  assert.match(textContent(tree), /浏览器拦截了自动播放/);
  assert.ok(findElement(tree, (node) => node.type === "input" && node.props?.type === "radio"));
  assert.ok(findButton(tree, "听"));
});

test("DrillRunner treats TTS not-allowed after autoplay fallback as a retryable gesture", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [{
      id: "listen-tts-not-allowed",
      type: "listen",
      prompt: "听选",
      answer: "안녕",
      choices: ["안녕", "학교"],
      speak: "안녕"
    }],
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  speechCalls[0].options.onerror({ error: "not-allowed" });
  tree = hooks.render(DrillRunner, props);

  assert.equal(findElement(tree, (node) => node.type === "Button" && textContent(node).includes("跳过音频题")), null);
  assert.doesNotMatch(textContent(tree), /这次未能播放韩语音频/);
  assert.match(textContent(tree), /浏览器拦截了自动播放/);
  assert.ok(findElement(tree, (node) => node.type === "input" && node.props?.type === "radio"));
  assert.ok(findButton(tree, "听"));
});

test("skipping a review audio question defers the card so it is no longer due", async () => {
  const hooks = createHookHarness();
  const answered = [];
  const speechCalls = [];
  const now = Date.now();
  const dueCard = {
    id: "mistake:listen-review",
    box: 0,
    dueAt: now - 1000,
    correct: 0,
    wrong: 2,
    lastSeenAt: null,
    payload: {
      kind: "mistake",
      itemId: "listen-review",
      type: "listen",
      prompt: "听选",
      answer: "안녕",
      speak: "안녕"
    }
  };
  const cards = { [dueCard.id]: { ...dueCard } };
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });

  const gradeSkippedReview = (entry) => {
    answered.push(entry);
    const current = cards[entry.question.id];
    if (!current) return false;
    if (entry.skipped) {
      current.dueAt = now + 10 * 60 * 1000;
      current.lastSeenAt = now;
      return true;
    }
    current.correct += entry.correct ? 1 : 0;
    current.wrong += entry.correct ? 0 : 1;
    current.dueAt = now + 10 * 60 * 1000;
    return true;
  };

  const props = {
    questions: [{
      id: dueCard.id,
      type: "listen",
      prompt: "听选",
      answer: "안녕",
      choices: ["안녕", "학교"],
      speak: "안녕"
    }],
    finishLabel: "结束复习",
    recordMistakes: false,
    onAnswer: (entry) => {
      const card = cards[entry.question.id];
      if (!card) return false;
      return gradeSkippedReview(entry);
    }
  };

  let tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  speechCalls[0].options.onerror({ error: "network" });
  tree = hooks.render(DrillRunner, props);
  findButton(tree, "跳过音频题").props.onClick();
  tree = hooks.render(DrillRunner, props);

  assert.equal(answered.length, 1);
  assert.equal(answered[0].skipped, true);
  assert.equal(answered[0].correct, false);
  assert.equal(cards[dueCard.id].correct, 0);
  assert.equal(cards[dueCard.id].wrong, 2);
  assert.equal(cards[dueCard.id].dueAt > now, true);
  assert.match(textContent(tree), /已跳过/);
});

test("DrillRunner keeps a new audio question pending until its own playback resolves", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [
      { id: "dictation-1", type: "dictation", prompt: "听写一", answer: "안녕", speak: "안녕" },
      { id: "dictation-2", type: "dictation", prompt: "听写二", answer: "학교", speak: "학교" }
    ],
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  speechCalls[0].options.onstart();
  tree = hooks.render(DrillRunner, props);
  const input = findElement(tree, (node) => node.type === "KoreanInput");
  assert.ok(input);
  input.props.onChange("안녕");
  tree = hooks.render(DrillRunner, props);
  const filledInput = findElement(tree, (node) => node.type === "KoreanInput");
  assert.ok(filledInput);
  filledInput.props.onSubmit();
  tree = hooks.render(DrillRunner, props);
  findButton(tree, "下一题").props.onClick();
  tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 2);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);

  speechCalls[1].options.onstart();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));

  speechCalls[0].options.onstart();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));

  speechCalls[0].options.onerror({ error: "stale-q1" });
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));
  assert.equal(findElement(tree, (node) => node.type === "Button" && textContent(node).includes("跳过音频题")), null);

  speechCalls[1].options.onerror({ error: "q2-before-start" });
  tree = hooks.render(DrillRunner, props);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);
  assert.ok(findButton(tree, "跳过音频题"));
});

test("DrillRunner keeps audio alive when a parent recreates an equivalent question object", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  let stops = 0;
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {
        stops += 1;
      }
    }
  }, { queueMicrotask, window });
  const makeProps = () => ({
    questions: [{ id: "dictation-recreated", type: "dictation", prompt: "听写", answer: "안녕", speak: "안녕" }],
    finishLabel: "完成"
  });

  let tree = hooks.render(DrillRunner, makeProps());
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  tree = hooks.render(DrillRunner, makeProps());

  assert.equal(stops, 0);
  assert.equal(speechCalls.length, 1);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);

  speechCalls[0].options.onstart();
  tree = hooks.render(DrillRunner, makeProps());
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));
});

test("DrillRunner survives StrictMode audio effect replay and still stops on teardown", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  let stops = 0;
  let playing = false;
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        playing = true;
        return true;
      },
      stopSpeech() {
        stops += 1;
        playing = false;
      }
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [{ id: "dictation-strict", type: "dictation", prompt: "听写", answer: "안녕", speak: "안녕" }],
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  hooks.replayEffects();
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  assert.equal(playing, true);

  assert.equal(stops, 0);

  speechCalls[0].options.onstart();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"));

  hooks.unmount();
  await Promise.resolve();
  assert.equal(stops, 1);
  assert.equal(playing, false);
});

test("leaving a pending audio question and returning retries autoplay instead of staying locked", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  let stops = 0;
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {
        stops += 1;
      }
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [
      { id: "choice-1", type: "choice", prompt: "已答", answer: "A", choices: ["A", "B"] },
      { id: "listen-return", type: "listen", prompt: "听选", answer: "안녕", choices: ["안녕", "학교"], speak: "안녕" }
    ],
    initialAnswers: [{ questionId: "choice-1", answer: "A", correct: true }],
    initialIndex: 1,
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  assert.match(textContent(tree), /正在检查这台设备的韩语语音/);
  assert.equal(findElement(tree, (node) => node.type === "input" && node.props?.type === "radio"), null);

  findButton(tree, "上一题").props.onClick();
  tree = hooks.render(DrillRunner, props);
  assert.equal(stops, 1);
  assert.match(textContent(tree), /已答/);

  findButton(tree, "下一题").props.onClick();
  tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 2, "returning to the unanswered listen item should autoplay again");
  assert.match(textContent(tree), /正在检查这台设备的韩语语音/);

  speechCalls[1].options.onstart();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.type === "input" && node.props?.type === "radio"));
  assert.doesNotMatch(textContent(tree), /正在检查这台设备的韩语语音/);
});

test("DrillRunner watchdog treats accepted playback without onstart as started, not unavailable", async () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  const timeouts = [];
  const window = {
    setTimeout(fn, ms) {
      timeouts.push({ fn, ms });
      return timeouts.length;
    },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });
  const props = {
    questions: [{ id: "dictation-watchdog", type: "dictation", prompt: "听写", answer: "안녕", speak: "안녕" }],
    finishLabel: "完成"
  };

  let tree = hooks.render(DrillRunner, props);
  await Promise.resolve();
  assert.equal(speechCalls.length, 1);
  assert.equal(findElement(tree, (node) => node.type === "KoreanInput"), null);
  assert.equal(findElement(tree, (node) => node.type === "Button" && textContent(node).includes("跳过音频题")), null);
  assert.match(textContent(tree), /正在检查这台设备的韩语语音/);

  const watchdog = timeouts.find((timer) => timer.ms === 5000);
  assert.ok(watchdog, "autoplay should arm a 5s start-event watchdog");
  watchdog.fn();
  tree = hooks.render(DrillRunner, props);

  assert.ok(findElement(tree, (node) => node.type === "KoreanInput"), "answering should unblock after accepted playback");
  assert.ok(findButton(tree, "播放"));
  assert.ok(findButton(tree, "慢速重播"));
  assert.equal(findElement(tree, (node) => node.type === "Button" && textContent(node).includes("跳过音频题")), null);
  assert.doesNotMatch(textContent(tree), /这次未能播放韩语音频/);
  assert.doesNotMatch(textContent(tree), /正在检查这台设备的韩语语音/);
  assert.equal(findButton(tree, "提交").props.disabled, true);

  const input = findElement(tree, (node) => node.type === "KoreanInput");
  input.props.onChange("안녕");
  tree = hooks.render(DrillRunner, props);
  assert.equal(findButton(tree, "提交").props.disabled, false);
});

test("DrillRunner still offers skip when speak is rejected or hard-fails", async () => {
  for (const failure of ["speak-false", "onerror"]) {
    const hooks = createHookHarness();
    const speechCalls = [];
    const window = {
      setTimeout() { return 17; },
      clearTimeout() {},
      addEventListener() {},
      removeEventListener() {}
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
        isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
        speakKorean(text, options) {
          speechCalls.push({ text, options });
          return failure !== "speak-false";
        },
        stopSpeech() {}
      }
    }, { queueMicrotask, window });
    const props = {
      questions: [{ id: `listen-${failure}`, type: "listen", prompt: "听选", answer: "안녕", choices: ["안녕", "학교"], speak: "안녕" }],
      finishLabel: "完成"
    };

    let tree = hooks.render(DrillRunner, props);
    await Promise.resolve();
    if (failure === "onerror") {
      assert.equal(speechCalls.length, 1);
      speechCalls[0].options.onerror({ error: "network" });
    }
    tree = hooks.render(DrillRunner, props);

    assert.equal(findElement(tree, (node) => node.type === "input" && node.props?.type === "radio"), null, `${failure} must hide choices`);
    assert.ok(findButton(tree, "跳过音频题"), `${failure} must offer skip`);
    assert.match(textContent(tree), /这次未能播放韩语音频/);
  }
});

test("DrillRunner lets a resumed answered audio question advance", () => {
  const hooks = createHookHarness();
  const speechCalls = [];
  const window = {
    setTimeout() { return 17; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {}
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
      isGestureBlockedPlaybackError: mockGestureBlockedPlaybackError,
      speakKorean(text, options) {
        speechCalls.push({ text, options });
        return true;
      },
      stopSpeech() {}
    }
  }, { queueMicrotask, window });
  const questions = [
    { id: "dictation-1", type: "dictation", prompt: "听写一", answer: "안녕", speak: "안녕" },
    { id: "dictation-2", type: "dictation", prompt: "听写二", answer: "학교", speak: "학교" }
  ];
  const props = {
    questions,
    finishLabel: "完成",
    initialAnswers: questions.map((question) => ({
      questionId: question.id,
      answer: question.answer,
      correct: true
    })),
    initialIndex: 1
  };

  let tree = hooks.render(DrillRunner, props);
  assert.equal(speechCalls.length, 0, "answered audio should not be replayed on resume");
  const finish = findButton(tree, "完成");
  assert.equal(finish.props.disabled, false);
  finish.props.onClick();
  tree = hooks.render(DrillRunner, props);
  assert.ok(findElement(tree, (node) => node.props?.role === "status"));
});

function loadLessonEvidencePanels(hooks, {
  MediaRecorder,
  getUserMedia,
  window = { setInterval() { return 1; }, clearInterval() {} },
  recordingOverrides = {},
  lessonEvidenceOverrides = {},
  capstoneOverrides = {}
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
      isValidCapstoneEvidence: () => false,
      ...capstoneOverrides
    },
    "@/lib/learning/lesson-bridge": { buildLessonBridge: () => ({}) },
    "@/lib/learning/lesson-assessment": { assessLessonAttempt: () => ({}) },
    "@/lib/learning/lesson-evidence": {
      checkLessonTaskEvidence: () => ({ ready: false, checks: [] }),
      lessonCompletionTask: () => null,
      ...lessonEvidenceOverrides
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
  const globals = {
    Blob,
    MediaRecorder,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    navigator: { mediaDevices: { getUserMedia } },
    performance: { now: () => 1000 },
    queueMicrotask,
    window
  };
  return {
    ...loadComponent("src/components/learning/lesson-result-actions.tsx", imports, globals),
    ...loadComponent("src/components/learning/lesson-evidence-panels.tsx", imports, globals)
  };
}

function createLessonResultActionsProps(overrides = {}) {
  return {
    savedScore: null,
    saveError: false,
    score: 90,
    unlocked: true,
    corePathSaved: false,
    bridge: { reviewCards: 0, transferMaterials: [] },
    assessment: {
      overallPassed: true,
      productionRequired: false,
      productionPassed: true,
      productionCorrect: 0,
      productionTotal: 0,
      listeningRequired: false,
      listeningPassed: true,
      listeningDeferred: false,
      listeningSkipped: false,
      listeningCorrect: 0,
      listeningTotal: 0,
      corePassed: true
    },
    completionGateReady: true,
    onRetry() {},
    onSave() {
      return true;
    },
    ...overrides
  };
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

function mockGestureBlockedPlaybackError(error) {
  const name = typeof error === "string" ? error : error?.error || error?.name || error?.reason;
  return name === "NotAllowedError" || name === "play-rejected" || name === "needs-gesture" || name === "not-allowed";
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
      if (id === "@/data/curriculum-runtime" && "@/data/curriculum" in imports) return imports["@/data/curriculum"];
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
          effect: pending.effect,
          cleanup: pending.effect() || undefined
        };
      }
      return tree;
    },
    replayEffects() {
      const effects = slots
        .map((slot, index) => ({ index, effect: slot?.effect, cleanup: slot?.cleanup }))
        .filter((entry) => typeof entry.effect === "function");
      for (const entry of effects) entry.cleanup?.();
      for (const entry of effects) {
        slots[entry.index].cleanup = entry.effect() || undefined;
      }
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
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
