# Sync page (Apache ECharts)

## Description

Add a "Sync" page (`/sync`) visualizing each mirror's sync timestamps and Status from the
backend `mirrors.json` feed (see `reference/mirrors.json`). Two charts. Grilled and settled
(Q1–Q15); docs written: `CONTEXT.md` (+ Sync Run, Staleness), `docs/adr/0006`.

## Settled decisions

- **Q1** Page title "Sync", route `/sync`, nav "Sync". "state" stays banned (glossary).
- **Q2** One chart row per Mirror Entry, keyed by `cname`; disambiguate duplicates with
  site abbreviation if the feed ever has them.
- **Q3** Audience: ops triage ("what failed / is overdue / is slow"). Users have the
  Mirrors page.
- **Q4** Tree-shaken `echarts/core` + in-house `useChart` hook + `React.lazy` route.
- **Q5** Staleness chart: horizontal bars, log x-axis, colored by Status.
- **Q6** Timeline window fixed: `now−24h … now+12h`; older events clamp to the left edge
  with a "«" marker.
- **Q7** Odd statuses (`paused`/`proxy`/`unknown`/`pre-syncing`) and missing timestamps:
  marker-only rows (no interval bar). Running syncs (no end / end < start): bar from
  `last_started` to the now-line.
- **Q8** 60 s `setInterval` tick (page-visible) drives the now-line and running bars.
- **Q9** Tooltips + click-through to `/{cname}/` (git-aware: `/git/{cname}/` for `*.git`).
  No filter, no zoom/brush in v1.
- **Q10** ECharts rationale (ADR 0006): stable, adaptive chart styling; we own no
  axis/tooltip/resize edge cases. Glossary: **Sync Run**, **Staleness** added.
- **Q11** Row order fixed: severity `failed → pre-syncing → syncing → unknown → paused →
  proxy → success`, then Staleness desc, then name. Timeline on top, staleness below.
  Nav entry after "Mirrors". No sort control in v1. *Amended:* the staleness chart sorts
  by **Staleness descending only** (ties by name) — no grouping by Status there.
- **Q12** Styling: status colors + text/muted/border/background from design tokens
  (dark-mode correctness, badge parity); echarts owns the rest. Entry animation on first
  render only — never on the 60 s tick / SWR refetch.
- **Q13** Tooltip payload: `cname` + Status + all four timestamps (RFC3339 + relative) +
  Sync Run duration; `next_schedule` reads "overdue by X" when past.
- **Q14** Min bar width ~4 px; the timeline answers *when*, duration is hover detail.
- **Q15** Overdue `next_schedule` = geometry (tick right of now-line) + tooltip label
  only. Color stays reserved for Status.

## Data facts (from `reference/mirrors.json`)

- 55 entries; snapshot only (4 timestamps + Status per mirror, no history).
- Statuses seen: `success` (44), `failed` (8), `syncing` (3). Vocabulary: `success |
  syncing | failed | pre-syncing | paused | proxy | unknown`.
- `last_started`/`last_ended` cluster within ~14 h; `last_update` spans 0–80 days.
- Quirk: `rosdistro.git` (`syncing`) has `last_ended < last_started` → running syncs get
  `ended = now`.
- Timestamps may be 0/missing → "unscheduled"/"-", never plotted at epoch 0.

## Status

- [x] Grilling session (Q1–Q15) + docs (CONTEXT.md, ADR 0006)
- [x] Add `echarts` dependency (6.1.0)
- [x] `src/lib/sync.ts` — pure derivation (`deriveSyncRow`, `sortRows`, severity ranks,
      `mirrorHref`, `formatDuration`, `escapeHtml`)
- [x] `src/lib/chart-theme.ts` — palette from CSS custom properties (`--st-*`, text,
      border, background)
- [x] `src/components/sync/useChart.ts` — echarts lifecycle hook (init / setOption /
      resize / dispose / no animation after first render)
- [x] `src/components/sync/options.ts` — pure option builders (`buildTimelineOption`,
      `buildStalenessOption`); note: `renderItem` params carry no data item, rows are
      looked up by encoded index
- [x] `src/components/sync/SyncTimeline.tsx` — custom-series Gantt (interval bar, min
      width 4 px, "«" clamp marker, `last_update` dot, `next_schedule` tick, dashed
      now-line with label at top, tooltip per Q13, click-through per Q9)
- [x] `src/components/sync/StalenessBars.tsx` — log-scale bars (Q5), same row order
- [x] `src/pages/Sync.tsx` — page shell, 60 s visible tick, summary strip, loading/error
- [x] Wire-up: lazy `/sync` route, Sidebar entry after Mirrors, i18n `nav.sync` +
      `sync.*` (en_us + zh_cn), `src/styles/_sync.scss` from tokens only
- [x] Verify: `npm run build` passes; `ssr-smoke.ts` renders both charts headlessly
      (real feed + edge cases) via echarts SSR; screenshots: light, dark, zh — all OK
- [x] A11y fallback: `role="img"` + aria labels on chart containers; Mirrors page
      remains the text equivalent

## Deviations / notes

- **Follow-up batch** (post-grilling tweaks): nav icon `sync`; downloads-page layout
  (`.page-head` + `.category-tabs` reused from _download.scss) with route-driven tabs
  `/sync/timeline` + `/sync/age`; Summary gauges removed from the top bar; page desc
  "Mirror sync status"; legend no longer says "(color = status)"; tooltips use RFC 3339
  with local tz (shared `formatRFC3339` in `lib/client/utils.ts`, also used by the
  Mirrors page now); **Staleness renamed to Age** throughout (component `AgeBars.tsx`,
  `sortRowsByAge`, i18n `ageTitle`/`ageValue`, CONTEXT.md term **Age**); time-axis day
  boundaries render as `MM-DD` (e.g. `09-30`, `10-01`) instead of echarts' `30`/`Oct` —
  asserted in the smoke test.
- Charts overflow horizontally below 720 px instead of squishing (`.chart-card` scrolls,
  `.chart { min-width: 720px }`) — mobile keeps the full 36 h axis and label column.

- **Full-height charts, no dataZoom**: both charts render all rows (~1450 px each) and
  the page scrolls, instead of the planned 640 px grid + nested row-scrolling. Nested
  scroll fights the page scroll and hides rows during triage. Revisit if the feed grows
  far past ~100 mirrors.
- `renderItem` params carry only `dataIndex*` — never `params.data`; tooltips and
  clicks also use `params.dataIndex` → `rows[i]`.
- The `Sync` chunk is ~540 kB (echarts tree-shaken) and lazy-loaded; the main bundle
  stays ~358 kB. Vite prints a cosmetic >500 kB chunk warning.
- Pre-existing, untouched: `Summary` renders relative time per status instead of counts;
  vite's dep scanner warns about unresolvable imports under `reference/mirrorz`.

## Out of scope

- Historical status ribbons / uptime bars (needs a history collector).
- Per-site sync state (feed is single-site; `is_master` uniformly true).
- Sort controls, filter, zoom/brush (v2 candidates).

## Open

- Zebra stripes on the sync timeline: **done** — bands drawn inside `renderItem` (every
  other row, `--bg-subtle` via the palette). *Extended:* every row carries a full-row hit
  band so the tooltip shows on hover anywhere in the row — striped rows fill with
  `--bg-subtle`, white rows use `fill: 'transparent'` (zrender hit-tests by bounding rect,
  so it stays interactive; opaque `--bg` would cover the grid guides — verified the guides
  only show in unstriped rows). *Hover behavior:* the band **fades** (emphasis style:
  pinned `fill` + `opacity: 0.35`) instead of echarts' default lift-color brightening —
  pinning `fill` in `emphasis.style` suppresses the color lift (states.js
  `createEmphasisDefaultState` only lifts when the emphasis style has no fill), and the
  faded stripe lets the time guides show through. Verified end-to-end via
  `dispatchAction('highlight')` on a minimal chart: plain band brightens
  (46,52,56)→(50,57,61); pinned band fades to (24,29,35) with the guides bleeding
  through. Verified in both themes at the 26 px row pitch; markLine z-order probe
  confirmed the now-line paints above the bands.
