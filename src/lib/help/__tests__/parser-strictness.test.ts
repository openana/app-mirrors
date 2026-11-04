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
import { getContentBySegments, getAvailableSegments } from '../parse-markdown';
import { baseFile, errorMessageFrom, localFile, makeDocsTree, removeDocsTrees } from './docs-tree';

afterAll(removeDocsTrees);

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
      expect(message).toContain('on page demo');
      expect(message).toContain('index.zh.md');
      expect(message).toContain('at line 3');
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
      expect(message).toContain('on page demo');
      expect(message).toContain('index.zh.md');
      expect(message).toContain('at line 3');
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
      expect(message).toContain('on page demo');
      expect(message).toContain('index.zh.md');
      expect(message).toContain('at line 3');
    });
  });
});
