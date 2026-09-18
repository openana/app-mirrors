# Use Astro as the framework

We chose Astro over Next.js and Vite+React Router because the site is content-heavy and SEO matters. Astro generates static HTML per page (every help doc and news post gets its own `<html>`), has native MDX support, and allows React components as islands for interactive parts (mirror list, search, theme toggle). Next.js was rejected because its RSC/App Router complexity is unnecessary for a static site, and its contentlayer2 dependency is fragile. Vite+React Router was rejected because it doesn't generate per-page HTML, which hurts SEO for the ~200 help docs.
