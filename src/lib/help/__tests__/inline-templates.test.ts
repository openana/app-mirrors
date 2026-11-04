/**
 * Inline Templates (spec "Inline Templates", user stories 10–12) across
 * both seams: the page-data builder extracts a `{ztmpl …}` marker followed
 * by a code span into an inline Template entry (seam 1) and the render seam
 * resolves it through the same engine and variable context as fenced
 * Templates — Global Inputs included (seam 2).
 *
 * Ordinary braces in text are not Templates and stay verbatim. Real-page
 * regressions gate on the Base Docs submodule being present in the checkout.
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

/** Render an inline Template the way the help page does. */
function renderInline(
  data: HelpPageData,
  index: number,
  globals: Record<string, MenuValue> = initialGlobalStore(data),
  overrides: Partial<typeof settings> = {},
): string {
  const entry = data.inlineTemplates[index]!;
  return renderTemplate(
    data.compiledTemplates[entry.id],
    { globals },
    { ...settings, ...overrides },
  );
}

describe('inline Templates', () => {
  describe('extraction (seam 1)', () => {
    it('extracts a marker-then-code-span into an inline Template entry and leaves an inline placeholder', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: '地址为 {ztmpl}`{{endpoint}}/x`。',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.inlineTemplates).toEqual([{ id: 'codeinline-0' }]);
      expect(data!.compiledTemplates).toEqual({ 'codeinline-0': '{{endpoint}}/x' });
      expect(data!.content).toContain('<codeinline id="codeinline-0"></codeinline>');
      expect(data!.content).not.toContain('{ztmpl}');
    });

    it('keeps non-template braces in prose verbatim (shell text regression)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          "Shell text stays verbatim: `awk '{print $1}'`, ${var} and PATH=$HOME/.local/bin:$PATH.",
          '',
          'A lone marker {ztmpl} is not a Template, and {role}`x` is no ztmpl.',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.inlineTemplates).toEqual([]);
      expect(data!.compiledTemplates).toEqual({});
      expect(data!.content).toContain('{print $1}');
      expect(data!.content).toContain('${var}');
      expect(data!.content).toContain('PATH=$HOME/.local/bin:$PATH');
      expect(data!.content).toContain('A lone marker {ztmpl} is not a Template');
      expect(data!.content).toContain('<code>x</code>');
    });

    it('captures the lang attribute for syntax highlighting (synthetic — no corpus example)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]:
          '获取地址：{ztmpl lang="bash"}`curl {{endpoint}}/x`，以及 {ztmpl}`plain`。',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.inlineTemplates).toEqual([
        { id: 'codeinline-0', lang: 'bash' },
        { id: 'codeinline-1' },
      ]);
      expect(data!.compiledTemplates).toEqual({
        'codeinline-0': 'curl {{endpoint}}/x',
        'codeinline-1': 'plain',
      });
    });
  });

  describe('rendering (seam 2)', () => {
    it('renders an inline Template with the shared variable context, Global Inputs included', async () => {
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
          '将 {ztmpl}`JULIAUP_SERVER={{endpoint}}/{{target}}` 设为环境变量。',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');
      const store = initialGlobalStore(data!);

      expect(renderInline(data!, 0, store)).toBe(
        'JULIAUP_SERVER=https://mirrors.example.edu.cn/demo/cpu',
      );

      // The reader picks the other Global Input option.
      const form = data!.globalForms[0]!;
      const menu = form.menus[0]!;
      if (!('items' in menu)) throw new Error('expected a select menu');
      const changed = { ...store, [form.id]: { ...menu.items[1]![1] } };
      expect(renderInline(data!, 0, changed)).toBe(
        'JULIAUP_SERVER=https://mirrors.example.edu.cn/demo/cu128',
      );
    });

    it('resolves fenced and inline Templates identically (one shared render function)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  target:',
          '    _: 目标',
          '    option:',
          '      cpu:',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true" input="target"}',
          '```',
          '',
          '```{ztmpl lang="bash"}',
          'curl {{endpoint}}/{{target}}',
          '```',
          '',
          '行内：{ztmpl lang="bash"}`curl {{endpoint}}/{{target}}`。',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');
      const store = initialGlobalStore(data!);

      const fenced = renderTemplate(
        data!.compiledTemplates[data!.codeBlocks[0]!.id],
        { globals: store },
        settings,
      );
      expect(renderInline(data!, 0, store)).toBe(fenced);
      expect(fenced).toBe('curl https://mirrors.example.edu.cn/demo/cpu');
    });
  });

  describe('real Base Docs regressions', () => {
    const zdocDir = path.resolve(process.cwd(), 'zdoc');

    describe.skipIf(!fs.existsSync(zdocDir))('zdoc submodule present', () => {
      const realSettings = (cname: string) => ({ ...settings, cname });

      /** Render every inline Template of a real page and check none leak raw template text. */
      async function renderRealPage(cname: string): Promise<{ data: HelpPageData; rendered: string[] }> {
        const data = await getContentBySegments(zdocDir, [cname], 'zh');
        expect(data).not.toBeNull();
        expect(data!.content).not.toContain('{ztmpl}');
        const rendered = data!.inlineTemplates.map((_, i) =>
          renderInline(data!, i, {}, realSettings(cname)),
        );
        for (const text of rendered) {
          expect(text).not.toBe('');
          expect(text).not.toContain('{{');
        }
        return { data: data!, rendered };
      }

      it('FreeBSD cover list: every item renders the mirror endpoint', async () => {
        const { data, rendered } = await renderRealPage('FreeBSD');

        expect(data.inlineTemplates).toHaveLength(5);
        for (const text of rendered) {
          expect(text).toContain('https://mirrors.example.edu.cn/FreeBSD/');
        }
        expect(rendered).toContain(
          'https://mirrors.example.edu.cn/FreeBSD/releases/CI-IMAGES',
        );
        expect(rendered).toContain('https://mirrors.example.edu.cn/FreeBSD/doc');
      });

      it('gentoo: the sync-uri sentence renders the arm64 binpackages path', async () => {
        const { data, rendered } = await renderRealPage('gentoo');

        expect(data.content).toContain('sync-uri');
        expect(rendered).toContain(
          'https://mirrors.example.edu.cn/gentoo/releases/arm64/binpackages/23.0/arm64',
        );
      });

      it('gentoo-zh.git: the sync-uri sentence renders the mirror endpoint', async () => {
        const { data, rendered } = await renderRealPage('gentoo-zh.git');

        expect(data.content).toContain('sync-uri');
        expect(rendered).toContain('https://mirrors.example.edu.cn/gentoo-zh.git');
      });

      it('julia-releases: JULIAUP_SERVER points at the mirror endpoint', async () => {
        const { data, rendered } = await renderRealPage('julia-releases');

        expect(data.content).toContain('JULIAUP_SERVER');
        expect(rendered).toContain('https://mirrors.example.edu.cn/julia-releases');
      });

      it('kodi: the step text renders the addon path', async () => {
        const { data, rendered } = await renderRealPage('kodi');

        expect(data.content).toContain('在弹出的录入框输入');
        expect(rendered).toContain('https://mirrors.example.edu.cn/kodi/apt/ios/');
      });
    });
  });
});

