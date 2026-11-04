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

**Sync Run**:
One sync attempt of a mirror, bounded by its sync start and end timestamps. The feed keeps only the latest Sync Run (plus the last successful update time); a Sync Run with no end yet is still running.
_Avoid_: job, run, sync job

**Mirror Entry**:
The raw mirror object from the backend `mirrors.json`. Contains `name`, `status`, `upstream`, `size`, and timestamp fields. The frontend shows only mirrors present in this feed — no static config overrides.
_Avoid_: MirrorConfig (the old static config approach)

**Index Listing**:
A directory listing from the backend `index.json`. Each entry has `name`, `type` (directory/file), `mtime`, and optional `size`. Used by the download/ISO browser to show available files.
_Avoid_: file listing, directory listing

**Status Summary**:
An aggregated count of status codes across mirrors in a group or site. Displayed as colored badges (e.g., "3 success, 1 syncing").

**Age**:
The elapsed time since a mirror's last update. A large value means old content regardless of the mirror's Status.
_Avoid_: staleness, freshness

**Help Doc**:
Per-mirror usage documentation stored in `./zdoc` as YAML config + Markdown content. Each doc has a title, ordered content blocks, and optional input variables for interactive code examples.
_Avoid_: guide, tutorial, manual

**Content Block**:
A named section within a help doc (e.g., `index`, `ubuntu`). A Content Block can be shadowed or extended by a Site Override.

**Base Docs**:
The upstream help-doc content in `zdoc/global/` (the mirrorz-docs git submodule): one directory per mirror, each holding `<lang>.yaml` configs and `<block>.<lang>.md` content.
_Avoid_: global docs (collides with Global Input), upstream docs (collides with Upstream)

**Site Override**:
A per-deployment help-doc page or Content Block in `zdoc/local/` that shadows or extends the Base Docs entry of the same name. A page may exist only as a Site Override.
_Avoid_: local docs, site configs

**Template**:
A `{ztmpl}` block (fenced or inline) whose Mustache content renders into an interactive code example.
_Avoid_: code block (a Template looks like a code block but renders per input)

**Template Variable**:
A `{{name}}` placeholder inside a Template, resolved from input variables, Global Inputs, or the built-ins (`scheme`, `host`, `path`, `endpoint`, `sudo`).
_Avoid_: placeholder, mustache variable

**Global Input**:
An input introduced by a `global="true"` Template: its form appears at that spot in the document and its variables apply to every Template in the Help Doc.
_Avoid_: global variable, shared input

**Mirror Endpoint URL**:
The `{{endpoint}}` Template Variable: the base URL of the mirror's directory for this Help Doc, `{{scheme}}://{{host}}{{path}}`.
_Avoid_: endpoint (ambiguous), base URL

**Host**:
The mirror's domain name, the `{{host}}` Template Variable (e.g. `mirrors.xjtu.edu.cn`).
_Avoid_: endpoint, server

**Git Mirror**:
A mirror whose cname ends in `.git`, served as a git repository. Its URL shape is identical to any other mirror's; the `.git` suffix carries no URL semantics.
_Avoid_: git repo (a Git Mirror contains one)

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

## Help doc storage

Help docs live in `./zdoc`:

```
./zdoc/
├── global/   # Base Docs — the mirrorz-docs git submodule
└── local/    # Site Overrides — this deployment's additions and overrides
```

Note the name overlap: the `global/` directory means "base docs tree" and is unrelated to Global Inputs (the `global="true"` Template attribute). See ADR 0007 for how Global Inputs are wired through rendering.
