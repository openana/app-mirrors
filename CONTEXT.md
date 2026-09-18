# App Mirrors

A university software mirror site that lists, serves, and documents open-source software repositories mirrored from upstream sources. Users visit to find mirrors, read usage help, check sync status, and read announcements. Built as a Vite SPA with React Router; help docs are pre-rendered to static HTML for SEO.

## Language

**Mirror**:
A software repository replicated from an upstream source and served to users. Each mirror has a `cname` (canonical name like `ubuntu` or `archlinux`), a sync status, and belongs to one or more sites.
_Avoid_: repo, package, repository (ambiguous — a mirror *contains* a repository, but is not one itself)

**cname**:
The canonical identifier for a mirror, used as the key across all systems (status API, help docs, URL slugs). Examples: `ubuntu`, `archlinuxcn`, `pypi`.
_Avoid_: name, slug, id

**Site**:
A mirror hosting location — a server or CDN that serves mirrored content. Has an abbreviation (e.g., `XJTU`, `TUNA`), a base URL, and provides multiple mirrors. In mirrorz, sites are the top-level data source.
_Avoid_: server, host, provider

**Upstream**:
The original source that a mirror replicates from. Not all mirrors expose their upstream URL.
_Avoid_: origin, source

**Status**:
A string representing a mirror's current sync state. Values from the backend: `success`, `syncing`, `failed`, `pre-syncing`, `paused`, `proxy`, `unknown`. The backend also provides timestamps for last update, last sync start/end, and next scheduled sync.
_Avoid_: state, health

**Mirror Entry**:
The raw mirror object from the backend `mirrors.json`. Contains `name`, `status`, `upstream`, `size`, and timestamp fields. The frontend shows only mirrors present in this feed — no static config overrides.
_Avoid_: MirrorConfig (the old static config approach)

**Index Listing**:
A directory listing from the backend `index.json`. Each entry has `name`, `type` (directory/file), `mtime`, and optional `size`. Used by the download/ISO browser to show available files.
_Avoid_: file listing, directory listing

**Status Summary**:
An aggregated count of status codes across mirrors in a group or site. Displayed as colored badges (e.g., "3 success, 1 syncing").

**Help Doc**:
Per-mirror usage documentation stored in `mirrorz-docs` as YAML config + MDX content. Each doc has a title, ordered content blocks, and optional input variables for interactive code examples.
_Avoid_: guide, tutorial, manual

**Content Block**:
A named section within a help doc (e.g., `index`, `ubuntu`). Blocks can be overridden per-site in `mirrorz-docs/site/<SiteAbbr>/`.

**News Post**:
A time-stamped announcement with MDX content. Stored as date-prefixed directories under `content/news/`.

**Scoring**:
A ranking system for mirror sites based on availability and performance. Used to sort sites in the site list.

**Download List**:
A browsable view of mirror contents organized by category (OS, app, font) and distro. Each distro shows available download URLs from participating sites. Backend provides data in mirrorz format: `info: [{category, distro, urls: [{name, url}]}]` per site.
_Avoid_: ISO page, download page

**Pre-render**:
Build-time process that generates static HTML files for specific routes (help docs) by rendering the SPA shell + content into HTML. Ensures SEO crawlers see real content rather than an empty SPA shell.
_Avoid_: SSG, static generation (ambiguous — pre-render is specific to help docs only)
