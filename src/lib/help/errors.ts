/**
 * The help format's one located-error convention (spec story 24):
 * `<what's wrong> on page <pageId>, block <source file | '(inline)'> at
 * line <line>`. The "block" slot carries the source file path — the Content
 * Block's markdown file, or the page's config file for config-level errors
 * (conventions: blockPath is the block's file path).
 */

export function locatedError(
  page: string,
  block: string | null,
  line: number | string,
  message: string,
): Error {
  return new Error(
    `${message} on page ${page}, block ${block ?? '(inline)'} at line ${line}`,
  );
}
