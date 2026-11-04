# 03: Base Docs and Site Overrides storage layout

**What to build:** The mirrorz-docs submodule lives under `zdoc/global/` (Base Docs) and this deployment's Site Overrides live under `zdoc/local/` (glossary: Help doc storage). A Site Override shadows or extends the Base Docs entry of the same name — a block or a whole page. The page list is the union of both trees, so a help page may exist only as a Site Override. Pre-rendered help pages keep building, and the submodule keeps updating cleanly after the move.

**Blocked by:** 01: Prefactor — test seams and runner

**Status:** done (archived)

- [x] Submodule relocated to `zdoc/global/`; submodule configuration correct; submodule update works and reports a clean tree
- [x] `zdoc/local/` holds Site Overrides; an override shadows or extends the Base Docs block/page of the same name
- [x] A page defined only under `zdoc/local/` renders end to end (config, blocks, interactive Templates)
- [x] Page enumeration is the union of both trees
- [x] Pre-rendered help pages build from the new layout
- [x] Pipeline-seam tests cover shadowing and the local-only page
