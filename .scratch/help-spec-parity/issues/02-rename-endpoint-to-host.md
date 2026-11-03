# 02: Rename the site-config `endpoint` field to `host`

**What to build:** The mirror-site config names its domain field `host` — the Host glossary term — and every reader follows, so it can no longer be confused with the Mirror Endpoint URL (`{{endpoint}}`). Optionally the code-block input prop for the domain is renamed to match. Pure rename; behaviour identical.

**Blocked by:** 01: Prefactor — test seams and runner

**Status:** ready-for-agent

- [ ] Config field and all readers renamed; nothing references the old name
- [ ] Type check and production build pass
- [ ] Test suite green with unchanged characterizations (this is a pure rename)
