# Signal Pond design system

## Overview

Signal Pond is a compact reading and discovery interface for people following Identity MD. The visual direction is dark green with Pepes equipped with AI. A locally bundled 3D Pepe illustration carries that idea; the rest of the interface stays quiet and useful. The original frog mark repeats in the header, footer, and dialogs.

The page starts with a short introduction and a direct path to the tweets. The feed uses a single reading column, while desktop adds topic and author shortcuts. Source freshness is visible above the controls. This is a snapshot reader, with no wallet or social posting flow.

Canonical styles are in `src/styles.css`; components are in `src/App.tsx` and `src/icons.tsx`.

## Colors

CSS uses hex primitives mapped to semantic roles in `src/styles.css:3`.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--bg-page` | `#0a1410` | Page canvas |
| `--bg-surface` | `#111e17` | Tweets, fields, sidebar sections, dialogs |
| `--bg-raised` | `#16261c` | Counters and icon tiles |
| `--bg-hover` | `#1c3022` | Hover states and empty-state icon backgrounds |
| `--border` | `#2b4131` | Structural separators and card outlines |
| `--border-control` | `#617d65` | Field and load-more boundaries |
| `--text` | `#edf2e9` | Primary text |
| `--text-muted` | `#a5b4a8` | Handles, dates, metrics, supporting copy |
| `--accent` / `--focus` | `#c5ef82` | Primary fill, selected states, links and focus |
| `--accent-hover` | `#d5f5a6` | Primary-action hover |
| `--on-accent` | `#1c2b12` | Text and icons on the primary fill |

The selected topic surface uses `#293a20` with a `#6b854f` border. The hero blends into `#0c1a12`; the sidebar invitation uses `#1a2b1c` with a `#385033` border. Those are local treatments, not general-purpose extra themes. There is one intentional dark theme.

Measured solid token pairs: primary text on cards **15.12:1**, muted text on cards **7.93:1**, muted text on hover surfaces **6.48:1**, selected-topic text **9.33:1**, primary-button text **11.43:1**, and field borders against the field surface **3.79:1**. The pinned probe also checked rendered solid text backgrounds. It leaves three text boxes over imagery/gradients unmeasured; these ratios do not establish their contrast.

## Typography

One local variable font, **Manrope**, with `Arial, sans-serif` fallbacks. `public/assets/manrope-latin.woff2` supplies weights 200–800; the interface uses **400, 600, and 700**. Font loading was confirmed in Chromium. The OFL license ships with the asset.

The six size tokens are `--text-xs` 12px, `--text-sm` 14px, `--text-base` 16px, `--text-lg` 20px, `--text-xl` 32px, and `--text-display` 48px at the default 16px root size. Sizes are declared in rem so text enlargement works.

- Display heading: 48px/1.08, weight 700, tracking −0.055em; 32px on mobile.
- Feed heading: 20px/1.3, weight 700; 16px below 365px.
- Tweet body: 16px/1.7, weight 400; 14px on mobile for the compact excerpt feed.
- Authors and controls: 14px, weights 600 or 700. Supporting text and metrics use 12px.
- Mobile search input: 16px to avoid automatic input zoom on iOS.

Headings balance their lines; supporting paragraphs use `text-wrap: pretty`. Tweets cap at 68ch and wrap long strings. Handles and author names can wrap rather than being ellipsized. Numbers use tabular digits. There is no monospace prose, tracked uppercase eyebrow, or gradient text.

## Layout

The maximum shell width is **1280px**, including 32px inline padding. Desktop content is a flexible feed plus a **304px** sidebar, separated by 32px. The spacing vocabulary is 4, 8, 12, 16, 20, 24, 32, 40, and 48px, declared as `--space-*`; existing component rules use matching pixel values with small optical exceptions. Cards have 22px/24px padding and 16px between them.

| Breakpoint | Implemented behavior |
| --- | --- |
| Above 1040px | Full desktop layout, 320px minimum hero height |
| At 1040px | Sidebar narrows to 264px, grid gap becomes 24px, some secondary metrics hide |
| At 850px | Sidebar hides; feed uses full width; header about shortcut hides |
| At 560px | 20px page margins, 224px minimum hero, 32px display heading; compact header and no hero footnote |
| At 365px | 16px page margins, smaller logo, 16px feed heading; replies hide to protect controls |

Topic filters wrap instead of horizontally scrolling. Header, feed-heading, footer utilities, and tweet action rows can wrap during text enlargement. Content and controls stay in normal flow; no sticky header obscures the feed. The saved page replaces the art banner with a small bookmark introduction.

The final export was checked at 320, 360, 375, 390, 768, 1024, and 1440px. At 390×844, the first tweet's read action ends at about **819px**, with the primary Explore tweets button at about **247–291px**. The 200% text-enlargement and RTL stress cases reflow without horizontal overflow. Native browser zoom and translation remain unverified.

## Elevation & Depth

Surfaces are flat, separated by tone and one-pixel structural borders. No card combines a border with a shadow. The hero's gradient is a mask for its artwork, not a competing decoration. A native dialog enters the browser top layer with a dark translucent backdrop; notifications sit above the page near the bottom. There are no autoplaying effects or continuous animation.

## Shapes

`--radius-sm` is **8px** for controls; `--radius-md` is **12px** for cards; `--radius-lg` is **20px** for the desktop hero and dialog. Mobile uses a 12px hero radius. Avatars are circular, with a one-pixel white outline at 10% opacity. Only artwork is clipped; text containers grow and wrap.

## Components

| Component or pattern | Source / behavior |
| --- | --- |
| `FrogMark`, `Icon` | `src/icons.tsx`; native SVG, `currentColor`, 1.7px line icons; decorative SVGs hidden from assistive technology |
| `TweetCard` | `src/App.tsx`; real author/date, cited excerpt, topic, original-tweet links, read-only metrics, save/copy controls |
| `Avatar`, `Metric` | Real locally cached portrait or initial fallback; metrics include full accessible values and capture descriptions |
| `.button-primary` | Lime fill with dark text, 44px minimum height; one principal action per view |
| `.filter-chip` | Native toggle buttons with `aria-pressed`; selected fill and border; 44px high on mobile |
| `.search-field`, `.sort-control` | Labeled native search/select controls; visible focus-within field perimeter; distinct reset action |
| `Modal` | Native `<dialog>` for sources or copy fallback; close button, backdrop dismissal, Escape, Tab cycling and focus return |
| `.empty-state` | Distinguishes no matches from no saved tweets; offers Reset filters or Explore tweets |
| `.toast` | Stable polite live region, refreshed message content, persistent dismiss control; never claims clipboard success after a rejection |

Bookmarks use `src/storage.ts` and the key `signal-pond:saved:v1`. Storage denial leaves an in-memory collection with an explicit notice. Invalid JSON recovers to an empty collection without falsely claiming storage is blocked. The feed has no remote loading state: all tweet records are bundled.

Focus uses a **2px** lime perimeter offset **4px**; search uses a 2px surrounding field ring. Forced-colors styles use system Highlight. Hover treatment is gated on hover-capable input. Only color/background/border transition for **150ms**, using `cubic-bezier(.2,0,0,1)`, and only when reduced motion is not requested. Press scale is 0.96 for primary/icon buttons. The selected bookmark uses a filled icon as well as color.

## Do's and don'ts

Reuse semantic color roles, the six type sizes, native controls, and the existing card/empty-state patterns. Keep the actual tweet and an action on the first phone screen. Add any future content view within `.site-main` using fragment navigation, preserving a single h1 and the feed's reading order.

Keep capture dates, source links, and ranking scope visible or one clear control away. Refresh the snapshot by changing sourced records, never by inventing counts. Do not add wallet controls, fake verified badges, live indicators, social-like buttons, or background tracking to this reader. Keep supporting artwork local and retain its provenance.

Guidance attribution: [Better Interface and Impeccable notices](THIRD_PARTY_NOTICES.md). The six-domain evidence and remaining browser limitations are in [artifacts/validation.md](artifacts/validation.md).
