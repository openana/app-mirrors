# 03: Mirror list

**What to build:** The home page (`/`) showing all mirrors from the backend API, grouped with collapsible cards, colored status badges, search/filter with regex support, and auto-refresh. No static mirror config — purely data-driven.

**Blocked by:** 02-design-system-layout

**Status:** ready-for-agent

- [ ] `MirrorEntry` type matching backend `mirrors.json` format: `name`, `status`, `upstream`, `size`, `last_update_ts`, `last_started_ts`, `last_ended_ts`, `next_schedule_ts`
- [ ] `fetchMirrors(apiUrl)` function using SWR with auto-refresh (poll every 5 minutes)
- [ ] `MirrorList` component rendering grouped mirror cards (group by name prefix or explicit grouping)
- [ ] Status badges per mirror using the SCSS badge classes from T02
- [ ] Status summary per group (colored count glyphs, e.g., "3 success, 1 syncing")
- [ ] Expand/collapse per group, with collapsed groups showing only summary
- [ ] Search bar with regex filter — invalid regex gracefully treated as literal text
- [ ] Relative time display for last sync (e.g., "2 hours ago")
- [ ] Mirror metadata visible on expand: upstream URL, size, last update time
- [ ] Only mirrors present in the backend feed are shown — no static config fallback