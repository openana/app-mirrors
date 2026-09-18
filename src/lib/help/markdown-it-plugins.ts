/**
 * Custom markdown-it plugins for zdoc processing.
 *
 * - ztmpl fence rule: extracts ```{ztmpl ...} fences into code blocks
 * - heading-id rule: handles {#custom-id} on headings, generates slugs
 */

import MarkdownIt from 'markdown-it';
import type { StateCore } from 'markdown-it';
import GithubSlugger from 'github-slugger';
import type { ZDocInput, InputType, ToC } from './types';
import { transpileInput } from './parse-markdown';

// ── Shared types ────────────────────────────────────────────

export interface ExtractedCodeBlock {
  id: string;
  template: string;
  menus: InputType[];
  lang?: string;
  filepath?: string;
  append?: boolean;
}

// ── Attribute parsing ───────────────────────────────────────

interface ZtmplAttrs {
  lang?: string;
  path?: string;
  input?: string;
  append?: boolean;
}

function parseZtmplAttrs(info: string): ZtmplAttrs {
  const attrs: ZtmplAttrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(info)) !== null) {
    const key = m[1]!;
    const val = m[2]!;
    if (key === 'lang') attrs.lang = val;
    else if (key === 'path') attrs.path = val;
    else if (key === 'input') attrs.input = val;
    else if (key === 'append') attrs.append = val === 'true';
  }
  return attrs;
}

// ── Input transpilation (ported from reference) ─────────────

/**
 * Parse the `input="name1 name2"` attribute value into InputType[],
 * validating that each name exists in the config's input definitions.
 * Returns the array on success, or the missing input name on failure
 * (caller throws with location info).
 */
export function transpileInputToMenuValue(
  input: string | null | undefined,
  inputDefs: Record<string, ZDocInput>,
): InputType[] | string {
  if (!input) return [];
  const inputNames = input.split(/\s+/);
  const missingInput = inputNames.find(
    (name) => inputDefs[name] === undefined,
  );
  if (missingInput !== undefined) {
    return missingInput;
  }
  return inputNames.map((name) => transpileInput(name, inputDefs[name]!));
}

// ── heading-id rule ─────────────────────────────────────────

const CUSTOM_ID_RE = /\s*\{#([^}]+)\}\s*$/;

/**
 * markdown-it core rule that:
 * 1. Strips {#custom-id} from heading text and uses it as the heading's id
 * 2. For headings without custom ids, generates a slug via github-slugger
 * 3. Collects all headings into the toc[] array
 */
function headingIdRule(
  toc: ToC[],
  pageId: string,
  blockPath: string | null,
): (state: StateCore) => boolean {
  return (state) => {
    const slugger = new GithubSlugger();
    const { tokens } = state;

    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i]!;
      if (open.type !== 'heading_open') continue;

      // The inline content is the next token
      const inline = tokens[i + 1];
      if (!inline || inline.type !== 'inline') continue;

      // Extract plain text from children
      const children = (inline.children ?? []) as Array<{type: string; content?: string}>;
      const textChildren = children.filter(
        (c) => c.type === 'text' || c.type === 'code_inline',
      );
      const rawText = textChildren.map((c) => c.content ?? '').join('');

      // Check for custom id on the last text child
      let customId: string | undefined;
      const lastChild = textChildren[textChildren.length - 1];
      if (lastChild) {
        const m = CUSTOM_ID_RE.exec(lastChild.content ?? '');
        if (m) {
          customId = m[1]!;
          // Validate it's a valid slug
          if (customId !== slugger.slug(customId)) {
            const line = open.map ? open.map[0] + 1 : '?';
            throw new Error(
              `Expected header ID to be a valid slug. You specified: {#${customId}} on page ${pageId}, block ${blockPath ?? '(inline)'} at line ${line}`,
            );
          }
          // Strip the {#id} from the text content
          lastChild.content = (lastChild.content ?? '').replace(CUSTOM_ID_RE, '');
        }
      }

      const id = customId ?? slugger.slug(rawText);

      // Set id attribute on the heading token
      open.attrSet('id', id);

      // Determine heading depth from tag (h1/h2/h3)
      const depth = parseInt(open.tag.replace('h', ''), 10) || 0;

      // Get the cleaned text for ToC
      const cleanText = customId
        ? rawText.replace(CUSTOM_ID_RE, '')
        : rawText;

      toc.push({
        url: `#${id}`,
        content: cleanText,
        depth,
      });
    }

    return true;
  };
}

// ── Combined parser factory ─────────────────────────────────

export interface MarkdownItPluginResult {
  toc: ToC[];
  codeBlocks: ExtractedCodeBlock[];
}

/**
 * Create and return a configured markdown-it instance plus the extraction result.
 * The result object is populated during md.render() via the registered core rules.
 */
export function createZdocParser(
  inputDefs: Record<string, ZDocInput>,
  pageId: string,
  blockPath: string | null,
  startCounter: number = 0,
): { md: InstanceType<typeof MarkdownIt>; result: MarkdownItPluginResult } {
  const toc: ToC[] = [];
  const codeBlocks: ExtractedCodeBlock[] = [];
  let counter = startCounter;

  const md = new MarkdownIt({ html: true }).enable('table');

  // Register heading-id rule (populates toc[])
  md.core.ruler.push('heading-id-collect', headingIdRule(toc, pageId, blockPath));

  // Register ztmpl fence rule (populates codeBlocks[], replaces fence tokens)
  md.core.ruler.push('ztmpl-fence', (state: StateCore) => {
    const { tokens } = state;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (token.type !== 'fence') continue;

      const info = token.info.trim();

      // Check for unsupported directives: {something ...} that isn't {ztmpl}
      const unsupportedMatch = info.match(/^\{(\w[\w-]*)/);
      if (unsupportedMatch && unsupportedMatch[1] !== 'ztmpl') {
        const line = token.map ? token.map[0] + 1 : '?';
        throw new Error(
          `Unsupported directive "${unsupportedMatch[1]}" on page ${pageId}, block ${blockPath ?? '(inline)'} at line ${line}`,
        );
      }

      // Not a ztmpl fence — leave it alone
      if (!info.startsWith('{ztmpl')) continue;

      const attrs = parseZtmplAttrs(info);
      const blockId = `codeblock-${counter++}`;

      // Build menus from input attribute
      const menusOrError = transpileInputToMenuValue(attrs.input, inputDefs);
      if (typeof menusOrError === 'string') {
        const line = token.map ? token.map[0] + 1 : '?';
        throw new Error(
          `Input "${menusOrError}" used in directive on page ${pageId}, block ${blockPath ?? '(inline)'} is not defined in [lang].yaml at line ${line}`,
        );
      }

      codeBlocks.push({
        id: blockId,
        template: token.content.trimEnd(),
        menus: menusOrError,
        lang: attrs.lang,
        filepath: attrs.path,
        append: attrs.append,
      });

      // Mutate the fence token into an html_block placeholder
      token.type = 'html_block';
      token.tag = '';
      token.nesting = 0;
      token.markup = '';
      token.info = '';
      token.content = `<codeblock id="${blockId}" />\n`;
      token.children = null;
      token.block = true;
    }

    return true;
  });

  return { md, result: { toc, codeBlocks } };
}