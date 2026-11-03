# 03: Base Docs and Site Overrides storage layout

**What to build:** The mirrorz-docs submodule lives under `zdoc/global/` (Base Docs) and this deployment's Site Overrides live under `zdoc/local/` (glossary: Help doc storage). A Site Override shadows or extends the Base Docs entry of the same name — a block or a whole page. The page list is the union of both trees, so a help page may exist only as a Site Override. Pre-rendered help pages keep building, and the submodule keeps updating cleanly after the move.

**Blocked by:** 01: Prefactor — test seams and runner

**Status:** ready-for-agent

- [ ] Submodule relocated to `zdoc/global/`; submodule configuration correct; submodule update works and reports a clean tree
- [ ] `zdoc/local/` holds Site Overrides; an override shadows or extends the Base Docs block/page of the same name
- [ ] A page defined only under `zdoc/local/` renders end to end (config, blocks, interactive Templates)
- [ ] Page enumeration is the union of both trees
- [ ] Pre-rendered help pages build from the new layout
- [ ] Pipeline-seam tests cover shadowing and the local-only page
