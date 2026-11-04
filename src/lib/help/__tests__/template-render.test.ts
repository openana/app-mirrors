/**
 * Characterization tests for the pure Template render seam (spec "Testing
 * Decisions", seam 2): "render a Template given a selection store". They lock
 * today's variable resolution — built-ins, sudo, select/switch/text inputs and
 * option-derived values — including known gaps fixed in later tickets.
 */

import { describe, expect, it } from 'vitest';
import type { InputType, Menu, MenuValue } from '../types';
import { createInitialState, renderTemplate, type TemplateSelection } from '../template-render';

const settings = {
  host: 'mirrors.example.edu.cn',
  cname: 'demo',
  sudoEnabled: true,
  httpsEnabled: true,
};

/** The selection store after picking one option of a select menu. */
function selectOption(menu: Menu, index: number): TemplateSelection {
  return { block: { ...menu.items[index]![1] } };
}

const releaseMenu: Menu = {
  title: 'Debian 版本',
  items: [
    ['Debian 13 (trixie)', { release: 'trixie', security: '-security', nonfree: ' non-free' }],
    ['sid', { release: 'sid', sid: true, nonfree: ' non-free' }],
  ],
};

describe('template render seam', () => {
  describe('built-in variables', () => {
    it('resolves the built-in URL variables from the page settings', () => {
      expect(
        renderTemplate('{{scheme}}|{{host}}|{{http_protocol}}|{{endpoint}}', {}, settings),
      ).toBe(
        'https|mirrors.example.edu.cn|https://|https://mirrors.example.edu.cn/demo',
      );
    });

    it('renders {{path}} as the project directory /<cname>', () => {
      expect(renderTemplate('rsync://{{host}}{{path}}', {}, settings)).toBe(
        'rsync://mirrors.example.edu.cn/demo',
      );
    });

    it('keeps Host + path equal to the Mirror Endpoint URL under both schemes', () => {
      const vars = '{{scheme}}|{{host}}|{{path}}|{{endpoint}}';
      expect(renderTemplate(vars, {}, settings)).toBe(
        'https|mirrors.example.edu.cn|/demo|https://mirrors.example.edu.cn/demo',
      );
      expect(renderTemplate(vars, {}, { ...settings, httpsEnabled: false })).toBe(
        'http|mirrors.example.edu.cn|/demo|http://mirrors.example.edu.cn/demo',
      );
    });

    it('renders the sudo prefixes only when sudo is enabled', () => {
      const template = '{{sudo}}apt update / {{sudoE}}cmd';
      expect(renderTemplate(template, {}, settings)).toBe('sudo apt update / sudo -E cmd');
      expect(renderTemplate(template, {}, { ...settings, sudoEnabled: false })).toBe(
        'apt update / cmd',
      );
    });

    it('renders http values when https is disabled', () => {
      expect(
        renderTemplate('{{scheme}}|{{http_protocol}}|{{endpoint}}', {}, {
          ...settings,
          httpsEnabled: false,
        }),
      ).toBe('http|http://|http://mirrors.example.edu.cn/demo');
    });

    it('reports a missing mirror for host and endpoint', () => {
      expect(renderTemplate('{{host}}|{{endpoint}}', {}, { cname: 'demo' })).toBe(
        '(no mirror selected)|(no mirror selected)',
      );
    });

    it('omits the project path from {{path}} and the endpoint when the page has no cname', () => {
      expect(
        renderTemplate('{{path}}|{{endpoint}}', {}, { host: 'mirrors.example.edu.cn' }),
      ).toBe('|https://mirrors.example.edu.cn');
    });

    it('defaults to https without sudo when no settings are given', () => {
      expect(renderTemplate('{{scheme}}|{{sudo}}ok', {}, {})).toBe('https|ok');
    });

    it('never lets selection values corrupt the built-in variables', () => {
      const selection: MenuValue = {
        scheme: 'ftp',
        host: 'evil.example',
        endpoint: 'evil',
        path: '/evil',
        sudo: 'rm -rf /',
        sudoE: 'evil',
        http_protocol: 'ftp://',
      };
      expect(
        renderTemplate('{{scheme}}|{{host}}|{{path}}|{{endpoint}}|{{sudo}}', { block: selection }, settings),
      ).toBe('https|mirrors.example.edu.cn|/demo|https://mirrors.example.edu.cn/demo|sudo ');
    });
  });

  describe('Global Inputs (ADR 0007)', () => {
    it('supplies Template Variables to templates whose block declares no input', () => {
      expect(
        renderTemplate(
          'uv add flash-attn --index astral-{{target}}={{endpoint}}/{{target}}/',
          { globals: { 'globalmenu-0': { target: 'cu128' } } },
          settings,
        ),
      ).toBe(
        'uv add flash-attn --index astral-cu128=https://mirrors.example.edu.cn/demo/cu128/',
      );
    });

    it('merges the selections of every Global Input form on the page', () => {
      const selection: TemplateSelection = {
        globals: {
          'globalmenu-0': { release: 'trixie', os: 'debian' },
          'globalmenu-1': { 'erlang-version': '27' },
        },
      };
      expect(
        renderTemplate('{{os}} {{release}} {{erlang-version}}', selection, settings),
      ).toBe('debian trixie 27');
    });

    it('resolves precedence: block inputs < Global Inputs < built-ins', () => {
      const selection: TemplateSelection = {
        block: { release: 'block-only', shared: 'from-block' },
        globals: {
          'globalmenu-0': { shared: 'from-global', scheme: 'ftp', host: 'evil.example' },
        },
      };
      expect(
        renderTemplate('{{release}}|{{shared}}|{{scheme}}|{{host}}', selection, settings),
      ).toBe('block-only|from-global|https|mirrors.example.edu.cn');
    });
  });

  describe('filter scheme enforcement (spec "Protocol enforcement")', () => {
    it('forces https URLs regardless of the HTTPS toggle on a filter: scheme: https page', () => {
      expect(
        renderTemplate('{{scheme}}|{{http_protocol}}|{{endpoint}}', {}, {
          ...settings,
          httpsEnabled: false,
          forcedScheme: 'https',
        }),
      ).toBe('https|https://|https://mirrors.example.edu.cn/demo');
    });

    it('forces the chosen scheme in both directions (any filter.scheme, not just https)', () => {
      expect(
        renderTemplate('{{scheme}}|{{http_protocol}}|{{endpoint}}', {}, {
          ...settings,
          httpsEnabled: true,
          forcedScheme: 'http',
        }),
      ).toBe('http|http://|http://mirrors.example.edu.cn/demo');
    });
  });

  describe('selection store', () => {
    it('pre-selects the first option, switch defaults and text defaults', () => {
      const menus: InputType[] = [
        {
          title: '版本',
          items: [
            ['稳定版', { release: 'stable', suite: 'stable-all' }],
            ['sid', { release: 'sid', sid: true }],
          ],
        },
        { title: '启用源码源', name: 'src', defaultValue: false, trueValue: '', falseValue: '# ' },
        { title: '官方索引', name: 'official', defaultValue: true, trueValue: true, falseValue: false },
        { title: '备注', name: 'note', defaultValue: 'abc' },
      ];
      expect(createInitialState(menus)).toEqual({
        release: 'stable',
        suite: 'stable-all',
        src: '# ',
        official: true,
        note: 'abc',
      });
    });

    it('renders option-derived companion values of the selected option', () => {
      expect(
        renderTemplate('deb {{endpoint}}/{{release}} main{{nonfree}}', selectOption(releaseMenu, 0), settings),
      ).toBe('deb https://mirrors.example.edu.cn/demo/trixie main non-free');
    });

    it('switches whole lines on non-symmetric option values', () => {
      const template = '{{#sid}}deb-src line{{/sid}}{{^sid}}binary only{{/sid}}';
      expect(renderTemplate(template, selectOption(releaseMenu, 0), settings)).toBe('binary only');
      expect(renderTemplate(template, selectOption(releaseMenu, 1), settings)).toBe('deb-src line');
    });

    it('injects switch values as line prefixes', () => {
      const template = '{{src}}deb-src {{endpoint}}/';
      expect(renderTemplate(template, { block: { src: '# ' } }, settings)).toBe(
        '# deb-src https://mirrors.example.edu.cn/demo/',
      );
      expect(renderTemplate(template, { block: { src: '' } }, settings)).toBe(
        'deb-src https://mirrors.example.edu.cn/demo/',
      );
    });

    it('renders mustache sections for boolean switches', () => {
      const template = '{{#official}}x{{/official}}';
      expect(renderTemplate(template, { block: { official: true } }, settings)).toBe('x');
      expect(renderTemplate(template, { block: { official: false } }, settings)).toBe('');
    });

    it('renders text input values', () => {
      expect(renderTemplate('note={{note}}', { block: { note: 'abc' } }, settings)).toBe('note=abc');
    });
  });

  describe('rendering contract', () => {
    it('HTML-escapes interpolated values (the rendered code is shown as HTML)', () => {
      expect(renderTemplate('{{x}}', { block: { x: 'a<b&c' } }, settings)).toBe('a&lt;b&amp;c');
    });

    it('leaves single braces and shell syntax verbatim', () => {
      const template = "awk '{print $1}' ${HOME}";
      expect(renderTemplate(template, {}, settings)).toBe(template);
    });

    it('falls back to the raw template when Hogan cannot compile it', () => {
      expect(renderTemplate('{{#open}}', {}, settings)).toBe('{{#open}}');
    });

    it('reports a missing template', () => {
      expect(renderTemplate(undefined, {}, settings)).toBe('(template not found)');
    });
  });
});
