# 08: Theme toggle

**What to build:** A dark/light theme toggle in the sidebar settings panel. Detects system preference, allows manual override, persists choice in localStorage. Switches CSS custom properties across the entire site.

**Blocked by:** 02-design-system-layout

**Status:** ready-for-agent

- [ ] Theme toggle button in sidebar (settings panel or dedicated button)
- [ ] Three options: System (follows OS preference), Light, Dark
- [ ] `data-theme` attribute on `<html>` element switches CSS custom properties
- [ ] System preference detection via `prefers-color-scheme` media query
- [ ] System preference changes update theme in real-time (when set to "System")
- [ ] Manual choice persisted in `localStorage`
- [ ] On page load, reads `localStorage` first, falls back to system preference
- [ ] Light theme CSS custom properties fully defined (matching mirrorz's light theme)
- [ ] All existing pages/components render correctly in both themes