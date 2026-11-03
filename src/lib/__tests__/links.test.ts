/**
 * Seam 3 (spec "Testing Decisions"): the shared mirror link helper. Every
 * mirror links at `/{cname}/` — a Git Mirror's `.git` suffix is part of the
 * cname and carries no URL semantics (CONTEXT.md "Git Mirror"; spec ticket 09).
 */

import { describe, expect, it } from 'vitest';
import { mirrorHref } from '../links';

describe('mirror link helper', () => {
  it('maps a Git Mirror cname to /{cname}/ with no /git/ prefix', () => {
    expect(mirrorHref('linux.git')).toBe('/linux.git/');
  });

  it('maps an ordinary cname to /{cname}/', () => {
    expect(mirrorHref('ubuntu')).toBe('/ubuntu/');
  });
});
