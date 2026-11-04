# 01: Prefactor — test seams and runner

**What to build:** The repo's first test suite: the `test` script runs Vitest and passes. The help pipeline's page-data builder is drivable from hand-written fixture docs trees (Base Docs + Site Overrides) with assertions on the produced page data, and the Template-render logic is extracted from the code-block component into a pure function the component merely calls. Characterization tests lock today's behaviour (inputs, switches, option-derived values, built-ins, sudo) so every later ticket lands verifiable. No behaviour changes in this ticket.

**Blocked by:** None (can start immediately)

**Status:** done (archived)

- [x] `test` script runs Vitest; suite is green
- [x] Fixture-tree harness drives the page-data builder; assertions cover content HTML, code blocks, headings and meta
- [x] Template rendering extracted to a pure function; the code-block component is a thin caller with unchanged UI
- [x] Characterization tests lock current variable resolution at the render seam (built-ins, sudo, select/switch/text inputs, option-derived values)
- [x] Characterization only — known spec gaps stay unfixed here (they land in tickets 04–08)
