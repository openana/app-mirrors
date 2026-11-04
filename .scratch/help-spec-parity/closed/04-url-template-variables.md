# 04: URL Template Variables (`path`, Mirror Endpoint URL)

**What to build:** `{{path}}` renders the mirror's project directory (`/<cname>`) and `{{endpoint}}` is exactly scheme + Host + path, derived from one computation shared by fenced and inline Templates. Commands on the gentoo-portage, gentoo-portage-prefix and ghcup pages (rsync URIs, install-script URLs) become complete and copy-pasteable.

**Blocked by:** 01: Prefactor — test seams and runner, 02: Rename the site-config `endpoint` field to `host`

**Status:** done (archived)

- [x] `path` renders `/<cname>`
- [x] Mirror Endpoint URL derives from scheme, Host and path in a single computation
- [x] Render-seam tests: Host + path equals the Mirror Endpoint URL under both schemes
- [x] Regression: gentoo-portage rsync line and ghcup install-script URLs render complete
- [x] Deferred follow-up (not in this ticket): derive `path` from the selected Site's real mirrorz URL when it diverges from `cname`
