/**
 * Global Inputs (ADR 0007) end to end across both seams: the page-data
 * builder extracts the forms (seam 1) and the render seam resolves their
 * selections into every Template of the Help Doc — including blocks that
 * don't declare the input (spec user stories 1–5).
 *
 * Fixture pages mirror the real Base Docs shapes (astral-wheels, mongodb,
 * erlang-solutions); the real-page regressions gate on the Base Docs
 * submodule being present in the checkout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { getContentBySegments } from '../parse-markdown';
import { createInitialState, renderTemplate } from '../template-render';
import type { HelpPageData, MenuValue } from '../types';
import { baseFile, makeDocsTree, removeDocsTrees } from './docs-tree';

afterAll(removeDocsTrees);

const settings = {
  host: 'mirrors.example.edu.cn',
  cname: 'demo',
  sudoEnabled: true,
  httpsEnabled: true,
};

/** The page-level selection store a reader gets before touching any form. */
function initialGlobalStore(data: HelpPageData): Record<string, MenuValue> {
  return Object.fromEntries(
    data.globalForms.map((form) => [form.id, createInitialState(form.menus)]),
  );
}

/** Render the template of a code block the way the help page does. */
function renderBlock(
  data: HelpPageData,
  blockIndex: number,
  globals: Record<string, MenuValue>,
): string {
  const block = data.codeBlocks[blockIndex]!;
  return renderTemplate(
    data.compiledTemplates[block.id],
    { block: createInitialState(block.menus), globals },
    settings,
  );
}

describe('Global Inputs end to end', () => {
  describe('fixture pages', () => {
    it('renders a Global Input in a block that does not declare it (astral-wheels shape)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  target:',
          '    _: CUDA 版本通道',
          '    default: cu128',
          '    option:',
          '      cpu:',
          '        _: CPU（无 GPU 环境）',
          '      cu128:',
          '        _: CUDA 12.8',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true" input="target"}',
          '```',
          '',
          '```{ztmpl lang="bash"}',
          'uv add flash-attn --index astral-{{target}}={{endpoint}}/{{target}}/',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(renderBlock(data!, 0, initialGlobalStore(data!))).toBe(
        'uv add flash-attn --index astral-cu128=https://mirrors.example.edu.cn/demo/cu128/',
      );
    });

    it('renders a Global Input in a later block next to block-local inputs (mongodb shape)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  version:',
          '    _: MongoDB 版本号',
          '    option:',
          "      '8.0':",
          "        _: 8.0（稳定版）",
          "      '7.0':",
          '  release:',
          '    _: 发行版',
          '    option:',
          '      trixie:',
          '        _: Debian 13',
          '        os: debian',
          '        repo: main',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true" input="version"}',
          '```',
          '',
          '```{ztmpl lang="bash"}',
          'wget -qO - https://example.org/server-{{version}}.asc',
          '```',
          '',
          '```{ztmpl lang="properties" input="release"}',
          'deb {{endpoint}}/apt/{{os}} {{release}}/mongodb-org/{{version}} {{repo}}',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');
      const store = initialGlobalStore(data!);

      // The block that declares no input still gets the Global Input.
      expect(renderBlock(data!, 0, store)).toBe(
        'wget -qO - https://example.org/server-8.0.asc',
      );
      // Block inputs and Global Inputs resolve together in one Template.
      expect(renderBlock(data!, 1, store)).toBe(
        'deb https://mirrors.example.edu.cn/demo/apt/debian trixie/mongodb-org/8.0 main',
      );
    });

    it('drives the page from four Global Input forms in their own sections (erlang-solutions shape)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 操作系统版本',
          '    option:',
          '      bookworm:',
          '        _: Debian 12',
          '        os: debian',
          '  erlang-version:',
          '    _: Erlang/OTP 版本',
          '    option:',
          '      esl-erlang-24:',
          '        _: Erlang/OTP 24',
          '  elixir-version:',
          '    _: Elixir 版本',
          '    option:',
          '      elixir-1.14:',
          '        _: Elixir 1.14',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true" input="release"}',
          '```',
          '',
          '```{ztmpl global="true" input="erlang-version"}',
          '```',
          '',
          '```{ztmpl global="true" input="elixir-version"}',
          '```',
          '',
          '```{ztmpl lang="properties"}',
          'deb {{endpoint}}/{{os}} {{release}}-esl-erlang-{{erlang-version}}-elixir-{{elixir-version}} contrib',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.globalForms.map((form) => form.id)).toEqual([
        'globalmenu-0',
        'globalmenu-1',
        'globalmenu-2',
      ]);
      expect(renderBlock(data!, 0, initialGlobalStore(data!))).toBe(
        'deb https://mirrors.example.edu.cn/demo/debian bookworm-esl-erlang-esl-erlang-24-elixir-elixir-1.14 contrib',
      );
    });

    it('applies one selection change to every Template on the page', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  target:',
          '    _: 目标',
          '    option:',
          '      cpu:',
          '      cu128:',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true" input="target"}',
          '```',
          '',
          '```{ztmpl lang="bash"}',
          'first {{target}}',
          '```',
          '',
          '```{ztmpl lang="bash"}',
          'second {{target}}',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');
      const store = initialGlobalStore(data!);
      expect(renderBlock(data!, 0, store)).toContain('cpu');
      expect(renderBlock(data!, 1, store)).toContain('cpu');

      // The reader picks the second option of the single Global Input form.
      const form = data!.globalForms[0]!;
      const menu = form.menus[0]!;
      if (!('items' in menu)) throw new Error('expected a select menu');
      const changed = { ...store, [form.id]: { ...menu.items[1]![1] } };

      expect(renderBlock(data!, 0, changed)).toContain('cu128');
      expect(renderBlock(data!, 1, changed)).toContain('cu128');
    });
  });

  describe('real Base Docs regressions', () => {
    const zdocDir = path.resolve(process.cwd(), 'zdoc');

    describe.skipIf(!fs.existsSync(zdocDir))('zdoc submodule present', () => {
      const realSettings = (cname: string) => ({ ...settings, cname });

      it('astral-wheels: {{target}} renders non-empty in blocks that do not declare it', async () => {
        const data = await getContentBySegments(zdocDir, ['astral-wheels'], 'zh');

        expect(data).not.toBeNull();
        expect(data!.globalForms.map((form) => form.id)).toEqual(['globalmenu-0']);

        const blocks = data!.codeBlocks.filter(
          (b) =>
            b.menus.length === 0 &&
            data!.compiledTemplates[b.id]!.includes('{{target}}'),
        );
        expect(blocks.length).toBeGreaterThan(0);
        for (const block of blocks) {
          const rendered = renderTemplate(
            data!.compiledTemplates[block.id],
            { globals: initialGlobalStore(data!) },
            realSettings('astral-wheels'),
          );
          expect(rendered).not.toBe('');
          expect(rendered).not.toContain('{{target}}');
          expect(rendered).toContain('cu128');
        }
      });

      it('mongodb: {{version}} renders non-empty in blocks that do not declare it', async () => {
        const data = await getContentBySegments(zdocDir, ['mongodb'], 'zh');

        expect(data).not.toBeNull();
        expect(data!.globalForms.map((form) => form.id)).toEqual(['globalmenu-0']);

        const blocks = data!.codeBlocks.filter(
          (b) =>
            b.menus.length === 0 &&
            data!.compiledTemplates[b.id]!.includes('{{version}}'),
        );
        expect(blocks.length).toBeGreaterThan(0);
        for (const block of blocks) {
          const rendered = renderTemplate(
            data!.compiledTemplates[block.id],
            { globals: initialGlobalStore(data!) },
            realSettings('mongodb'),
          );
          expect(rendered).not.toBe('');
          expect(rendered).not.toContain('{{version}}');
          expect(rendered).toContain('server-8.0.asc');
        }
      });

      it('erlang-solutions: four Global Input forms drive every block', async () => {
        const data = await getContentBySegments(zdocDir, ['erlang-solutions'], 'zh');

        expect(data).not.toBeNull();
        expect(data!.globalForms).toHaveLength(4);
        for (const form of data!.globalForms) {
          expect(form.menus.length).toBeGreaterThan(0);
        }

        const blocks = data!.codeBlocks.filter((b) =>
          data!.compiledTemplates[b.id]!.includes('{{mongooseim-version}}'),
        );
        expect(blocks.length).toBeGreaterThan(0);
        for (const block of blocks) {
          const rendered = renderTemplate(
            data!.compiledTemplates[block.id],
            { globals: initialGlobalStore(data!) },
            realSettings('erlang-solutions'),
          );
          expect(rendered).not.toBe('');
          expect(rendered).not.toContain('{{');
          expect(rendered).toContain('mongooseim-mongooseim-5');
        }
      });
    });
  });
});
