# 05: News

**What to build:** A news section with a list page (`/news/`) and individual article pages (`/news/[slug]/`). News posts are plain Markdown files with frontmatter, compiled at build time and pre-rendered to static HTML for SEO.

**Blocked by:** 02-design-system-layout

**Status:** ready-for-agent

- [ ] `src/content/news/` directory with date-prefixed subdirectories (e.g., `2025-01-22/adding-mirrors.md`)
- [ ] Frontmatter schema: `title` (string), `date` (date), `summary` (string, optional)
- [ ] Build-time compilation: Markdown → HTML using a remark/rehype pipeline
- [ ] `NewsList` component: shows all posts sorted by date (newest first), with title, date, summary
- [ ] `NewsArticle` component: renders a single post with title, date, full content
- [ ] Route `/news/` renders the list
- [ ] Route `/news/[slug]/` renders an individual article (slug = directory name)
- [ ] Pre-render script generates static HTML for `/news/` and each `/news/[slug]/`
- [ ] Pre-rendered pages contain real content (not empty SPA shell)