/**
 * Help docs pipeline — reads from zdoc/ directory, parses YAML configs,
 * and compiles content into a structured format for the frontend.
 *
 * Uses markdown-it with custom plugins for proper CommonMark parsing,
 * replacing the previous regex-based approach.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as yamlParse } from 'yaml';
import type {
  ZDocConfig,
  ZDocConfigOnDisk,
  ZDocInput,
  MenuValue,
  InputType,
  HelpPageData,
  GlobalForm,
  ToC,
} from './types';
import { createZdocParser, type ExtractedCodeBlock } from './markdown-it-plugins';

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

// ── File loading ────────────────────────────────────────────

async function loadFile(
  docsDir: string,
  page: string,
  file: string,
  defaultValue?: string,
): Promise<{ path: string | null; content: string }> {
  const localPath = path.join(docsDir, 'local', page, file);
  const globalPath = path.join(docsDir, 'global', page, file);

  for (const p of [localPath, globalPath]) {
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
  const globalPath = path.join(docsDir, 'global', page, `${language}.yaml`);

  const tryReadYaml = async (p: string): Promise<[boolean, ZDocConfigOnDisk | null]> => {
    try {
      const content = await fs.readFile(p, 'utf-8');
      return [true, yamlParse(content) as ZDocConfigOnDisk];
    } catch (err) {
      if (!isErrnoException(err) || err.code !== 'ENOENT') throw err;
      return [false, null];
    }
  };

  const [localExists, localConf] = await tryReadYaml(localPath);
  const [globalExists, globalConf] = await tryReadYaml(globalPath);

  if (!localExists && !globalExists) return null;

  const inputsGiven = { ...globalConf?.input, ...localConf?.input };
  const inputs = Object.fromEntries(
    Object.entries(inputsGiven).filter(([, v]) => v !== null),
  ) as Record<string, ZDocInput>;

  const config = {
    block: ['index'],
    ...globalConf,
    ...localConf,
    input: inputs,
    name: page,
  };

  if (config._ === undefined) {
    throw new Error(`Config file ${language}.yaml for page ${page} must have a title field "_"`);
  }

  return { _: config._!, ...config } as ZDocConfig;
}

async function loadBlock(
  docsDir: string,
  page: string,
  block: string,
  language: string,
): Promise<{ path: string | null; content: string }> {
  return loadFile(docsDir, page, `${block}.${language}.md`, '');
}

// ── Input transpilation ─────────────────────────────────────

export function transpileInput(name: string, input: ZDocInput): InputType {
  if ('option' in input) {
    const items: [string, MenuValue][] = [];
    const defaultVal = input.default;

    if (defaultVal && input.option[defaultVal]) {
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
  counters: { codeBlocks: number; globalForms: number },
  pageId: string,
): {
  html: string;
  codeBlocks: ExtractedCodeBlock[];
  globalForms: GlobalForm[];
  headings: ToC[];
} {
  const { md, result } = createZdocParser(
    inputDefs,
    pageId,
    blockPath,
    counters.codeBlocks,
    counters.globalForms,
  );

  const html = md.render(content);

  // Advance the page-global counters to keep ids stable across blocks.
  counters.codeBlocks += result.codeBlocks.length;
  counters.globalForms += result.globalForms.length;

  return {
    html,
    codeBlocks: result.codeBlocks,
    globalForms: result.globalForms,
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
  const allHeadings: ToC[] = [];
  const counters = { codeBlocks: 0, globalForms: 0 };

  for (const blockName of blockNames) {
    const { path: blockPath, content } = await loadBlock(docsDir, id, blockName, language);
    if (!content) continue;

    const { html, codeBlocks, globalForms, headings } = parseContentBlock(
      content,
      blockPath,
      conf.input,
      counters,
      id,
    );
    blocks.push(html);
    allCodeBlocks.push(...codeBlocks);
    allGlobalForms.push(...globalForms);
    allHeadings.push(...headings);
  }

  // Store raw templates — the client will compile them with Hogan
  const compiledTemplates: Record<string, string> = {};
  for (const block of allCodeBlocks) {
    compiledTemplates[block.id] = block.template;
  }

  const contentHtml = blocks.join('\n\n');

  return {
    toc: allHeadings,
    content: contentHtml,
    meta: {
      title: conf._,
      cname: id,
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
  };
}

/** Docs subtrees holding pages: Base Docs (submodule) and Site Overrides. */
const PAGE_TREES = ['global', 'local'];

export async function getAvailableSegments(
  docsDir: string,
): Promise<string[][]> {
  const pages = new Set<string>();
  for (const tree of PAGE_TREES) {
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