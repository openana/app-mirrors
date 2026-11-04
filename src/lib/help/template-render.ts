/**
 * Pure Template rendering seam (spec "Testing Decisions", seam 2).
 *
 * Renders a raw mustache Template against a selection store plus the
 * built-in variables derived from the page settings. Extracted from
 * CodeBlock.tsx so the component is a thin caller and the variable
 * resolution is testable without a DOM.
 *
 * Known gaps such as `path` always rendering empty are locked by tests
 * and fixed in later tickets (04–08).
 */

import Hogan from 'hogan.js';
import type { InputType, MenuValue } from './types';

/** Page settings the built-in Template variables are derived from. */
export interface TemplateRenderSettings {
  /** Mirror host name, e.g. "mirrors.xjtu.edu.cn" (config `host` field). */
  host?: string;
  /** Page slug (cname), e.g. "debian" — appended to the host in the Mirror Endpoint URL. */
  cname?: string;
  sudoEnabled?: boolean;
  httpsEnabled?: boolean;
}

/**
 * The reader's selections feeding one Template render (ADR 0007).
 * Resolution order: block inputs < Global Inputs < built-ins.
 */
export interface TemplateSelection {
  /** Block-local input selections (from the block's `input` attribute). */
  block?: MenuValue;
  /** Page-level Global Input selections, keyed by form id. */
  globals?: Record<string, MenuValue>;
}

/**
 * Build the initial selection store from a block's (or form's) input menus:
 * the first menu item, the switch defaults and the text defaults are
 * pre-selected so the code is correct before the reader touches anything.
 */
export function createInitialState(menus: InputType[]): MenuValue {
  return menus.reduce<MenuValue>((acc, menu) => {
    let value: MenuValue;
    if ('items' in menu) {
      value = menu.items[0]?.[1] || {};
    } else if ('trueValue' in menu) {
      value = { [menu.name]: menu.defaultValue ? menu.trueValue : menu.falseValue };
    } else {
      value = { [menu.name]: menu.defaultValue || '' };
    }
    return { ...acc, ...value };
  }, {});
}

/**
 * Render a raw mustache Template to text.
 *
 * `selection` holds the reader's input values: block-local inputs and the
 * page-level Global Input store (ADR 0007). Precedence is block inputs <
 * Global Inputs < built-ins — the built-ins always win over colliding keys
 * from any form. A missing template renders '(template not found)'; a
 * template Hogan cannot compile falls back to the raw template text.
 */
export function renderTemplate(
  rawTemplate: string | undefined,
  selection: TemplateSelection,
  settings: TemplateRenderSettings = {},
): string {
  if (!rawTemplate) return '(template not found)';

  const { host, cname, sudoEnabled = false, httpsEnabled = true } = settings;
  try {
    const template = Hogan.compile(rawTemplate);
    const scheme = httpsEnabled ? 'https' : 'http';
    const endpoint = host
      ? `${scheme}://${host}${cname ? `/${cname}` : ''}`
      : '(no mirror selected)';
    // Every Global Input form shares one page-level store; merge all forms
    // (like the reference consumer) so any form drives every Template.
    const globalValues = Object.values(selection.globals ?? {}).reduce<MenuValue>(
      (acc, values) => ({ ...acc, ...values }),
      {},
    );
    const vars: MenuValue = {
      ...selection.block,
      ...globalValues,
      endpoint,
      host: host || '(no mirror selected)',
      // Known gap (spec ticket 04): `path` is always empty instead of `/${cname}`.
      path: '',
      sudo: sudoEnabled ? 'sudo ' : '',
      sudoE: sudoEnabled ? 'sudo -E ' : '',
      http_protocol: httpsEnabled ? 'https://' : 'http://',
      scheme,
    };
    return template.render(vars);
  } catch {
    return rawTemplate;
  }
}
