# 08: `filter.scheme` protocol enforcement

**What to build:** A Help Doc with `filter: scheme: https` always shows https URLs regardless of the reader's toggle, and the HTTPS toggle is disabled on that page with a short localized hint (zh + en). The pypi, crates.io-index, pytorch and other filtered projects can no longer show http URLs the server doesn't serve.

**Blocked by:** 04: URL Template Variables (`path`, Mirror Endpoint URL)

**Status:** done (archived)

- [x] Filtered scheme forces `scheme` and the Mirror Endpoint URL everywhere (fenced and inline Templates)
- [x] HTTPS toggle disabled on filtered pages with a localized hint
- [x] Unfiltered pages behave exactly as before
- [x] Regressions: pypi, crates.io-index, pytorch pages render https-only
- [x] Tests at the render seam (forced scheme) and the pipeline seam (filter plumbing into page meta)
