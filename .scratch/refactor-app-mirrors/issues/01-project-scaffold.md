# 01: Project scaffold

**What to build:** A working Vite + React Router + TypeScript project with SCSS support, route structure for all planned pages, and a dev server that runs. The foundation everything else builds on.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Vite project initialized with React 19, TypeScript, SCSS support
- [ ] React Router configured with route placeholders for: `/`, `/download/[category]/[distro]/`, `/news/`, `/news/[slug]/`, `/help/[...slug]/`, `/about/`
- [ ] `vite.config.ts` with SCSS preprocessing enabled
- [ ] `tsconfig.json` with path aliases (e.g., `@/` → `src/`)
- [ ] `pnpm dev` starts the dev server and renders a placeholder page
- [ ] Basic `index.html` with root element