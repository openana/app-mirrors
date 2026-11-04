/**
 * Protocol enforcement regressions (spec "Protocol enforcement", user
 * stories 13–14, ticket 08) on the real Base Docs pages: pypi,
 * crates.io-index and pytorch declare `filter: scheme: https`, so every
 * Template — fenced and inline — renders https URLs even with the reader's
 * HTTPS toggle off. Gated on the Base Docs submodule being present in the
 * checkout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getContentBySegments } from '../parse-markdown';
import { createInitialState, renderTemplate } from '../template-render';
import type { HelpPageData, MenuValue } from '../types';

const zdocDir = path.resolve(process.cwd(), 'zdoc');

/**
 * Render every Template of a page the way the help page does (fenced and
 * inline), with the reader's HTTPS toggle OFF: the page's `filter.scheme`
 * must still force https URLs everywhere.
 */
function renderAllWithToggleOff(data: HelpPageData): string[] {
  const globals: Record<string, MenuValue> = Object.fromEntries(
    (data.globalForms ?? []).map((form) => [form.id, createInitialState(form.menus)]),
  );
  const settings = {
    host: 'mirrors.example.edu.cn',
    cname: data.meta.cname,
    sudoEnabled: true,
    httpsEnabled: false,
    forcedScheme: data.meta.filter?.scheme,
  };
  return [
    ...data.codeBlocks.map((block) =>
      renderTemplate(
        data.compiledTemplates[block.id],
        { block: createInitialState(block.menus), globals },
        settings,
      ),
    ),
    ...(data.inlineTemplates ?? []).map((tpl) =>
      renderTemplate(data.compiledTemplates[tpl.id], { globals }, settings),
    ),
  ];
}

describe.skipIf(!fs.existsSync(zdocDir))('filter scheme enforcement on real Base Docs pages', () => {
  for (const page of ['pypi', 'crates.io-index', 'pytorch']) {
    it(`${page}: every Template renders https-only despite the HTTPS toggle being off`, async () => {
      const data = await getContentBySegments(zdocDir, [page], 'zh');

      expect(data).not.toBeNull();
      expect(data!.meta.filter).toEqual({ scheme: 'https' });

      const rendered = renderAllWithToggleOff(data!);
      expect(rendered.length).toBeGreaterThan(0);
      for (const code of rendered) {
        expect(code).not.toContain('{{');
        // https-only: no http URL, and the mirror is only ever addressed over https.
        expect(code).not.toContain('http://');
        for (const m of code.match(/(?:https?:\/\/)?mirrors\.example\.edu\.cn/g) ?? []) {
          expect(m).toBe('https://mirrors.example.edu.cn');
        }
      }
      expect(rendered.some((code) => code.includes(`https://mirrors.example.edu.cn/${page}`))).toBe(
        true,
      );
    });
  }

  it('pypi: pip command renders the https Mirror Endpoint URL (worked example)', async () => {
    const data = await getContentBySegments(zdocDir, ['pypi'], 'zh');

    expect(data).not.toBeNull();
    expect(renderAllWithToggleOff(data!)).toContain(
      'pip install -i https://mirrors.example.edu.cn/pypi/web/simple some-package',
    );
  });

  it('crates.io-index: sparse registry renders the https Mirror Endpoint URL (worked example)', async () => {
    const data = await getContentBySegments(zdocDir, ['crates.io-index'], 'zh');

    expect(data).not.toBeNull();
    const rendered = renderAllWithToggleOff(data!).join('\n');
    expect(rendered).toContain('registry = "sparse+https://mirrors.example.edu.cn/crates.io-index/"');
  });

  it('pytorch: index URL renders the https Mirror Endpoint URL with the default target (worked example)', async () => {
    const data = await getContentBySegments(zdocDir, ['pytorch'], 'zh');

    expect(data).not.toBeNull();
    const rendered = renderAllWithToggleOff(data!).join('\n');
    expect(rendered).toContain('--index-url https://mirrors.example.edu.cn/pytorch/whl/cu128');
  });
});
