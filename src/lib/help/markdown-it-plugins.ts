/**
 * Custom markdown-it plugins for zdoc processing.
 *
 * - ztmpl fence rule: extracts ```{ztmpl ...} fences into code blocks
 * - ztmpl inline rule: extracts `{ztmpl …}` marker + code span into inline Templates
 * - heading-id rule: handles {#custom-id} on headings, generates slugs
 */

import MarkdownIt from 'markdown-it';
import type { StateCore } from 'markdown-it';
import GithubSlugger from 'github-slugger';
import type { ZDocInput, InputType, ToC, GlobalForm } from './types';
import { locatedError } from './errors';
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

export interface ExtractedInlineTemplate {
  id: string;
  template: string;
  lang?: string;
}

/**
 * Page-global id counters, shared across a page's Content Blocks so ids
 * stay stable regardless of block boundaries.
 */
export interface ParserCounters {
  codeBlocks: number;
  globalForms: number;
  inlineTemplates: number;
}

// ── Attribute parsing ───────────────────────────────────────

interface ZtmplAttrs {
  lang?: string;
  path?: string;
  input?: string;
  append?: boolean;
  global?: boolean;
}

/** Attributes honoured on fenced Templates (format spec "Template"). */
const FENCED_ATTRS = ['global', 'lang', 'input', 'path', 'append'];
/** Attributes honoured on inline Templates — only highlighting (format spec). */
const INLINE_ATTRS = ['lang'];

/**
 * Parse the `key="value"` attributes of a Template marker, honouring only
 * `allowed` keys. Unsupported keys are reported back instead of silently
 * dropped, so the caller can fail loudly with location info (spec
 * "Strictness" — nothing in the Template syntax may be ignored).
 */
function parseZtmplAttrs(
  info: string,
  allowed: readonly string[],
): { attrs: ZtmplAttrs; unsupported?: string } {
  const attrs: ZtmplAttrs = {};
  let unsupported: string | undefined;
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(info)) !== null) {
    const key = m[1]!;
    const val = m[2]!;
    if (!allowed.includes(key)) {
      if (unsupported === undefined) unsupported = key;
    } else if (key === 'lang') attrs.lang = val;
    else if (key === 'path') attrs.path = val;
    else if (key === 'input') attrs.input = val;
    else if (key === 'append') attrs.append = val === 'true';
    else if (key === 'global') attrs.global = val === 'true';
  }
  return { attrs, unsupported };
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

// ── Inline template detection ───────────────────────────────

/**
 * A `{ztmpl …}` marker at the very end of a text run that is immediately
 * followed by a code span is an inline Template (spec "Inline Templates").
 * Any other braces in text (`awk '{print $1}'`, `${var}`) are literal.
 */
const INLINE_MARKER_RE = /\{ztmpl([^{}]*)\}$/;

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
            throw locatedError(
              pageId,
              blockPath,
              line,
              `Expected header ID to be a valid slug. You specified: {#${customId}}`,
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
  globalForms: GlobalForm[];
  inlineTemplates: ExtractedInlineTemplate[];
}

/**
 * Create and return a configured markdown-it instance plus the extraction result.
 * The result object is populated during md.render() via the registered core rules.
 */
export function createZdocParser(
  inputDefs: Record<string, ZDocInput>,
  pageId: string,
  blockPath: string | null,
  counters: ParserCounters,
): { md: InstanceType<typeof MarkdownIt>; result: MarkdownItPluginResult } {
  const toc: ToC[] = [];
  const codeBlocks: ExtractedCodeBlock[] = [];
  const globalForms: GlobalForm[] = [];
  const inlineTemplates: ExtractedInlineTemplate[] = [];
  let codeBlockCounter = counters.codeBlocks;
  let globalFormCounter = counters.globalForms;
  let inlineTemplateCounter = counters.inlineTemplates;

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
      const line = token.map ? token.map[0] + 1 : '?';

      // Check for unsupported directives: {something ...} that isn't {ztmpl}
      const unsupportedMatch = info.match(/^\{(\w[\w-]*)/);
      if (unsupportedMatch && unsupportedMatch[1] !== 'ztmpl') {
        throw locatedError(
          pageId,
          blockPath,
          line,
          `Unsupported directive "${unsupportedMatch[1]}"`,
        );
      }

      // Not a ztmpl fence — leave it alone
      if (!info.startsWith('{ztmpl')) continue;

      const { attrs, unsupported } = parseZtmplAttrs(info, FENCED_ATTRS);
      if (unsupported !== undefined) {
        throw locatedError(pageId, blockPath, line, `Unsupported attribute "${unsupported}"`);
      }
      if (attrs.global && !attrs.input) {
        throw locatedError(
          pageId,
          blockPath,
          line,
          'Global directive must have input variables',
        );
      }
      if (attrs.append && !attrs.path) {
        throw locatedError(pageId, blockPath, line, 'Attribute "append" requires "path"');
      }

      // Build menus from input attribute
      const menusOrError = transpileInputToMenuValue(attrs.input, inputDefs);
      if (typeof menusOrError === 'string') {
        throw new Error(
          `Input "${menusOrError}" used in directive on page ${pageId}, block ${blockPath ?? '(inline)'} is not defined in [lang].yaml at line ${line}`,
        );
      }

      let placeholder: string;
      if (attrs.global) {
        // A global="true" Template renders its form at this position; its
        // body is ignored (format spec). Global without input is rejected
        // above.
        const formId = `globalmenu-${globalFormCounter++}`;
        globalForms.push({ id: formId, menus: menusOrError });
        placeholder = `<globalmenu id="${formId}" />`;
      } else {
        const blockId = `codeblock-${codeBlockCounter++}`;
        codeBlocks.push({
          id: blockId,
          template: token.content.trimEnd(),
          menus: menusOrError,
          lang: attrs.lang,
          filepath: attrs.path,
          append: attrs.append,
        });
        placeholder = `<codeblock id="${blockId}" />`;
      }

      // Mutate the fence token into an html_block placeholder
      token.type = 'html_block';
      token.tag = '';
      token.nesting = 0;
      token.markup = '';
      token.info = '';
      token.content = `${placeholder}\n`;
      token.children = null;
      token.block = true;
    }

    return true;
  });

  // Register ztmpl inline rule (populates inlineTemplates[])
  md.core.ruler.push('ztmpl-inline', (state: StateCore) => {
    const { tokens } = state;

    for (const token of tokens) {
      if (token.type !== 'inline' || !token.children) continue;
      const children = token.children;

      for (let i = 0; i < children.length - 1; i++) {
        const text = children[i]!;
        const code = children[i + 1]!;
        if (text.type !== 'text' || code.type !== 'code_inline') continue;

        // A `{ztmpl …}` marker immediately followed by a code span is an
        // inline Template; attributes go through the same parser as fences
        // but only `lang` is honoured here — anything else is rejected.
        const m = INLINE_MARKER_RE.exec(text.content);
        if (!m) continue;

        const { attrs, unsupported } = parseZtmplAttrs(m[1]!, INLINE_ATTRS);
        if (unsupported !== undefined) {
          const line = token.map ? token.map[0] + 1 : '?';
          throw locatedError(pageId, blockPath, line, `Unsupported attribute "${unsupported}"`);
        }
        const id = `codeinline-${inlineTemplateCounter++}`;
        inlineTemplates.push({ id, template: code.content, lang: attrs.lang });

        text.content = text.content.slice(0, -m[0].length);
        // Mutate the code span into an inline HTML placeholder.
        code.type = 'html_inline';
        code.tag = '';
        code.nesting = 0;
        code.markup = '';
        code.info = '';
        code.content = `<codeinline id="${id}"></codeinline>`;
        code.children = null;
      }
    }

    return true;
  });

  return { md, result: { toc, codeBlocks, globalForms, inlineTemplates } };
}