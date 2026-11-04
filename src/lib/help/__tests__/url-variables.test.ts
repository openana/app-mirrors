/**
 * URL Template Variable regressions (spec user stories 15–16, ticket 04)
 * on the real Base Docs pages: `{{path}}` renders the project directory
 * `/<cname>` and the Mirror Endpoint URL is scheme + Host + path, so the
 * gentoo-portage / gentoo-portage-prefix rsync lines and the ghcup
 * install-script URLs render complete and copy-pasteable. Gated on the
 * Base Docs submodule being present in the checkout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getContentBySegments } from '../parse-markdown';
import { createInitialState, renderTemplate } from '../template-render';
import type { HelpPageData } from '../types';

const zdocDir = path.resolve(process.cwd(), 'zdoc');

const settings = (cname: string) => ({
  host: 'mirrors.example.edu.cn',
  cname,
  sudoEnabled: true,
  httpsEnabled: true,
});

/** Render every code block of a page the way the help page does. */
function renderAll(data: HelpPageData): string[] {
  return data.codeBlocks.map((block) =>
    renderTemplate(
      data.compiledTemplates[block.id],
      { block: createInitialState(block.menus) },
      settings(data.meta.cname),
    ),
  );
}

/** The rendered text of every block whose template contains `marker`. */
function renderBlocksContaining(data: HelpPageData, marker: string): string[] {
  return data.codeBlocks
    .filter((block) => data.compiledTemplates[block.id]!.includes(marker))
    .map((block) =>
      renderTemplate(
        data.compiledTemplates[block.id],
        { block: createInitialState(block.menus) },
        settings(data.meta.cname),
      ),
    );
}

describe.skipIf(!fs.existsSync(zdocDir))('URL variables on real Base Docs pages', () => {
  it('gentoo-portage: rsync line includes the project directory', async () => {
    const data = await getContentBySegments(zdocDir, ['gentoo-portage'], 'zh');

    expect(data).not.toBeNull();
    const rendered = renderBlocksContaining(data!, '{{host}}{{path}}');
    expect(rendered.length).toBeGreaterThan(0);
    for (const code of rendered) {
      expect(code.trim()).toBe('sync-uri = rsync://mirrors.example.edu.cn/gentoo-portage');
    }
  });

  it('gentoo-portage-prefix: rsync line includes the project directory', async () => {
    const data = await getContentBySegments(zdocDir, ['gentoo-portage-prefix'], 'zh');

    expect(data).not.toBeNull();
    const rendered = renderBlocksContaining(data!, '{{host}}{{path}}');
    expect(rendered.length).toBeGreaterThan(0);
    for (const code of rendered) {
      expect(code).toContain('sync-uri = rsync://mirrors.example.edu.cn/gentoo-portage-prefix');
      expect(code).not.toContain('{{host}}{{path}}');
    }
  });

  it('ghcup: install-script URLs and Mirror Endpoint URLs render complete', async () => {
    const data = await getContentBySegments(zdocDir, ['ghcup'], 'zh');

    expect(data).not.toBeNull();
    for (const code of renderAll(data!)) {
      expect(code).not.toContain('{{');
    }

    for (const code of renderBlocksContaining(data!, 'script/install.sh')) {
      expect(code).toContain(
        'https://mirrors.example.edu.cn/ghcup/script/install.sh',
      );
      expect(code).not.toContain('{{host}}{{path}}');
    }

    const yamlBlocks = renderBlocksContaining(data!, '{{endpoint}}/yaml/ghcup/');
    expect(yamlBlocks.length).toBeGreaterThan(0);
    for (const code of yamlBlocks) {
      expect(code).toContain(
        'https://mirrors.example.edu.cn/ghcup/yaml/ghcup/data/ghcup-0.0.8.yaml',
      );
    }
  });
});
