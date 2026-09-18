# Port mirrorz's SCSS design system directly

We chose to port mirrorz's SCSS tokens, variables, and component styles as-is rather than recreating the look with Tailwind or another utility framework. mirrorz's design system is ~500 lines of clean, self-contained SCSS using CSS custom properties for theming (dark/light). Mixing Tailwind into it would create two competing styling systems. Astro compiles SCSS natively, so there's no tooling cost.
