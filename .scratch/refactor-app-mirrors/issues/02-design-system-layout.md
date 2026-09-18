# 02: Design system + sidebar layout

**What to build:** The visual foundation — mirrorz's SCSS design tokens ported into the project, a sidebar navigation component with extensible nav items, and a page layout wrapping all routes. Dark/light theme CSS custom properties in place (no toggle yet, defaults to dark).

**Blocked by:** 01-project-scaffold

**Status:** ready-for-agent

- [ ] SCSS tokens ported from mirrorz: `tokens.scss`, `color.scss`, `fonts.scss`, `consts.scss`, `globals.scss`
- [ ] Material Icons font loaded (via CDN or local files)
- [ ] Source Sans 3 font loaded (via Google Fonts or local files)
- [ ] `Sidebar` component with extensible nav array: `[{label, href, icon, external?}]`
- [ ] Initial nav items: Mirror List (`/`), Downloads (`/download/`), News (`/news/`), Help (`/help/`, external), About (`/about/`)
- [ ] `Layout` component: sidebar + main content area, responsive (sidebar collapses on mobile)
- [ ] All routes wrapped in the Layout
- [ ] CSS custom properties for dark theme (matching mirrorz's color scheme)
- [ ] Light theme variables defined but not toggled yet (defaults to dark)
- [ ] Status badge CSS classes: `.success`, `.failed`, `.syncing`, `.pending`, `.paused`, `.proxy`, `.unknown` with colored `--c` custom properties