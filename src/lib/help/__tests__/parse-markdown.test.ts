/**
 * Characterization tests for the help pipeline's page-data builder (spec
 * "Testing Decisions", seam 1). They lock today's behaviour — including known
 * gaps that later tickets (04–08) deliberately change — so refactors stay
 * verifiable. Assertions are on the returned page data only (content HTML,
 * code blocks, headings, meta), never on markdown-it token internals.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { getContentBySegments, getAvailableSegments } from '../parse-markdown';
import { baseFile, localFile, makeDocsTree, removeDocsTrees } from './docs-tree';

afterAll(removeDocsTrees);

async function errorMessageFrom(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error('expected the pipeline to reject');
}

describe('help pipeline page-data builder', () => {
  describe('page data', () => {
    it('builds page data with content HTML, headings and meta for a simple page', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '# 安装',
          '',
          '安装说明。',
          '',
          '## 配置 {#config}',
          '',
          '配置说明。',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data).not.toBeNull();
      expect(data!.meta).toEqual({ title: 'Demo 页面', cname: 'demo' });
      expect(data!.toc).toEqual([
        { url: '#安装', content: '安装', depth: 1 },
        { url: '#config', content: '配置', depth: 2 },
      ]);
      expect(data!.content).toContain('<h1 id="安装">安装</h1>');
      expect(data!.content).toContain('<h2 id="config">配置</h2>');
      expect(data!.codeBlocks).toEqual([]);
      expect(data!.compiledTemplates).toEqual({});
    });

    it('extracts ztmpl fences into code blocks and leaves placeholders in the content', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: 发行版',
          '    option:',
          '      stable:',
          '        _: 稳定版',
          '        suite: stable-all',
          '      beta:',
          '  src:',
          '    _: 启用源码源',
          "    true: ''",
          "    false: '# '",
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: [
          '前言。',
          '',
          '```{ztmpl lang="bash" path="/etc/apt/sources.list" input="release src" append="true"}',
          '{{src}}deb {{endpoint}}/ {{release}} main',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.content).toContain('<codeblock id="codeblock-0" />');
      expect(data!.content).not.toContain('{{release}}');
      expect(data!.codeBlocks).toEqual([
        {
          id: 'codeblock-0',
          lang: 'bash',
          filepath: '/etc/apt/sources.list',
          append: true,
          menus: [
            {
              title: '发行版',
              items: [
                ['稳定版', { release: 'stable', suite: 'stable-all' }],
                ['beta', { release: 'beta' }],
              ],
            },
            {
              title: '启用源码源',
              name: 'src',
              defaultValue: false,
              trueValue: '',
              falseValue: '# ',
            },
          ],
        },
      ]);
      expect(data!.compiledTemplates).toEqual({
        'codeblock-0': '{{src}}deb {{endpoint}}/ {{release}} main',
      });
    });

    it('numbers code blocks continuously across the page blocks', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\nblock:\n- intro\n- usage\n',
        [baseFile('demo', 'intro.zh.md')]: '```{ztmpl}\nfirst\n```',
        [baseFile('demo', 'usage.zh.md')]: '```{ztmpl}\nsecond\n```',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.codeBlocks.map((b) => b.id)).toEqual(['codeblock-0', 'codeblock-1']);
      expect(data!.compiledTemplates).toEqual({
        'codeblock-0': 'first',
        'codeblock-1': 'second',
      });
      expect(data!.content.indexOf('codeblock-0')).toBeLessThan(
        data!.content.indexOf('codeblock-1'),
      );
    });

    it('leaves plain code fences with literal braces verbatim', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '```bash',
          "awk '{print $1}' ${HOME}",
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.content).toContain("awk '{print $1}' ${HOME}");
      expect(data!.codeBlocks).toEqual([]);
    });
  });

  describe('input transpilation into menus', () => {
    it('turns an option input into a menu with companion values, default first', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  release:',
          '    _: Debian 版本',
          '    option:',
          '      trixie:',
          '        _: Debian 13 (trixie)',
          '        security: -security',
          "        nonfree: ' non-free non-free-firmware'",
          '      testing:',
          '        security: -security',
          '      sid:',
          '        sid: true',
          '    default: testing',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: '```{ztmpl input="release"}\nx\n```',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.codeBlocks[0]!.menus).toEqual([
        {
          title: 'Debian 版本',
          items: [
            ['testing', { release: 'testing', security: '-security' }],
            [
              'Debian 13 (trixie)',
              {
                release: 'trixie',
                security: '-security',
                nonfree: ' non-free non-free-firmware',
              },
            ],
            ['sid', { release: 'sid', sid: true }],
          ],
        },
      ]);
    });

    it('turns switch and text inputs into boolean and text inputs', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'input:',
          '  src:',
          '    _: 启用源码源',
          '    note: 源码源说明',
          "    true: ''",
          "    false: '# '",
          '  official:',
          '    _: 安全更新使用官方索引',
          '    default: true',
          '    true:',
          '  custom:',
          '    _: 自定义',
          '    default: abc',
          '',
        ].join('\n'),
        [baseFile('demo', 'index.zh.md')]: '```{ztmpl input="src official custom"}\nx\n```',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.codeBlocks[0]!.menus).toEqual([
        {
          title: '启用源码源',
          note: '源码源说明',
          name: 'src',
          defaultValue: false,
          trueValue: '',
          falseValue: '# ',
        },
        {
          title: '安全更新使用官方索引',
          name: 'official',
          defaultValue: true,
          trueValue: true,
          falseValue: false,
        },
        { title: '自定义', name: 'custom', defaultValue: 'abc' },
      ]);
    });
  });

  describe('Global Input forms', () => {
    it('extracts a global="true" Template into globalForms and leaves a <globalmenu> placeholder', async () => {
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
          '选择目标：',
          '',
          '```{ztmpl global="true" input="target"}',
          'ignored body',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.globalForms).toEqual([
        {
          id: 'globalmenu-0',
          menus: [
            {
              title: '目标',
              items: [
                ['cpu', { target: 'cpu' }],
                ['cu128', { target: 'cu128' }],
              ],
            },
          ],
        },
      ]);
      expect(data!.content).toContain('<globalmenu id="globalmenu-0" />');
      expect(data!.content).not.toContain('ignored body');
      expect(data!.codeBlocks).toEqual([]);
      expect(data!.compiledTemplates).toEqual({});
    });

    it('numbers global forms continuously across the page blocks, separate from code blocks', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: [
          '_: Demo 页面',
          'block:',
          '- intro',
          '- usage',
          'input:',
          '  release:',
          '    _: 发行版',
          '    option:',
          '      stable:',
          '  version:',
          '    _: 版本',
          '    option:',
          '      v1:',
          '',
        ].join('\n'),
        [baseFile('demo', 'intro.zh.md')]: [
          '```{ztmpl global="true" input="release"}',
          '```',
          '',
          '```{ztmpl lang="bash"}',
          'echo {{release}}',
          '```',
        ].join('\n'),
        [baseFile('demo', 'usage.zh.md')]: '```{ztmpl global="true" input="version"}\n```',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.globalForms.map((f) => f.id)).toEqual(['globalmenu-0', 'globalmenu-1']);
      expect(data!.codeBlocks.map((b) => b.id)).toEqual(['codeblock-0']);
      expect(data!.content).toContain('<globalmenu id="globalmenu-0" />');
      expect(data!.content).toContain('<codeblock id="codeblock-0" />');
      expect(data!.content).toContain('<globalmenu id="globalmenu-1" />');
    });

    it('still parses a global="true" Template without input (located error lands in ticket 07)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: [
          '```{ztmpl global="true"}',
          'ignored body',
          '```',
        ].join('\n'),
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.globalForms).toEqual([{ id: 'globalmenu-0', menus: [] }]);
      expect(data!.content).toContain('<globalmenu id="globalmenu-0" />');
      expect(data!.codeBlocks).toEqual([]);
    });
  });

  describe('Site Overrides', () => {
    it('merges Site Overrides over Base Docs config and block files', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: 基础标题\ninput:\n  x:\n    _: 输入 X\n',
        [localFile('demo', 'zh.yaml')]: '_: 覆盖标题\ninput:\n  y:\n    _: 输入 Y\n',
        [baseFile('demo', 'index.zh.md')]: '基础正文。',
        [localFile('demo', 'index.zh.md')]: '覆盖正文。\n\n```{ztmpl input="y"}\nz\n```',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.meta.title).toBe('覆盖标题');
      expect(data!.content).toContain('覆盖正文。');
      expect(data!.content).not.toContain('基础正文。');
      expect(data!.codeBlocks[0]!.menus).toEqual([{ title: '输入 Y', name: 'y', defaultValue: undefined }]);
    });

    it('lets a Site Override delete a Base Docs input', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\ninput:\n  x:\n    _: 输入 X\n',
        [localFile('demo', 'zh.yaml')]: 'input:\n  x: null\n',
        [baseFile('demo', 'index.zh.md')]: '```{ztmpl input="x"}\nz\n```',
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Input "x" used in directive');
    });

    it('shadows a Base Docs Content Block wholesale while keeping the other blocks', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\nblock:\n- intro\n- usage\n',
        [baseFile('demo', 'intro.zh.md')]: '基础前言。',
        [baseFile('demo', 'usage.zh.md')]: '基础用法。',
        [localFile('demo', 'usage.zh.md')]: '覆盖用法。',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.content).toContain('基础前言。');
      expect(data!.content).toContain('覆盖用法。');
      expect(data!.content).not.toContain('基础用法。');
    });

    it('extends a Base Docs page with an extra Site Override block', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: '基础正文。',
        [localFile('demo', 'zh.yaml')]: 'block:\n- index\n- faq\n',
        [localFile('demo', 'faq.zh.md')]: '本站常见问题。',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.content).toContain('基础正文。');
      expect(data!.content).toContain('本站常见问题。');
    });

    it('renders a page that exists only as a Site Override end to end', async () => {
      const root = await makeDocsTree({
        [localFile('siteonly', 'zh.yaml')]: [
          '_: 仅本地页面',
          'block:',
          '- index',
          '- faq',
          'input:',
          '  release:',
          '    _: 发行版',
          '    option:',
          '      stable:',
          '        _: 稳定版',
          '',
        ].join('\n'),
        [localFile('siteonly', 'index.zh.md')]: [
          '本地正文。',
          '',
          '```{ztmpl lang="bash" input="release"}',
          'install {{release}}',
          '```',
        ].join('\n'),
        [localFile('siteonly', 'faq.zh.md')]: '本站常见问题。',
      });

      const data = await getContentBySegments(root, ['siteonly'], 'zh');

      expect(data!.meta).toEqual({ title: '仅本地页面', cname: 'siteonly' });
      expect(data!.content).toContain('本地正文。');
      expect(data!.content).toContain('本站常见问题。');
      expect(data!.content).toContain('<codeblock id="codeblock-0" />');
      expect(data!.codeBlocks).toEqual([
        {
          id: 'codeblock-0',
          lang: 'bash',
          filepath: undefined,
          append: undefined,
          menus: [{ title: '发行版', items: [['稳定版', { release: 'stable' }]] }],
        },
      ]);
      expect(data!.compiledTemplates).toEqual({ 'codeblock-0': 'install {{release}}' });
      expect(await getAvailableSegments(root)).toEqual([['siteonly']]);
    });
  });

  describe('located errors', () => {
    it('rejects a config without a title', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: 'block:\n- index\n',
        [baseFile('demo', 'index.zh.md')]: '正文。',
      });

      await expect(getContentBySegments(root, ['demo'], 'zh')).rejects.toThrow(
        'Config file zh.yaml for page demo must have a title field "_"',
      );
    });

    it('reports page, block and line for an unsupported directive', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: ['第一行。', '', '```{foo lang="bash"}', 'code', '```'].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Unsupported directive "foo"');
      expect(message).toContain('on page demo');
      expect(message).toContain('index.zh.md');
      expect(message).toContain('at line 3');
    });

    it('reports page, block and line for an input used in a directive but not defined', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: ['第一行。', '', '```{ztmpl input="ghost"}', 'code', '```'].join('\n'),
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Input "ghost" used in directive');
      // The message carries a literal "[lang].yaml" placeholder today.
      expect(message).toContain('is not defined in [lang].yaml');
      expect(message).toContain('on page demo');
      expect(message).toContain('index.zh.md');
      expect(message).toContain('at line 3');
    });

    it('reports page, block and line for an invalid heading slug', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\n',
        [baseFile('demo', 'index.zh.md')]: '## 标题 {#Not Valid}',
      });

      const message = await errorMessageFrom(getContentBySegments(root, ['demo'], 'zh'));

      expect(message).toContain('Expected header ID to be a valid slug');
      expect(message).toContain('{#Not Valid}');
      expect(message).toContain('on page demo');
      expect(message).toContain('index.zh.md');
      expect(message).toContain('at line 1');
    });
  });

  describe('page enumeration', () => {
    it('lists the union of Base Docs and Site Override pages without duplicates', async () => {
      const root = await makeDocsTree({
        [baseFile('alpha', 'zh.yaml')]: '_: Alpha\n',
        [baseFile('beta', 'zh.yaml')]: '_: Beta\n',
        [localFile('alpha', 'zh.yaml')]: '_: Alpha 覆盖\n',
        [localFile('siteonly', 'zh.yaml')]: '_: 仅本地\n',
        'global/.hidden/keep.txt': '',
        'local/.hidden/keep.txt': '',
        'global/README.md': '',
        'site/keep.txt': '',
        'README.md': '',
      });

      const segments = await getAvailableSegments(root);

      expect(segments).toEqual([['alpha'], ['beta'], ['siteonly']]);
    });
  });

  describe('known gaps (characterization; fixed in later tickets)', () => {
    it('silently skips missing block files (current lenience)', async () => {
      const root = await makeDocsTree({
        [baseFile('demo', 'zh.yaml')]: '_: Demo 页面\nblock:\n- index\n- missing\n',
        [baseFile('demo', 'index.zh.md')]: '只有索引。',
      });

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.content).toContain('只有索引。');
    });

    it('ignores a default outside the option set (ticket 07 wants an error)', async () => {
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

      const data = await getContentBySegments(root, ['demo'], 'zh');

      expect(data!.codeBlocks[0]!.menus).toEqual([
        { title: '发行版', items: [['stable', { release: 'stable' }]] },
      ]);
    });
  });
});
