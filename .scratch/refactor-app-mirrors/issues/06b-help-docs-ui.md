# 06b: Help docs UI

**What to build:** The help page layout and presentation layer — a two-column page with TOC sidebar, mirror site selector, enhanced codeblock components with interactive menus, and pre-rendering to static HTML. Depends on the pipeline from T06a for compiled content.

**Blocked by:** 06a-help-docs-pipeline

**Status:** ready-for-agent

- [ ] `HelpPage` component: two-column layout with TOC sidebar + main content area
- [ ] TOC sidebar: renders table of contents from compiled data, highlights current section on scroll
- [ ] Mirror site selector: dropdown to switch between site-specific content variants
- [ ] Enhanced codeblock component: renders interactive code blocks with option menus (user selects distro version, commands update)
- [ ] Code inline component: renders inline code with template substitution
- [ ] `CodeBlock` and `CodeInline` components wired to Hogan template rendering from T06a
- [ ] Route `/help/[...slug]/` renders help pages using `getContentBySegments()`
- [ ] Route `/help/` shows an index of available help pages
- [ ] Pre-render script generates static HTML for all routes from `getAvailableSegments()`
- [ ] Pre-rendered help pages contain real content (not empty SPA shell)
- [ ] Responsive layout: TOC collapses to dropdown on mobile