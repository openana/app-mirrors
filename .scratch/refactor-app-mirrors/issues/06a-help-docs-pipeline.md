# 06a: Help docs pipeline

**What to build:** The build-time compilation pipeline that reads help docs from the `mirrorz-docs` git submodule, parses YAML configs, compiles MDX with remark/rehype plugins, and renders Hogan templates for interactive code blocks. Pure logic layer — no UI, no routing. Output is a compilable React tree per help page.

**Blocked by:** 02-design-system-layout

**Status:** ready-for-agent

- [ ] `mirrorz-docs` added as git submodule at `zdoc/` (matching mirrorz-help's convention)
- [ ] YAML config parser: reads `<lang>.yaml` per page, extracts title, block ordering, input variable definitions
- [ ] Block loader: reads `<block>.<lang>.md` files from global and site-specific directories
- [ ] MDX compiler: compiles MDX with remark-gfm, rehype-external-links, custom header IDs
- [ ] Hogan template compiler: compiles code block content into Hogan templates for interactive rendering
- [ ] Input variable transpiler: converts YAML input definitions (option select, boolean, text) into menu structures
- [ ] Site override resolver: merges site-specific block overrides from `zdoc/site/<SiteAbbr>/`
- [ ] `getContentBySegments(segments)` function: given URL segments, returns compiled React tree + TOC + metadata
- [ ] `getAvailableSegments()` function: returns all valid route segments from `routes.json`
- [ ] Unit tests: given fixture YAML+MDX, assert compiled output structure