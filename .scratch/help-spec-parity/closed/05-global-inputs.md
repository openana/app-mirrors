# 05: Global Inputs

**What to build:** A `global="true"` Template renders its form inline at the position the author chose — its body is ignored, per the format spec — and selections in that form drive every Template on the Help Doc, including blocks that don't declare the input. Multiple Global Input forms on one page each appear in their own section and share one page-level selection store. Precedence: block inputs < Global Inputs < built-ins (ADR 0007).

**Blocked by:** 01: Prefactor — test seams and runner

**Status:** done (archived)

- [x] Global form renders at the directive position; the block body is ignored silently
- [x] Selections apply to every Template on the page (regression: astral-wheels `{{target}}`, mongodb `{{version}}` render non-empty in blocks that don't declare them)
- [x] Multiple Global Input forms work on one page (regression: erlang-solutions)
- [x] Page data carries the global forms and placeholders; the code-block collection keeps its existing shape (ADR 0007)
- [x] Precedence block < Global Input < built-ins covered at the render seam
- [x] Pre-render unaffected; a `global` block without `input` still parses here (the located error lands in ticket 07)
