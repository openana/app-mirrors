# 04: Download browser

**What to build:** A browsable download page (`/download/`) where users navigate by category (OS, app, font), select a distro, and see download URLs from all mirror sites. Mirrors the mirrorz ISO page structure.

**Blocked by:** 02-design-system-layout

**Status:** ready-for-agent

- [ ] `DownloadInfo` type: `{category, distro, urls: [{name, url}]}`
- [ ] `SiteData` type: `{site: {abbr, url}, info: DownloadInfo[]}`
- [ ] `fetchDownloadList(apiUrl)` function
- [ ] Category tabs (OS, app, font) with active state styling
- [ ] Distro sidebar within each category, with filter/search input
- [ ] Per-site URL lists: for the selected distro, show each site's available download links
- [ ] URL links open in new tab
- [ ] Default route `/download/` redirects to `/download/os/ubuntu` (or first available distro)
- [ ] Responsive layout: sidebar collapses on mobile