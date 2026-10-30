# Signal Pond

A dark-green reading room for tweets about Identity MD, with Pepe and his AI companions. Built with React, TypeScript, and Vite. The complete static site is in **`dist/`**, including its font, images, favicon, share card, and source list.

## Run locally

Use Node.js **22.12 or later** and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. To typecheck, rebuild the static export, and preview it:

```sh
npm run typecheck
npm run build
npm run preview
```

Preview defaults to `http://127.0.0.1:4173`. Serve `dist/` with any static HTTP server. Use HTTP rather than opening the HTML with `file://`, which restricts JavaScript modules and clipboard access. The build uses `base: './'`; assets work beneath a hosting subpath. Navigation uses fragments, so no server rewrites are needed. Hosting and publishing are outside this deliverable.

Dependencies and caches are not part of the submission. During this assignment they were installed outside the repository. The scripts support that workflow:

```sh
mkdir -p /tmp/signal-pond-tools
cp package.json package-lock.json /tmp/signal-pond-tools/
npm ci --prefix /tmp/signal-pond-tools --cache /tmp/signal-pond-npm-cache
npm run typecheck -- --tools /tmp/signal-pond-tools
npm run build -- --tools /tmp/signal-pond-tools
npm run preview -- --tools /tmp/signal-pond-tools
```

Keep `node_modules`, package caches, browser downloads, and temporary reports out of version control at every directory level. No ignore file was added or modified, and no dependency directories are present in the delivered tree. Keep `dist/` alongside the source and lockfile when submitting changes.

## What works

- Search excerpts, authors, handles, and topics; combine search with four topic filters.
- Rank by captured likes or reposts, or sort by tweet date. Load the next six tweets.
- Open each original tweet and author profile on X; copy its exact status URL.
- Save tweets in this browser, revisit them through Saved, and remove bookmarks. Changes synchronize across tabs on the same origin.
- Recover from empty searches, denied clipboard access, blocked browser storage, and malformed stored data.
- Read the source/ranking explanation through the snapshot info control or “Sources & about”.

Likes and other engagement figures are read-only observations. Saving a tweet is a local bookmark; it does not like or repost anything on X.

## Content and freshness

`src/tweets.json` is the source of truth: **12 real tweet excerpts from 10 accounts**, captured on **30 October 2026**. Every record includes its exact X status URL, public archive URL, UTC date, topic, cached avatar, and observed metrics. Excerpts contain at most 25 words. Topics are editorial groupings.

The records were read from individual public [teapawt archive pages](https://teapawt.org/surfcoderepeat/status/2107939454396567581), including posts by Adam, taylor, Minion, finne, Damián Et, IMD Radar, miyagod, Tradeguru, CHANGELOG.md, and Paper Clash. This is a selected snapshot, **not an exhaustive or live ranking of X**. Public archives may lag X. Missing counts stay `null` and display as `N/A`; no metrics or authors are invented.

Update `src/tweets.json` with verified sources and a fresh `capturedAt` value to refresh the collection. Cache any new avatar in `public/assets/avatars/`. Build again: `scripts/site.mjs` generates `dist/sources.json` from the same records and serves it during development. No network, API key, account, or private service is needed to rebuild or browse the exported feed. Following an external link still requires a network connection; X may require login.

## Validation

For repeatable browser checks:

```sh
npx playwright install chromium webkit
npm run build
npm test
```

On Linux, Playwright may also need system browser libraries. `npm test` starts a bounded local server under `/preview/`, tests the **production export**, and closes its browser and server. Its reports and screenshots go to `test/scratch/validation/`. Missing Chromium fails the test; unavailable WebKit is explicitly recorded as a limitation.

Actual final results on 30 October 2026:

| Check | Result |
| --- | --- |
| `npm run typecheck -- --tools /tmp/signal-pond-tools` | Passed, exit 0 |
| `npm run build -- --tools /tmp/signal-pond-tools` | Passed, exit 0; Vite 7.3.7 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/signal-pond-browsers npm test -- --tools /tmp/signal-pond-tools` | 12 passed, 0 failed; WebKit unavailable |
| Pinned `taste.mjs --out test/scratch/taste --offline` | 16/16 checks passed |
| Chromium responsive checks | No horizontal overflow at 320, 360, 375, 390, 768, 1024, or 1440px |
| Axe accessibility scans | No violations on the mobile feed, desktop feed, or about dialog |
| Runtime resources | No console errors, missing assets, or external runtime requests |

The 390×844 screenshot shows the first tweet and its read action, as well as the main Explore tweets button. Clipboard success was tested with Chromium permissions; denial was injected to check manual-copy recovery. Storage failures were also injected deliberately.

WebKit could not launch because GTK, GStreamer, and other required libraries were unavailable. Physical devices, assistive screen-reader sessions, browser-native zoom, and live social-platform unfurling were not tested. Text enlargement to 200% and RTL layout were stress-tested; neither is a substitute for those manual checks. The probe does not measure text contrast over imagery.

See [the six-domain review and fixes](artifacts/validation.md), [interaction results](artifacts/interaction-results.json), [design-probe results](artifacts/taste.json), [the design system](DESIGN.md), and [asset provenance](artifacts/ASSETS.md).

## Project map

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Feed, saved view, cards, controls, dialogs, notifications |
| `src/data.ts`, `src/tweets.json` | Snapshot, search/filter/sort logic, number/date formatting |
| `src/storage.ts` | Browser-local bookmark persistence and recovery |
| `src/icons.tsx`, `src/styles.css` | Native SVG icons, frog mark, tokens, responsive styles |
| `public/` | Complete local runtime artwork, avatars, font and favicon |
| `scripts/site.mjs` | Vite configuration, build, typecheck, development and preview |
| `scripts/validate.mjs` | Production interaction, accessibility and integrity checks |
| `dist/` | Finished static export; include it in delivery |
| `artifacts/` | Review, results, screenshots and attribution |

This is an independent community project, with no affiliation to Identity MD or X.
