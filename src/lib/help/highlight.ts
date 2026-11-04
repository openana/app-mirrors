/**
 * Prism syntax highlighting for rendered Template output. Shared by the
 * fenced (CodeBlock) and inline (CodeInline) renderers so a `lang` attribute
 * highlights both identically (spec "Inline Templates").
 */

import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-yaml';

/**
 * Highlight rendered code for `lang`, or null when `lang` is missing or no
 * Prism grammar is loaded for it (caller falls back to plain text).
 */
export function highlightCode(code: string, lang?: string): string | null {
  if (!lang || !code) return null;
  const prismLang = lang === 'shell' || lang === 'bash' ? 'bash' : lang;
  const grammar = Prism.languages[prismLang];
  if (!grammar) return null;
  try {
    return Prism.highlight(code, grammar, prismLang);
  } catch {
    return null;
  }
}
