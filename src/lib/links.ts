/**
 * Shared mirror link targets. One helper serves the mirror list and the sync
 * view so the two can never disagree on a mirror's address (spec ticket 09).
 */

/**
 * Link target for a mirror: `/{cname}/` for every mirror. A Git Mirror's `.git`
 * suffix is part of the cname and carries no URL semantics (CONTEXT.md).
 */
export function mirrorHref(cname: string): string {
  return `/${cname}/`;
}
