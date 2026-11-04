/**
 * The placeholder protocol between the help pipeline and the help page
 * (ADR 0007): the pipeline emits one placeholder tag at each Template's
 * position in the content HTML; the page splits the content at the block
 * placeholders and mounts components into the inline ones. Emission and
 * parsing live here together, so a new placeholder type is a one-place
 * edit — add its kind below and emit it with the matching helper.
 */

/** Block placeholder kinds: self-closing tags that split the content stream. */
const BLOCK_PLACEHOLDER_KINDS = ['codeblock', 'globalmenu'] as const;

export type BlockPlaceholderKind = (typeof BLOCK_PLACEHOLDER_KINDS)[number];

/**
 * Placeholder ids are `<kind>-<index>`; the page treats them as opaque keys
 * into its template/form maps (the page-data seam asserts the format).
 */
export function placeholderId(
  kind: BlockPlaceholderKind | typeof INLINE_PLACEHOLDER_TAG,
  index: number,
): string {
  return `${kind}-${index}`;
}

/** Emit the block placeholder for `id`. */
export function blockPlaceholder(kind: BlockPlaceholderKind, id: string): string {
  return `<${kind} id="${id}" />`;
}

/** Inline placeholder tag: the page mounts a component into these in place. */
export const INLINE_PLACEHOLDER_TAG = 'codeinline';

/** Emit the inline placeholder for `id`. */
export function inlinePlaceholder(id: string): string {
  return `<${INLINE_PLACEHOLDER_TAG} id="${id}"></${INLINE_PLACEHOLDER_TAG}>`;
}

/** CSS selector finding inline placeholder elements in mounted content HTML. */
export const INLINE_PLACEHOLDER_SELECTOR = `${INLINE_PLACEHOLDER_TAG}[id]`;

/** A fresh global regex matching block placeholders in content HTML. */
export function blockPlaceholderRegex(): RegExp {
  return new RegExp(`<(${BLOCK_PLACEHOLDER_KINDS.join('|')})\\s+id="([^"]+)"\\s*/>`, 'g');
}
