# 09: Git Mirror URLs drop the `/git/` prefix

**What to build:** The mirror list and the sync view link every mirror — Git Mirrors included — at `/{cname}/`, through one shared link helper. The legacy `.git`-detection branching is deleted; `.git` remains only part of the cname (glossary: Git Mirror). The two views can no longer disagree on a mirror's address.

**Blocked by:** 01: Prefactor — test seams and runner

**Status:** ready-for-agent

- [ ] Mirror list links Git Mirrors at `/{cname}/`, like every other mirror
- [ ] Sync view links go through the same shared helper
- [ ] No `.git` special-casing remains in link construction
- [ ] Helper test: a Git Mirror cname maps to `/{cname}/` (e.g. `linux.git` → `/linux.git/`)
- [ ] Base Docs subpath references like `{{endpoint}}/git/…` remain untouched (unrelated to this URL shape)
