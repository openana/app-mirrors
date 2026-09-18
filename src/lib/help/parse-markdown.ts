/**
 * Help docs pipeline — reads from zdoc/ directory, parses YAML configs,
 * and compiles content into a structured format for the frontend.
 *
 * This is a simplified version of mirrorz-help's parse-markdown.ts,
 * adapted for Vite build-time processing.
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
  ToC,
} from './types';

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function loadFile(
  docsDir: string,
  page: string,
  file: string,
  defaultValue?: string,
): Promise<{ path: string | null; content: string }> {
  const localPath = path.join(docsDir, 'local', page, file);
  const globalPath = path.join(docsDir, page, file);

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
  const globalPath = path.join(docsDir, page, `${language}.yaml`);

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
): Promise<string> {
  const result = await loadFile(docsDir, page, `${block}.${language}.md`, '');
  return result.content;
}

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

export function createInitialState(menus: InputType[]): MenuValue {
  return menus.reduce<MenuValue>((acc, menu) => {
    let value: MenuValue;
    if ('items' in menu) {
      value = menu.items[0]?.[1] || {};
    } else if ('trueValue' in menu) {
      value = { [menu.name]: menu.defaultValue ? menu.trueValue : menu.falseValue };
    } else {
      value = { [menu.name]: menu.defaultValue || '' };
    }
    return { ...acc, ...value };
  }, {});
}

function parseContentBlocks(
  content: string,
  inputDefs: Record<string, ZDocInput>,
  globalBlockCounter: { value: number },
): {
  html: string;
  codeBlocks: Array<{
    id: string;
    template: string;
    menus: InputType[];
    lang?: string;
    filepath?: string;
  }>;
  headings: ToC[];
} {
  const codeBlocks: Array<{
    id: string;
    template: string;
    menus: InputType[];
    lang?: string;
    filepath?: string;
  }> = [];
  const headings: ToC[] = [];

  // Extract headings, handling {#custom-id} syntax
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1]?.length || 0;
    const rawText = match[2] || '';
    // Strip {#custom-id} from the text
    const text = rawText.replace(/\s*\{#[^}]+\}\s*$/, '');
    // Use custom ID if provided, otherwise generate from text
    const customIdMatch = rawText.match(/\{#([^}]+)\}$/);
    const id = customIdMatch
      ? customIdMatch[1]
      : text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
    headings.push({ url: `#${id}`, content: text, depth: level });
  }

  // Process ztmpl directives into code blocks
  const processedContent = content.replace(
    /```{ztmpl([^}]*)}\n([\s\S]*?)```/g,
    (_match, attrs: string, template: string) => {
      const langMatch = attrs.match(/lang="([^"]+)"/);
      const pathMatch = attrs.match(/path="([^"]+)"/);
      const inputMatch = attrs.match(/input="([^"]+)"/);

      const id = `codeblock-${globalBlockCounter.value++}`;

      // Build menus from input attribute
      const menus: InputType[] = [];
      if (inputMatch?.[1]) {
        const inputNames = inputMatch[1].split(/\s+/);
        for (const inputName of inputNames) {
          const inputDef = inputDefs[inputName];
          if (inputDef) {
            menus.push(transpileInput(inputName, inputDef));
          }
        }
      }

      codeBlocks.push({
        id,
        template: template.trim(),
        menus,
        lang: langMatch?.[1],
        filepath: pathMatch?.[1],
      });

      return `<codeblock id="${id}" />`;
    },
  );

  // Simple markdown to HTML conversion
  // Process blockquotes first, then protect them from further processing
  let html = processedContent
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/(<blockquote>.*<\/blockquote>\n?)+/g, (match) => {
      // Merge consecutive blockquotes into one
      const content = match.replace(/<\/blockquote>\n?<blockquote>/g, '<br>');
      return content;
    });

  // Replace double newlines with paragraph breaks, but not before/after block elements
  html = html.replace(/\n\n/g, '\n<p-break>\n');

  // Convert headings, handling {#custom-id} syntax
  const replaceHeading = (_match: string, tag: string, rawText: string) => {
    const text = rawText.replace(/\s*\{#[^}]+\}\s*$/, '');
    const customIdMatch = rawText.match(/\{#([^}]+)\}$/);
    const id = customIdMatch
      ? customIdMatch[1]
      : text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
    return `<${tag} id="${id}">${text}</${tag}>`;
  };

  html = html
    .replace(/^### (.+)$/gm, (_, text) => replaceHeading(_, 'h3', text))
    .replace(/^## (.+)$/gm, (_, text) => replaceHeading(_, 'h2', text))
    .replace(/^# (.+)$/gm, (_, text) => replaceHeading(_, 'h1', text))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(?!<[hulob/])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p-break>/g, '</p><p>')
    .replace(/<p><\/p>/g, '');

  return { html, codeBlocks, headings };
}

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
  const allCodeBlocks: Array<{
    id: string;
    template: string;
    menus: InputType[];
    lang?: string;
    filepath?: string;
  }> = [];
  const allHeadings: ToC[] = [];
  const globalBlockCounter = { value: 0 };

  for (const blockName of blockNames) {
    const content = await loadBlock(docsDir, id, blockName, language);
    if (!content) continue;

    const { html, codeBlocks, headings } = parseContentBlocks(
      content,
      conf.input,
      globalBlockCounter,
    );
    blocks.push(html);
    allCodeBlocks.push(...codeBlocks);
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
    codeBlocks: allCodeBlocks.map(({ id, menus, lang, filepath }) => ({
      id,
      menus,
      lang,
      filepath,
    })),
  };
}

export async function getAvailableSegments(
  docsDir: string,
): Promise<string[][]> {
  try {
    const entries = await fs.readdir(docsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'site' && e.name !== 'local' && e.name !== 'global')
      .map((e) => [e.name]);
  } catch {
    return [];
  }
}
