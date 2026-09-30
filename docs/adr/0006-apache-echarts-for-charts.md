# Apache ECharts for charts, tree-shaken and lazy-loaded

The sync page needs two time-based charts (a sync timeline and staleness bars) over the
mirror feed. We chose Apache ECharts over hand-rolled SVG and over recharts: it gives
stable, adaptive chart styling and behavior (responsive resize, crisp time axes,
tooltips) out of the box instead of us owning every axis and tooltip edge case. It is
imported tree-shaken via `echarts/core` and lazy-loaded with the sync route so it stays
out of the initial bundle; status colors are mapped from the design tokens
(`--st-*`) so badge semantics and dark mode stay consistent. The `custom` series
(`renderItem`) is what makes the Gantt-style timeline possible at all.

Considered: plain SVG (no dependency, but axes, tooltips, resize, and time-scale
clamping become ours to maintain); recharts (React-idiomatic, but drags in d3 and offers
less control for a custom Gantt series).
