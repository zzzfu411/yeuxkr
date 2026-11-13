# Engineering & Asset Reference

Internal verification commands, local storage boundaries, audio/visual asset pipelines, and curriculum constraints for Kirina Korean (`yeuxkr`).

## Verification & Release Gates

```bash
npm run content:prepare # rebuild src/data/curriculum-runtime.js after editing src/data/lessons/
npm run validate        # verify curriculum sync, lexicon, audio corpus, and visual manifest
npm run lint            # ESLint (--max-warnings=0)
npm run typecheck       # TypeScript app check
npm run typecheck:strict # strict boundary check + RuntimeLesson checkJs contract
npm test                # Node unit tests (tsx + node:test)
npm run build           # production Next.js build
npm run check           # validate + lint + typecheck + typecheck:strict + test + build
npm run check:smoke     # start production server in-process + HTTP & Playwright smoke
npm run check:release   # verify NEXT_PUBLIC_SITE_URL release metadata preconditions
npm run check:all       # full gate: check + check:smoke
npm run audit:prod      # npm audit --omit=dev --audit-level=high
```

- **Browser Smoke**: `npm run check:smoke` requires a prior `npm run build` and Playwright Chromium (`npx playwright install chromium`; override module path with `PLAYWRIGHT_ENTRY` if needed). It runs script-budget, backup cancel/replace, audio fallback, cross-tab SRS queue, pagination, and 6-viewport layout checks, writing artifacts to `.browser-check/` and shutting down the server cleanly on exit.
- **Release Metadata**: Set `NEXT_PUBLIC_SITE_URL` to the production `https://` origin before building so canonical URLs, OpenGraph images, and sitemap entries are emitted. Without it, local builds omit absolute URLs. Review, mistakes, quiz, settings, and onboarding routes are marked `noindex`.

## Storage & Data Boundaries

- **Browser-Local State**: Progress, SRS cards, study drafts, and output portfolio entries are stored in `localStorage`. Voice recording `Blob` objects are stored in same-origin `IndexedDB` and are not included in JSON text backups (download individual recordings from the lesson page before clearing site data or switching devices).
- **Backup & Restore**: JSON import validates schema types and nested structures (up to 4 MB) and previews counts before confirmation. Confirmed restore replaces local progress and clears existing IndexedDB recordings; failed writes attempt rollback.
- **Cross-Tab Safety & Runtime Split**: Review queues detect stale card snapshots across open tabs and prompt to reload rather than double-grading. Full teaching cards stay in `src/data/lessons/` for server lesson pages, while `npm run content:prepare` emits a compact `src/data/curriculum-runtime.js` index consumed by the client workspace.
- **Online Web App Shell**: `public/manifest.webmanifest` provides install metadata and icons, while `PwaRegister` only cleans up retired service workers and legacy caches—the app does not register an offline service worker.

## Bundled Speech Pipeline

Course audio prefers the 1,212 pre-generated Korean MP3 clips in `public/assets/audio/ko/`, falling back to browser Korean Web Speech synthesis only for dynamic text.

```bash
npm run speech:prepare  # collect Korean prompts from lessons/drills into scripts/speech-corpus.json
npm run speech:generate # synthesize MP3s locally via Sherpa-ONNX + vits-mimic3-ko_KO-kss_low
```

Local synthesis expects Sherpa-ONNX + `lameenc` under `.tools/sherpa/` and the KSS model under `.tools/models/vits-mimic3-ko_KO-kss_low/` (`.tools/` is gitignored). `scripts/validate.mjs` rejects missing, truncated, malformed, or manifest-mismatched MP3 files.

## Visual Assets & Content Scope

- **Visual Manifest**: Seasonal scene assets live in `public/assets/generated/` as paired `.png` sources and `.webp` display files, registered in `src/data/visuals/assets.ts` and `src/data/visuals/manifest.ts` and verified by `scripts/validate.mjs` across all four themes (Spring, Monsoon, Late Autumn, Blue Night).
- **Current Corpus & Roadmap**: Ships 60 core lessons, 722 vocabulary entries, 83 grammar points, 20 pragmatic scenarios, 12 nuance sets, and 29 scripted immersion materials. Long-term expansion targets (5,000+ vocabulary/collocations, 200+ graded materials, 120+ output tasks, 24+ checkpoints) are tracked in `src/data/native-roadmap.js`. In-app scores reflect local study progress rather than formal CEFR or TOPIK certification.
