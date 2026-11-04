/**
 * Relative doc-to-doc references (bug regression): a Help Doc that links to
 * another Help Doc with a relative href ("../beta/") must render an in-app
 * link to the target page. The app's canonical help URL is the route
 * "/help/<slug>/" (routes.json keys, HelpNav `to` props) in hash-href form
 * "#/help/<slug>/" under HashRouter (same convention as anchorHref in
 * Help.tsx). External URLs and bare in-page "#anchor" links are untouched.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { getContentBySegments } from '../parse-markdown';
import { baseFile, makeDocsTree, removeDocsTrees } from './docs-tree';

afterAll(removeDocsTrees);

describe('relative references to other help docs', () => {
  it('rewrites ../<page>/ links to the target page URL', async () => {
    const root = await makeDocsTree({
      [baseFile('alpha', 'zh.yaml')]: '_: Alpha 页面\n',
      [baseFile('alpha', 'index.zh.md')]: [
        '参见 [Beta 帮助](../beta/)。',
        '',
        '亦见 [Git 帮助](../linux.git/)。',
      ].join('\n'),
    });

    const data = await getContentBySegments(root, ['alpha'], 'zh');

    expect(data).not.toBeNull();
    expect(data!.content).toContain('href="#/help/beta/"');
    expect(data!.content).toContain('href="#/help/linux.git/"');
    expect(data!.content).not.toContain('href="../');
  });

  it('keeps an anchor on the target page', async () => {
    const root = await makeDocsTree({
      [baseFile('alpha', 'zh.yaml')]: '_: Alpha 页面\n',
      [baseFile('alpha', 'index.zh.md')]: '见 [Beta 配置](../beta/#config)。',
    });

    const data = await getContentBySegments(root, ['alpha'], 'zh');

    expect(data!.content).toContain('href="#/help/beta/#config"');
  });

  it('leaves external URLs untouched', async () => {
    const root = await makeDocsTree({
      [baseFile('alpha', 'zh.yaml')]: '_: Alpha 页面\n',
      [baseFile('alpha', 'index.zh.md')]:
        '见 [官网](https://example.org/docs/)。',
    });

    const data = await getContentBySegments(root, ['alpha'], 'zh');

    expect(data!.content).toContain('href="https://example.org/docs/"');
  });

  it('leaves bare in-page anchors to the runtime anchor rewriter', async () => {
    const root = await makeDocsTree({
      [baseFile('alpha', 'zh.yaml')]: '_: Alpha 页面\n',
      [baseFile('alpha', 'index.zh.md')]: [
        '见 [配置](#config)。',
        '',
        '## 配置 {#config}',
      ].join('\n'),
    });

    const data = await getContentBySegments(root, ['alpha'], 'zh');

    expect(data!.content).toContain('href="#config"');
  });
});
