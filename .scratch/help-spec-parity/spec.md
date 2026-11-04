# Spec: Help Doc spec parity, storage layout, and Git Mirror URLs

**Labels**: `ready-for-agent`

## Problem Statement

Help pages on this mirror site silently misrender or drop content that the upstream mirrorz-docs format promises. Global Inputs — version pickers that should apply to a whole page — either vanish or leave empty placeholders in the generated commands (e.g. MongoDB's `{{version}}`, Astral's `{{target}}`). Inline Templates in prose show raw `{{endpoint}}` text instead of the reader's mirror URL. `rsync` and download-URL examples omit the project directory because `{{path}}` renders empty. HTTPS-only projects can show http URLs the server doesn't serve. A doc author's typo in a template attribute is silently ignored instead of reported. Meanwhile, Site Overrides have nowhere clean to live: the Base Docs submodule occupies the whole `zdoc/` tree, so deployment-specific content risks being lost or polluting upstream. And Git Mirrors are linked under a legacy `/git/` URL prefix the server no longer uses, sending readers to dead links.

## Solution

A help doc reader gets fully faithful mirrorz-docs rendering: page-wide forms appear exactly where the author placed them and drive every interactive command block on the page; inline template values in prose render with the same variables as code blocks; URL variables (`scheme`, `host`, `path`, Mirror Endpoint URL) are complete and always mutually consistent; HTTPS-only projects are enforced with a clear, visibly disabled toggle. Doc authors get loud, located errors for anything the parser can't honour. A mirror operator keeps Site Overrides in `zdoc/local/`, outside the Base Docs submodule at `zdoc/global/`, and can ship deployment-only pages. Git Mirrors are linked at the same `/{cname}/` shape as every other mirror. The whole behaviour is locked by tests at two boundaries.

## User Stories

1. As a help doc reader, I want each Global Input form to appear at the exact spot in the document where the author placed it, so that the choice is explained in context before the commands that use it.
2. As a help doc reader, I want a Global Input selection to apply to every interactive command block on the page, so that I configure a version once instead of repeating the choice in each block.
3. As a help doc reader, I want my Global Input selections to persist while I scroll through the page, so that all commands on the page describe one coherent setup.
4. As a help doc reader, I want pages with several Global Inputs (e.g. the Erlang solutions page with four) to show each form in its own section, so that I can tell which choice affects which commands.
5. As a help doc reader, I want block-local inputs (e.g. "Enable Source", "Use nonfree Repo") to keep working next to Global Inputs, so that per-block fine-tuning is still possible.
6. As a help doc reader, I want mirror URL values to always reflect my chosen mirror and scheme no matter what any form contains, so that a form input can never corrupt a generated URL.
7. As a help doc reader, I want every form pre-selected with sensible defaults, so that the code is correct before I touch anything.
8. As a help doc reader, I want switch-style inputs to include or comment out whole lines (e.g. `deb-src`, non-free components), so that I can copy a configuration matching my policy.
9. As a help doc reader, I want an option to carry its companion values (e.g. a Debian release with its security-suite suffix), so that non-symmetric options render correctly.
10. As a help doc reader, I want inline values in prose (e.g. `JULIAUP_SERVER=<url>`, `sync-uri`) to show my selected mirror, scheme and project path, so that single copy-pasted values match the rest of the page.
11. As a help doc reader, I want inline rendered values to look like code and be syntax-highlighted when the author specifies a language, so that they read naturally inside sentences.
12. As a help doc reader, I want ordinary code with braces (`awk '{print $1}'`, `${var}`) to render verbatim, so that templating never mangles real shell text.
13. As a help doc reader, I want HTTPS-only mirrors to show `https` URLs everywhere on their help page, so that I never copy an http URL that fails.
14. As a help doc reader, I want the HTTPS switch disabled with a short explanation on HTTPS-only pages, so that an unresponsive control doesn't confuse me.
15. As a help doc reader, I want commands built from the host and project path (`rsync://…`, install-script URLs) to include the project directory, so that the commands actually reach the mirrored files.
16. As a help doc reader, I want the full mirror base URL used in commands to equal scheme + host + project path exactly, so that every example on the page agrees on one address.
17. As a help doc reader, I want the sudo switch to keep prefixing privileged commands (or drop them), so that I can paste commands matching my privileges.
18. As a help doc reader, I want to click a Git Mirror in the mirror list and land on its repository listing, so that I can browse or clone it like any other mirror.
19. As a help doc reader, I want Git Mirror URLs shaped like every other mirror URL, so that I can predict addresses without knowing server history.
20. As a help doc reader, I want the sync page's links to a mirror to equal the mirror list's link to the same mirror, so that one mirror never has two addresses in one app.
21. As a help doc author, I want an error naming page, block and line when I use a `global` template without inputs, an unknown template attribute, a `default` that isn't an option, or `append` without a file path, so that I fix the doc before it ships.
22. As a help doc author, I want `global` block bodies ignored (as the format specifies), so that docs written for mirrorz-docs behave identically here.
23. As a help doc author, I want content authored and tested against mirrorz-docs to render the same here — form placement, variable resolution, non-symmetric options — so that this site never becomes a special case.
24. As a help doc author, I want existing strict errors (unsupported directives, undefined inputs) to keep their located message style, so that one consistent error convention covers the whole format.
25. As a mirror operator, I want Site Overrides stored outside the Base Docs submodule, so that deployment-specific content survives submodule updates.
26. As a mirror operator, I want a Site Override block to shadow or extend the Base Docs block of the same name, so that I can adjust wording or add a section without forking upstream.
27. As a mirror operator, I want to define a help page that exists only on my deployment, so that site-only instructions don't pollute the upstream project.
28. As a mirror operator, I want the `./zdoc` storage layout written down in the project glossary, so that humans and agents share one vocabulary for Base Docs and Site Overrides.
29. As a mirror operator, I want the git-mirror link change applied everywhere mirrors are linked, so that no view keeps serving dead `/git/` links.
30. As a developer, I want the site config's domain field named "host", so that it stops being confused with the Mirror Endpoint URL.
31. As a developer, I want the mirror base URL computed from scheme, host and path in one place, so that `{{path}}` and `{{endpoint}}` can never drift apart again.
32. As a developer, I want the parser to fail loudly on anything in the template syntax it doesn't implement, so that silent spec drift (like the dropped `global` attribute) can't recur.
33. As a developer, I want tests at the pipeline and template-render boundaries over fixture docs, so that future format changes are regression-locked.
34. As a search engine crawler, I want help pages pre-rendered with their real content under the new storage layout, so that indexing keeps working unchanged.

## Implementation Decisions

- **Storage layout (decided with the operator):** the Base Docs git submodule moves under `zdoc/global/`; Site Overrides live in `zdoc/local/`. A page is resolved with Site Overrides shadowing Base Docs; the page list is the union of both trees, so a page may exist only as a Site Override. The pre-render build script consumes the same resolution. Documented in the glossary ("Help doc storage"), including the warning that the `global/` directory name is unrelated to Global Inputs.
- **Global Inputs (per ADR 0007):** a `global="true"` Template renders its form inline at the block's position and its body is ignored. The help page data gains a `globalForms` collection of `{ id, menus }` entries alongside the existing code-block collection; the content HTML carries `<globalmenu id>` placeholders. A page-level variable store feeds every Template render with precedence: block inputs < Global Inputs < built-ins (`scheme`, `host`, `path`, Mirror Endpoint URL, `sudo`). This mirrors the reference consumer's architecture because upstream content is authored and tested against it.
- **Inline Templates:** a `{ztmpl …}` marker immediately followed by a code span is a Template; supported attribute is `lang` (highlighting). It renders through the same mustache engine and variable context as fenced Templates. Any other braces in text are literal — arbitrary inline roles are not detected or rejected.
- **Protocol enforcement:** the config gains `filter: { scheme }`. On a filtered Help Doc the chosen scheme forces `scheme` and the Mirror Endpoint URL everywhere, and the HTTPS toggle is disabled with a localized hint (zh + en).
- **URL variables:** `path` is `/<cname>` and the Mirror Endpoint URL is exactly `scheme + "://" + host + path`, derived from one computation at render time. Extra built-ins beyond the spec (`sudoE`, `http_protocol`) are kept as harmless extensions.
- **Strictness:** unknown template attributes, `global` without `input`, `default` outside the option set, and `append` without a file path all raise errors carrying page, block and line info, in the existing error style. Option values may be non-string (e.g. a boolean `sid` flag), and the input typings are widened accordingly. `global` block bodies are ignored silently per the format spec.
- **`append`:** remains parsed and passed through the page data with no consumer; quick-config copy behaviour is deferred (see Out of Scope).
- **Naming:** the mirror-site config field `endpoint` is renamed `host` (the Host glossary term), and `{{endpoint}}` is documented as the Mirror Endpoint URL. All readers of the field follow the rename.
- **Git Mirrors:** every mirror links at `/{cname}/` including `.git` cnames; a single shared link helper serves both the mirror list and the sync view, and the `.git`-detection branching is deleted. The `.git` suffix remains only part of the cname (glossary: Git Mirror). Subpath references like `{{endpoint}}/git/…` inside Base Docs content are unrelated and untouched.
- **Pre-render:** keeps working unchanged against the new layout; only its docs-root resolution moves.

## Testing Decisions

- A good test asserts only external behavior at module boundaries: the shape and content of the produced help page data, and the text a Template renders to — never markdown-it token internals, component state, or store bookkeeping.
- **Seam 1 (existing, highest):** the help pipeline's page-data builder, driven with small fixture trees (Base Docs + Site Overrides) and asserted on the returned page data — content HTML, code blocks, global forms, table of contents, meta. Covers storage layout, local-only pages, Global Input extraction, inline Templates, strictness errors, and `filter` plumbing.
- **Seam 2 (one new seam, proposed at the highest point short of a DOM):** a pure "render a Template given a selection store" function extracted from the code-block component (the component becomes a thin caller). Covers Template Variable resolution and precedence, `path`/Mirror Endpoint URL correctness, forced scheme, and sudo handling. Component/DOM testing is deliberately not introduced.
- **Seam 3 (existing):** the shared mirror link helper for Git Mirror URL shape (`linux.git` → `/linux.git/`).
- **Test runner:** Vitest (new — the repo currently has no test infrastructure; chosen to match the existing Vite toolchain). No prior art exists in the repo; these are the first tests.
- **Fixtures:** hand-written miniature doc trees for each behavior; plus regression checks against real Base Docs pages — Debian (multi-input, non-symmetric options), Astral (Global Input used across blocks), FreeBSD (inline Templates), Erlang Solutions (multiple Global Input forms).
- Negative cases assert the error message carries page, block and line info.

## Out of Scope

- Quick-config / `tee`-based copy for file-path Templates and `append` semantics (deferred issue in this tracker).
- Deriving `path` from the selected Site's real mirrorz URL when it diverges from `cname` (recorded follow-up).
- Detecting or rejecting arbitrary inline MyST roles (only inline `ztmpl` is handled).
- Renaming `zdoc/global/` to avoid the "global" name overlap with Global Inputs (documented instead, per operator decision).
- Any changes to Base Docs content, including upstream's hardcoded TUNA URLs and `{{endpoint}}/git/…` subpaths.
- Help content translation, other pages (news, downloads, sync), and visual redesign of the forms.
- Pre-render/SEO behaviour changes beyond continuing to work.

## Further Notes

- All decisions come from two grilling rounds; provenance in the questions Q1–Q12 of the session. ADR 0007 records the Global Input architecture and variable precedence; `CONTEXT.md` records the glossary terms and the `./zdoc` layout.
- Work items live alongside this spec in this tracker; the suggested order starts with the storage layout move since the pipeline work depends on it.
- The `/git/` removal assumes the server now serves Git Mirrors at `/{cname}/` — confirmed by the operator during grilling.
- The Vitest choice is swappable for `node:test` if zero new dependencies is preferred; the seam design does not depend on the runner.
