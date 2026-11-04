/**
 * The forced-scheme toggle hint is scheme-parameterized copy (review
 * finding 12): enforcement is generic — a `scheme: http` filter forces
 * http — so the hint must read correctly for any forced scheme, not just
 * https. Asserted at the locale-data seam (the only seam for copy) so the
 * wording cannot silently hardcode HTTPS again. Operator-reviewable copy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const localesDir = path.resolve(process.cwd(), 'src/i18n/locales');

function loadLocale(name: string): { help: Record<string, string> } {
  return JSON.parse(fs.readFileSync(path.join(localesDir, name), 'utf-8'));
}

const en = loadLocale('en_us.json');
const zh = loadLocale('zh_cn.json');

const hintOf = (locale: { help: Record<string, string> }): string =>
  locale.help.schemeOnlyHint ?? '(missing)';

describe('forced-scheme toggle hint copy', () => {
  it('is parameterized with the forced scheme in both locales', () => {
    for (const locale of [en, zh]) {
      expect(hintOf(locale)).toContain('{scheme}');
    }
  });

  it('keeps the decided wording when the forced scheme is https', () => {
    expect(hintOf(en).replace('{scheme}', 'HTTPS')).toBe(
      'This project is only served over HTTPS',
    );
    expect(hintOf(zh).replace('{scheme}', 'HTTPS')).toBe(
      '此项目仅提供 HTTPS 镜像',
    );
  });
});
