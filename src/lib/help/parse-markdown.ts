/**
 * Help docs pipeline — reads from zdoc/ directory, parses YAML configs,
 * and compiles content into a structured format for the frontend.
 *
 * Uses markdown-it with custom plugins for proper CommonMark parsing,
 * replacing the previous regex-based approach.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import type {
  ZDocConfig,
  ZDocConfigOnDisk,
  ZDocInput,
  MenuValue,
  InputType,
  HelpPageData,
  GlobalForm,
  InlineTemplate,
  ToC,
} from './types';
import {
  createZdocParser,
  type ExtractedCodeBlock,
  type ExtractedInlineTemplate,
  type ParserCounters,
} from './markdown-it-plugins';
import { locatedError } from './errors';

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

// ── File loading ────────────────────────────────────────────

/** A parsed YAML config file, with its source kept for located errors. */
interface LoadedYaml {
  data: ZDocConfigOnDisk | null;
  doc: ReturnType<typeof parseDocument>;
  lineCounter: LineCounter;
  path: string;
}

async function readYamlFile(p: string): Promise<LoadedYaml | null> {
  let content: string;
  try {
    content = await fs.readFile(p, 'utf-8');
  } catch (err) {
    if (!isErrnoException(err) || err.code !== 'ENOENT') throw err;
    return null;
  }
  const lineCounter = new LineCounter();
  const doc = parseDocument(content, { lineCounter });
  if (doc.errors.length > 0) throw doc.errors[0];
  return { data: doc.toJS() as ZDocConfigOnDisk | null, doc, lineCounter, path: p };
}

/**
 * A `default` must be one of the input's options (format contract). The
 * error carries page, config file and line in the located error style —
 * the line is the real YAML line of the offending `default`, located via
 * the `yaml` package's line counter (spec "Strictness").
 */
function validateInputDefaults(
  inputs: Record<string, ZDocInput>,
  sources: Map<string, LoadedYaml>,
  page: string,
): void {
  for (const [name, input] of Object.entries(inputs)) {
    if (!('option' in input)) continue;
    const def = input.default;
    if (def == null) continue;
    if (Object.prototype.hasOwnProperty.call(input.option, def)) continue;
    const source = sources.get(name)!;
    const node = source.doc.getIn(['input', name, 'default'], true) as
      | { range?: [number, number, number] }
      | null
      | undefined;
    const line = node?.range ? source.lineCounter.linePos(node.range[0]).line : '?';
    throw locatedError(
      page,
      source.path,
      line,
      `Default "${def}" is not an option of input "${name}"`,
    );
  }
}

async function loadFile(
  docsDir: string,
  page: string,
  file: string,
  defaultValue?: string,
): Promise<{ path: string | null; content: string }> {
  // On-disk tree names keep their historical spelling (CONTEXT.md "Help
  // doc storage"): `local/` is Site Overrides, `global/` is Base Docs.
  const localPath = path.join(docsDir, 'local', page, file);
  const basePath = path.join(docsDir, 'global', page, file);

  for (const p of [localPath, basePath]) {
    try {
      return { path: p, content: await fs.readFile(p, 'utf-8') };
    } catch (err) {
      if (!isErrnoException(err) || err.code !== 'ENOENT') throw err;
    }
  }
  if (defaultValue !== undefined) {
    return { path: null, content: defaultValue };
  }
  throw new Error(`file ${file} not found in page ${page}`);
}

async function loadConf(
  docsDir: string,
  page: string,
  language: string,
): Promise<ZDocConfig | null> {
  const localPath = path.join(docsDir, 'local', page, `${language}.yaml`);
  const basePath = path.join(docsDir, 'global', page, `${language}.yaml`);

  const local = await readYamlFile(localPath);
  const base = await readYamlFile(basePath);

  if (!local && !base) return null;

  const localConf = local?.data ?? null;
  const baseConf = base?.data ?? null;

  const inputsGiven = { ...baseConf?.input, ...localConf?.input };
  const inputs: Record<string, ZDocInput> = {};
  const inputSources = new Map<string, LoadedYaml>();
  for (const [name, value] of Object.entries(inputsGiven)) {
    if (value === null) continue;
    inputs[name] = value as ZDocInput;
    // The surviving definition after the merge is the one to blame for it.
    inputSources.set(name, local && localConf?.input?.[name] != null ? local : base!);
  }

  validateInputDefaults(inputs, inputSources, page);

  const config = {
    block: ['index'],
    ...baseConf,
    ...localConf,
    input: inputs,
    name: page,
  };

  if (config._ === undefined) {
    throw new Error(`Config file ${language}.yaml for page ${page} must have a title field "_"`);
  }

  return { _: config._!, ...config } as ZDocConfig;
}

// ── Input transpilation ─────────────────────────────────────

export function transpileInput(name: string, input: ZDocInput): InputType {
  if ('option' in input) {
    const items: [string, MenuValue][] = [];
    const defaultVal = input.default;

    // The default is honoured when it names an option, even if that option
    // carries no entry (its key is then the label).
    if (defaultVal != null && Object.prototype.hasOwnProperty.call(input.option, defaultVal)) {
      const opt = input.option[defaultVal];
      const title = opt?._ || defaultVal;
      const values: MenuValue = { [name]: defaultVal };
      Object.entries(opt || {}).forEach(([k, v]) => {
        if (k !== '_' && v !== undefined) values[k] = v;
      });
      items.push([title, values]);
    }

    Object.entries(input.option).forEach(([k, v]) => {
      if (k === defaultVal) return;
      const title = v?._ || k;
      const values: MenuValue = { [name]: k };
      Object.entries(v || {}).forEach(([key, val]) => {
        if (key !== '_' && val !== undefined) values[key] = val;
      });
      items.push([title, values]);
    });

    return { title: input._, note: input.note, items };
  }

  if ('true' in input || 'false' in input) {
    return {
      title: input._,
      note: input.note,
      name,
      defaultValue: input.default ?? false,
      trueValue: input.true === null || input.true === undefined ? true : input.true,
      falseValue: input.false === null || input.false === undefined ? false : input.false,
    };
  }

  return {
    title: input._,
    note: input.note,
    name,
    defaultValue: (input as { default?: string }).default,
  };
}

// ── Markdown parsing (markdown-it based) ────────────────────

/**
 * Parse a single markdown block using markdown-it with custom plugins.
 * Returns rendered HTML plus extracted code blocks and headings.
 */
function parseContentBlock(
  content: string,
  blockPath: string | null,
  inputDefs: Record<string, ZDocInput>,
  counters: ParserCounters,
  pageId: string,
): {
  html: string;
  codeBlocks: ExtractedCodeBlock[];
  globalForms: GlobalForm[];
  inlineTemplates: ExtractedInlineTemplate[];
  headings: ToC[];
} {
  const { md, result } = createZdocParser(inputDefs, pageId, blockPath, counters);

  const html = md.render(content);

  // Advance the page-global counters to keep ids stable across blocks.
  counters.codeBlocks += result.codeBlocks.length;
  counters.globalForms += result.globalForms.length;
  counters.inlineTemplates += result.inlineTemplates.length;

  return {
    html,
    codeBlocks: result.codeBlocks,
    globalForms: result.globalForms,
    inlineTemplates: result.inlineTemplates,
    headings: result.toc,
  };
}

// ── Top-level orchestration ─────────────────────────────────

export async function getContentBySegments(
  docsDir: string,
  segments: string[],
  language: string = 'zh',
): Promise<HelpPageData | null> {
  if (segments.length !== 1) return null;

  const id = segments[0];
  if (!id) return null;

  const conf = await loadConf(docsDir, id, language);
  if (!conf) return null;

  const blockNames = conf.block || ['index'];
  const blocks: string[] = [];
  const allCodeBlocks: ExtractedCodeBlock[] = [];
  const allGlobalForms: GlobalForm[] = [];
  const allInlineTemplates: ExtractedInlineTemplate[] = [];
  const allHeadings: ToC[] = [];
  const counters = { codeBlocks: 0, globalForms: 0, inlineTemplates: 0 };

  for (const blockName of blockNames) {
    // The resolved source path (Site Override wins) travels as the block's
    // identity in located errors.
    const { path: blockPath, content } = await loadFile(
      docsDir,
      id,
      `${blockName}.${language}.md`,
      '',
    );
    if (!content) continue;

    const { html, codeBlocks, globalForms, inlineTemplates, headings } = parseContentBlock(
      content,
      blockPath,
      conf.input,
      counters,
      id,
    );
    blocks.push(html);
    allCodeBlocks.push(...codeBlocks);
    allGlobalForms.push(...globalForms);
    allInlineTemplates.push(...inlineTemplates);
    allHeadings.push(...headings);
  }

  // Store raw templates — the client will compile them with Hogan
  const compiledTemplates: Record<string, string> = {};
  for (const block of allCodeBlocks) {
    compiledTemplates[block.id] = block.template;
  }
  for (const inline of allInlineTemplates) {
    compiledTemplates[inline.id] = inline.template;
  }

  const contentHtml = blocks.join('\n\n');

  return {
    toc: allHeadings,
    content: contentHtml,
    meta: {
      title: conf._,
      cname: id,
      // Spec "Protocol enforcement": the config filter reaches the page meta.
      filter: conf.filter ?? undefined,
    },
    compiledTemplates,
    codeBlocks: allCodeBlocks.map(({ id, menus, lang, filepath, append }) => ({
      id,
      menus,
      lang,
      filepath,
      append,
    })),
    globalForms: allGlobalForms,
    inlineTemplates: allInlineTemplates.map(
      ({ id, lang }): InlineTemplate => ({ id, lang }),
    ),
  };
}

/**
 * Docs subtrees holding pages: Base Docs (submodule) and Site Overrides
 * (CONTEXT.md "Help doc storage"). Keys are glossary names; values are the
 * on-disk directory names, which keep their historical `global`/`local`
 * spelling — `global/` is the Base Docs tree and is unrelated to Global
 * Inputs.
 */
const PAGE_TREES = { base: 'global', local: 'local' } as const;

export async function getAvailableSegments(
  docsDir: string,
): Promise<string[][]> {
  const pages = new Set<string>();
  for (const tree of Object.values(PAGE_TREES)) {
    try {
      const entries = await fs.readdir(path.join(docsDir, tree), { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.')) pages.add(e.name);
      }
    } catch {
      // A missing tree simply contributes no pages.
    }
  }
  return [...pages].sort().map((name) => [name]);
}