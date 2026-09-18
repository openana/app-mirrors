# Refactor app-mirrors with mirrorz design and help docs

**Labels**: `ready-for-agent`

## Problem Statement

The current app-mirrors site uses a dated design (Tailwind/Flowbite), a static mirror config array that must be manually kept in sync with the backend, and a contentlayer2-based docs pipeline that is fragile. The user wants a modern, clean design matching mirrorz's dark-theme aesthetic, a data-driven mirror list that reflects the actual backend state, a download browser feature, and help docs rendered from the mirrorz-docs repository — all in a simple SPA architecture.

## Solution

Build a new Vite + React Router SPA that ports mirrorz's SCSS design system, fetches mirror status and download data client-side from the backend API, renders help docs from mirrorz-docs using a full compilation pipeline (YAML config + MDX + Hogan templates), and pre-renders help/news pages to static HTML for SEO. The sidebar navigation is extensible for future pages.

## User Stories

1. As a mirror site visitor, I want to see all mirrors provided by the backend, so that I only see mirrors that actually exist in the infrastructure
2. As a mirror site visitor, I want to see each mirror's sync status (success, syncing, failed, etc.) with colored badges, so that I can quickly assess mirror health
3. As a mirror site visitor, I want to search/filter mirrors by name with regex support, so that I can quickly find a specific mirror
4. As a mirror site visitor, I want mirrors grouped by category with collapsible sections, so that I can browse the list without being overwhelmed
5. As a mirror site visitor, I want to see a status summary per group (e.g., "3 success, 1 syncing"), so that I can assess group health at a glance
6. As a mirror site visitor, I want the mirror list to refresh automatically every few minutes, so that I see current sync status without manual reload
7. As a mirror site visitor, I want to browse available downloads by category (OS, app, font), so that I can find OS images and applications
8. As a mirror site visitor, I want to select a distro within a category and see download URLs from all sites, so that I can choose a download source
9. As a mirror site visitor, I want to filter distros in the download browser, so that I can quickly find a specific distribution
10. As a mirror site visitor, I want to read help docs for each mirror, so that I know how to configure my system to use the mirror
11. As a mirror site visitor, I want help docs to have interactive code blocks where I can select options (e.g., distro version) and see updated commands, so that I get copy-paste-ready instructions
12. As a mirror site visitor, I want help docs to support site-specific content overrides, so that instructions are correct for my mirror site
13. As a mirror site visitor, I want to read news/announcements, so that I stay informed about mirror changes
14. As a mirror site visitor, I want to read an about page, so that I know who maintains the mirror and how to contact them
15. As a mirror site visitor, I want to switch between dark and light themes, so that I can use the site comfortably in different environments
16. As a mirror site visitor, I want the sidebar navigation to persist across all pages, so that I can easily navigate between features
17. As a search engine crawler, I want help doc pages to have real HTML content (not an empty SPA shell), so that I can index them
18. As a search engine crawler, I want news pages to have real HTML content, so that I can index them
19. As a developer, I want the mirror list to be driven entirely by the backend API, so that I never need to update a static config file
20. As a developer, I want the SCSS design system ported from mirrorz, so that the site looks consistent with the mirrorz ecosystem
21. As a developer, I want the sidebar nav to be extensible, so that I can add new pages (e.g., status monitor) without restructuring
22. As a developer, I want news posts written in plain Markdown, so that I don't need MDX tooling for simple announcements
23. As a developer, I want the help docs pipeline to compile YAML configs and MDX files from mirrorz-docs at build time, so that help pages are pre-rendered static HTML
24. As a developer, I want the data fetching layer to be a testable pure function, so that I can verify data transformation without UI
25. As a developer, I want the help docs compilation pipeline to be testable as a pure function, so that I can verify YAML parsing and MDX output
26. As a mirror site visitor, I want to see mirror metadata (upstream URL, size, last update time) when I expand a mirror entry, so that I have full context
27. As a mirror site visitor, I want status badges to use distinct colors per state (green for success, red for failed, blue for syncing, etc.), so that I can visually scan status quickly
28. As a mirror site visitor, I want to see relative time for last sync (e.g., "2 hours ago"), so that I can assess freshness without mental math
29. As a mirror site visitor, I want help docs to have a table of contents sidebar, so that I can navigate long documents
30. As a mirror site visitor, I want help docs to have a mirror site selector, so that I can switch between site-specific instructions

## Implementation Decisions

### Architecture

- **Stack**: Vite + React Router (SPA). Pre-render help/news pages to static HTML at build time.
- **Rendering**: Client-side rendering for all pages. Pre-render script generates static HTML for `/help/*` and `/news/*` routes.
- **Data fetching**: Client-side SWR for mirror status and download list. No SSR/ISR.

### Design System

- Port mirrorz's SCSS tokens, variables, and component styles directly into `src/styles/`.
- CSS custom properties for theming (dark/light via `data-theme` attribute on `<html>`).
- Material Icons for iconography.
- Source Sans 3 for typography.
- Status badge system using colored CSS custom properties per state class (`.success`, `.failed`, `.syncing`, etc.).

### Data Layer

- Mirror list is driven entirely by the backend `mirrors.json` feed. No static `mirrorConfigs` array.
- Each Mirror Entry has: `name`, `status`, `upstream`, `size`, `last_update_ts`, `last_started_ts`, `last_ended_ts`, `next_schedule_ts`.
- Status values from backend: `success`, `syncing`, `failed`, `pre-syncing`, `paused`, `proxy`, `unknown`.
- Download list data follows mirrorz format: per-site `info` array with `{category, distro, urls: [{name, url}]}`.
- Index Listing format: `{name, type, mtime, size}` for directory browsing.

### Data Layer Module Interface

```ts
// Types
interface MirrorEntry {
  name: string;
  status: string;
  upstream: string;
  size: string;
  last_update_ts: number;
  last_started_ts: number;
  last_ended_ts: number;
  next_schedule_ts: number;
}

interface DownloadInfo {
  category: string;
  distro: string;
  urls: { name: string; url: string }[];
}

interface SiteData {
  site: { abbr: string; url: string };
  info: DownloadInfo[];
}

// Functions
fetchMirrors(apiUrl: string): Promise<MirrorEntry[]>
fetchDownloadList(apiUrl: string): Promise<SiteData[]>
```

### Help Docs Pipeline

- Full port of mirrorz-help's `parse-markdown.ts` logic.
- YAML config parsing: page titles, block ordering, input variables for interactive code blocks.
- MDX compilation with remark/rehype plugins (remark-gfm, rehype-external-links, custom header IDs).
- Hogan template compilation for interactive code blocks (user selects options, code updates).
- Site-specific content overrides from `mirrorz-docs/site/<SiteAbbr>/`.
- Content loader reads from `zdoc/` (git submodule → mirrorz-docs) and `zdoc/site/` directories.
- Routes enumerated from `routes.json` for pre-rendering.

### News Pipeline

- Plain Markdown files in `src/content/news/` with date-prefixed directories.
- Frontmatter: `title`, `date`, `summary`.
- Compiled at build time, pre-rendered to static HTML.

### Sidebar Navigation

- Extensible array of nav items with label, href, icon, and optional external flag.
- Initial items: Mirror List, Downloads, News, Help (external), About.
- Designed to accept future entries (e.g., Status Monitor) without restructuring.

### Pre-render

- Build script that: (1) enumerates help routes from `routes.json`, (2) enumerates news routes from content directory, (3) renders each route to static HTML.
- Output: SPA shell + static HTML files for `/help/*` and `/news/*`.

### Page Layouts

- **Home** (`/`): Mirror list with search bar, grouped cards, status badges.
- **Download** (`/download/[category]/[distro]/`): Category tabs, distro sidebar, per-site URL lists.
- **News** (`/news/[slug]/`): Article layout with date, title, content.
- **Help** (`/help/[...slug]/`): Two-column layout with TOC sidebar + content area. Mirror site selector.
- **About** (`/about/`): Static content page.

### Theming

- Dark/light toggle via `data-theme` attribute on `<html>`.
- CSS custom properties switch between dark and light values.
- System preference detection with manual override.

## Testing Decisions

### Primary Seams (unit-testable pure functions)

1. **Data layer** (`src/lib/client/`): Functions that fetch and transform mirror status and download list data. Test with mocked `fetch`. Assert on typed domain objects returned.

2. **Help docs pipeline** (`src/lib/help/`): Functions that parse YAML configs, compile MDX, and render Hogan templates. Test with fixture YAML/MDX content. Assert on compiled output structure.

### Secondary Seams (integration/component tests)

3. **Component rendering**: React components with typed props. Test with React Testing Library. Assert on DOM output (status badges rendered, search filters applied, groups collapsible).

4. **Pre-render script**: Integration test that runs the script and asserts HTML files exist for expected routes with real content (not empty shells).

### What makes a good test

- Test external behavior (what the user sees/can do), not internal implementation (which hooks are called).
- Data layer tests: given this JSON input, assert this typed output.
- Help docs tests: given this YAML+MDX input, assert this compiled structure.
- Component tests: given these props, assert this DOM exists.

### Not testing

- SCSS visual output (no visual regression testing for now).
- Third-party library behavior (Hogan, MDX compiler internals).

## Out of Scope

- Status monitoring page (reserved in nav but not implemented).
- i18n / language switching (design supports it via mirrorz patterns but not implemented in initial version).
- CI/CD pipeline setup.
- Backend API implementation (user provides endpoints).
- Visual regression testing.

## Further Notes

- The `mirrorz-docs` git submodule should be added at `zdoc/` (matching mirrorz-help's convention).
- The download list backend endpoint format must match mirrorz's `{site, info}` structure exactly.
- Mirror status API must be CORS-accessible for client-side fetching.
- Help docs pre-render requires enumerating all routes from `routes.json` at build time.