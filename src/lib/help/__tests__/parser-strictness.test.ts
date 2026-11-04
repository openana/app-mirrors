/**
 * Parser strictness (spec "Strictness"; user stories 21, 22, 24, 32): the
 * page-data builder fails with located errors — page, block and line in the
 * existing error style — for everything in the Template syntax it doesn't
 * honour: unknown Template attributes (fenced and inline alike), `global`
 * without `input`, `default` outside the option set, and `append` without a
 * file path. `global` Template bodies stay ignored silently (format spec),
 * non-string option values (e.g. a boolean `sid` flag) type-check and render,
 * and the whole Base Docs corpus parses with no false positives (gated on the
 * submodule being present).
 */

import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { getContentBySegments, getAvailableSegments, transpileInput } from '../parse-markdown';
import { createInitialState, renderTemplate } from '../template-render';
import type { ZDocInput } from '../types';
import { baseFile, errorMessageFrom, expectLocatedError, localFile, makeDocsTree, removeDocsTrees } from './docs-tree';

afterAll(removeDocsTrees);

const settings = {
  host: 'mirrors.example.edu.cn',
  cname: 'demo',
  sudoEnabled: true,
  httpsEnabled: true,
};

describe('parser strictness', () => {
  describe('located errors', () => {
    it('reports page, block and line for an unknown attribute on a fenced Template', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '第一行。',
          '',
          '```{ztmpl lang="bash" bogus="x"}',
          'code',
          '```',
        ].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Unsupported attribute "bogus"');
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'index.zh.md'), 3);
    });

    it('reports page, block and line for an unknown attribute on an inline Template', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '第一行。',
          '',
          '行内模板 {ztmpl input="release"}`内容`。',
        ].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      // `input` is a fenced attribute only — inline Templates honour `lang`
      expect(message).toContain('Unsupported attribute "input"');
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'index.zh.md'), 3);
    });

    it('reports page, block and line for a global Template without input', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '第一行。',
          '',
          '```{ztmpl global="true"}',
          'ignored body',
          '```',
        ].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Global directive must have input variables');
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'index.zh.md'), 3);
    });

    it('reports page, block and line for append without a file path', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '第一行。',
          '',
          '```{ztmpl lang="bash" append="true"}',
          'code',
          '```',
        ].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Attribute "append" requires "path"');
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'index.zh.md'), 3);
    });

    it('reports page, block and line when whitespace separates an inline marker from its code span', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '第一行。',
          '',
          '行内模板 {ztmpl} `内容`。',
        ].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      // Author intent is clear there — fail loudly instead of leaking raw
      // text (spec story 32).
      expect(message).toContain(
        'Unexpected whitespace between the inline Template marker and its code span',
      );
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'index.zh.md'), 3);
    });

    it('reports page, block and line for a default outside the option set (block names the config source file)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    default: ghost',
          '    option:',
          '      stable:',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: '```{ztmpl input="release"}\nx\n```',
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Default "ghost" is not an option of input "release"');
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'zh.yaml'), 5);
    });

    it('reports a bad default even when the input is never used in a Template', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    default: ghost',
          '    option:',
          '      stable:',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: '正文，没有任何模板。',
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Default "ghost" is not an option of input "release"');
      expectLocatedError(message, 'demo', path.join(root, 'global', 'demo', 'zh.yaml'), 5);
    });

    it('points at the Site Override config when the bad default comes from there', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    default: stable',
          '    option:',
          '      stable:',
          '',
        ].join('\n'),
        [localFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    default: ghost',
          '    option:',
          '      stable:',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: '```{ztmpl input="release"}\nx\n```',
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Default "ghost" is not an option of input "release"');
      expectLocatedError(message, 'demo', path.join(root, 'local', 'demo', 'zh.yaml'), 5);
    });
  });

  describe('global Template bodies', () => {
    it('ignores the body of a global Template silently (format spec)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    option:',
          '      stable:',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true" input="release"}',
          '这份内容会被忽略 {{release}}',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.globalForms).toEqual([
        { id: 'globalmenu-0', menus: [{ title: '发行版', items: [['stable', { release: 'stable' }]] }] },
      ]);
      expect(data!.compiledTemplates).toEqual({});
      expect(data!.content).not.toContain('会被忽略');
    });
  });

  describe('non-string option values', () => {
    it('type-checks non-string option values in the input typings', () => {
      // Boolean companion values (the debian `sid` flag) and entry-less
      // options must be assignable to ZDocInput without casts.
      const input: ZDocInput = {
        _: '发行版',
        default: 'testing',
        option: {
          trixie: { _: 'Debian 13 (trixie)', security: '-security' },
          testing: null,
          sid: { sid: true, nonfree: ' non-free' },
        },
      };

      const menu = transpileInput('release', input);

      // The default names an entry-less option — its key is the label.
      expect(menu).toEqual({
        title: '发行版',
        items: [
          ['testing', { release: 'testing' }],
          ['Debian 13 (trixie)', { release: 'trixie', security: '-security' }],
          ['sid', { release: 'sid', sid: true, nonfree: ' non-free' }],
        ],
      });
    });

    it('renders a boolean option flag through both seams (debian sid shape)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    option:',
          '      trixie:',
          '        _: Debian 13 (trixie)',
          '      sid:',
          '        sid: true',
          "        nonfree: ' non-free'",
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl input="release"}',
          '{{#sid}}deb-src {{endpoint}}/sid main{{/sid}}{{^sid}}deb {{endpoint}}/{{release}} main{{/sid}}',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');
      const block = data!.codeBlocks[0]!;

      expect(block.menus).toEqual([
        {
          title: '发行版',
          items: [
            ['Debian 13 (trixie)', { release: 'trixie' }],
            ['sid', { release: 'sid', sid: true, nonfree: ' non-free' }],
          ],
        },
      ]);

      const template = data!.compiledTemplates[block.id]!;
      // Pre-selected default (trixie) takes the non-sid branch …
      expect(
        renderTemplate(template, { block: createInitialState(block.menus) }, settings),
      ).toBe('deb https://mirrors.example.edu.cn/demo/trixie main');
      // … and the boolean flag switches to the sid branch.
      expect(
        renderTemplate(template, { block: { release: 'sid', sid: true, nonfree: ' non-free' } }, settings),
      ).toBe('deb-src https://mirrors.example.edu.cn/demo/sid main');
    });
  });

  describe('Base Docs corpus', () => {
    const zdocDir = path.resolve(process.cwd(), 'zdoc');
    const baseDocsDir = path.join(zdocDir, 'global');

    describe.skipIf(!fs.existsSync(baseDocsDir))('zdoc submodule present', () => {
      it('parses every page in the corpus with no false positives', async () => {
        const segments = await getAvailableSegments(zdocDir);
        expect(segments.length).toBeGreaterThan(0);

        for (const segment of segments) {
          const data = await getContentBySegments(zdocDir, segment, 'zh');
          expect(data, `page ${segment.join('/')} produced no data`).not.toBeNull();
        }
      });
    });
  });
});
