# Kirina Korean

A local-first Korean learning web app built with Next.js—combining Hangul syllable-block and sound-change labs, a 5-stage 60-lesson curriculum, scripted immersion dictation and retelling, expression references, and unified spaced-repetition review.

English · [简体中文](README.zh-CN.md)

| Seasonal Workspace | Hangul & Sound Lab |
| --- | --- |
| ![Workspace](docs/screenshots/hero-workspace.png) | ![Hangul Lab](docs/screenshots/hangul.png) |

## Features

- **5-stage, 60-lesson curriculum & self-study** — Guided path from zero-basis Hangul to natural expression with 80% mastery unlock gates, paired with a configurable self-study planner sharing one workspace state.
- **Hangul & sound-change studio** — Interactive syllable-block decomposition (`초성 · 중성 · 종성`), compound vowel breakdowns, minimal-pair listening drills, an on-screen Korean keyboard, and 7 phonological assimilation rules.
- **Immersion lab & expression library** — 29 scripted dialogues, news clips, and essays with line-by-line playback, masked dictation, retelling prompts, voice recording, and self-graded rewrites—backed by 722 vocabulary items, 83 grammar points, 20 pragmatic scenarios, and 12 nuance sets.
- **Bundled Korean audio** — 1,212 pre-generated Korean MP3 clips (`public/assets/audio/ko/`, synthesized locally with Sherpa-ONNX KSS) with automatic browser Korean TTS fallback for dynamic prompts.
- **Unified SRS & local ownership** — Lessons, transfer quizzes, Hangul, vocabulary, grammar, immersion outputs, and mistakes feed a single review queue; text progress stays in `localStorage` (with validated JSON backup/restore) and voice recordings in same-origin `IndexedDB`, with no account or backend required.

## Quick Start

Requires **Node.js 20.9+**.

```bash
git clone https://github.com/zzzfu411/yeuxkr.git
cd yeuxkr
npm ci
npm run dev
```

Open `http://localhost:3000` in your browser.

## Verification

```bash
npm run validate     # verify curriculum sync, lexicon, audio corpus, and visual manifest
npm run check        # validate + ESLint + TypeScript (incl. strict) + unit tests + build
npm run check:smoke  # in-process production server HTTP + Playwright Chromium regression
npm run check:all    # full CI gate (check + check:smoke)
```

See [docs/ENGINEERING.md](docs/ENGINEERING.md) for content build scripts, local speech/image asset pipelines, and storage boundaries, and [SECURITY.md](SECURITY.md) for single-user security scope.

## Project Structure

```text
src/
├── app/         Next.js App Router pages (workspace, path, learn, hangul, immersion, review, quiz)
├── components/  Seasonal layout shell, Korean input/audio controls, and drill runners
├── data/        60 lessons, lexicon, grammar, pragmatics, sound changes, and visual manifests
└── lib/         Workspace state, SRS scheduler, backup normalization, and Hangul jamo utilities
public/assets/
├── audio/ko/    1,212 bundled Korean MP3 clips and corpus manifest
└── generated/   Seasonal WebP/PNG scene assets across four themes
scripts/
└── validate.mjs Build-time curriculum, audio, and visual contract validator
```
