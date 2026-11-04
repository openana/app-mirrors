/**
 * In-content href rewriting under HashRouter (render seam): bare "#anchor"
 * links carry the route path; route-carrying "#/..." hrefs — including the
 * parser's rewrites to other Help Docs — must pass through unchanged or
 * they would be double-prefixed.
 */

import { describe, expect, it } from 'vitest';
import { anchorHref, rewriteAnchorLinks } from '../anchors';

describe('rewriteAnchorLinks', () => {
  it('carries the route path on bare in-page anchors', () => {
    expect(rewriteAnchorLinks('<a href="#config">x</a>', '/help/alpha/')).toBe(
      '<a href="#/help/alpha/#config">x</a>',
    );
  });

  it('leaves links to other Help Docs untouched', () => {
    const html = '<a href="#/help/beta/">x</a>';
    expect(rewriteAnchorLinks(html, '/help/alpha/')).toBe(html);
  });

  it('leaves already-rewritten anchors untouched', () => {
    const html = '<a href="#/help/alpha/#config">x</a>';
    expect(rewriteAnchorLinks(html, '/help/alpha/')).toBe(html);
  });
});

describe('anchorHref', () => {
  it('joins route path and anchor with the hash-route convention', () => {
    expect(anchorHref('/help/debian/', 'config')).toBe('#/help/debian/#config');
    expect(anchorHref('/help/debian/', '#config')).toBe('#/help/debian/#config');
  });
});
