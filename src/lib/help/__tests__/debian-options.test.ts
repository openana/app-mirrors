/**
 * Debian real-page regression (spec Testing Decisions: "Debian (multi-input,
 * non-symmetric options)"): the real Base Docs page builds with several
 * inputs on one Template and its non-symmetric `sid` option renders through
 * the render seam (seam 2) — companion values included (the `security`
 * suffix exists for releases but not for `sid`). Gated on the Base Docs
 * submodule being present in the checkout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getContentBySegments } from '../parse-markdown';
import { createInitialState, renderTemplate } from '../template-render';

const zdocDir = path.resolve(process.cwd(), 'zdoc');

const settings = {
  host: 'mirrors.example.edu.cn',
  cname: 'debian',
  sudoEnabled: true,
  httpsEnabled: true,
};

describe.skipIf(!fs.existsSync(zdocDir))('debian on real Base Docs pages', () => {
  it('builds with multiple inputs on the sources.list Template', async () => {
    const data = await getContentBySegments(zdocDir, ['debian'], 'zh');

    expect(data).not.toBeNull();
    expect(data!.meta.cname).toBe('debian');

    const block = data!.codeBlocks.find((b) => b.filepath === '/etc/apt/sources.list');
    expect(block).toBeDefined();
    expect(block!.menus.map((m) => m.title)).toEqual([
      'Debian 版本',
      '启用源码源',
      '使用非自由软件源',
      '强制安全更新使用镜像',
    ]);
  });

  it('renders the default release with its companion security suffix', async () => {
    const data = await getContentBySegments(zdocDir, ['debian'], 'zh');
    const block = data!.codeBlocks.find((b) => b.filepath === '/etc/apt/sources.list')!;

    const rendered = renderTemplate(
      data!.compiledTemplates[block.id],
      { block: createInitialState(block.menus) },
      settings,
    );

    expect(rendered).not.toContain('{{');
    // trixie is pre-selected; its `security` companion value builds the suite suffix.
    expect(rendered).toContain(
      'deb https://mirrors.example.edu.cn/debian/ trixie main contrib non-free non-free-firmware',
    );
    expect(rendered).toContain(
      'deb https://security.debian.org/debian-security trixie-security main contrib non-free non-free-firmware',
    );
  });

  it('renders the non-symmetric sid option without its absent companion values', async () => {
    const data = await getContentBySegments(zdocDir, ['debian'], 'zh');
    const block = data!.codeBlocks.find((b) => b.filepath === '/etc/apt/sources.list')!;

    // A reader switching the release menu to sid: the old item's values are
    // replaced by sid's — which carry the boolean `sid` flag and no
    // `security` suffix.
    const rendered = renderTemplate(
      data!.compiledTemplates[block.id],
      {
        block: {
          src: '# ',
          nf: true,
          mirror_security: false,
          release: 'sid',
          sid: true,
          nonfree: ' non-free non-free-firmware',
        },
      },
      settings,
    );

    expect(rendered).not.toContain('{{');
    expect(rendered).toContain(
      'deb https://mirrors.example.edu.cn/debian/ sid main contrib non-free non-free-firmware',
    );
    // The {{^sid}} release lines (and their suite suffixes) are gone …
    expect(rendered).not.toContain('trixie');
    expect(rendered).not.toContain('sid-updates');
    expect(rendered).not.toContain('sid-backports');
    // … and the absent `security` companion never invents a sid-security suite.
    expect(rendered).not.toContain('sid-security');
  });
});
