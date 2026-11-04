/**
 * In-content href rewriting for Help Doc HTML under HashRouter.
 *
 * HashRouter keeps the route in the URL fragment, so a bare "#anchor" href
 * replaces the whole hash route and drops the user back to the root page.
 * In-page anchors must therefore carry the route path:
 * "#anchor" → "#/help/debian/#anchor".
 *
 * Hrefs that already carry a route (anything starting with "#/") — the
 * parser's rewrites to other Help Docs (see helpDocHref in
 * markdown-it-plugins.ts) and already-rewritten anchors — pass through
 * untouched so nothing gets double-prefixed.
 */

export function anchorHref(pathname: string, anchor: string): string {
  return `#${pathname}#${anchor.replace(/^#/, '')}`;
}

/** Rewrites in-page anchors in rendered HTML so they survive HashRouter. */
export function rewriteAnchorLinks(html: string, pathname: string): string {
  return html.replace(/href="#([^"]*)"/g, (match, anchor: string) =>
    anchor.startsWith('/') ? match : `href="${anchorHref(pathname, anchor)}"`,
  );
}
