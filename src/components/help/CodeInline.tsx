import type { MenuValue } from '@/lib/help/types';
import { renderTemplate } from '@/lib/help/template-render';
import { highlightCode } from '@/lib/help/highlight';

export interface CodeInlineProps {
  templateId: string;
  compiledTemplates: Record<string, string>;
  lang?: string;
  /** Mirror Host (domain name), e.g. "mirrors.xjtu.edu.cn" (glossary: Host) */
  host?: string;
  /** Page slug, e.g. "debian" — appended to the host in the Mirror Endpoint URL */
  cname?: string;
  sudoEnabled?: boolean;
  httpsEnabled?: boolean;
  /** Page-level Global Input selections (ADR 0007). */
  globals?: Record<string, MenuValue>;
}

/**
 * Inline Template (spec "Inline Templates", user stories 10–12): a code span
 * rendered through the shared render seam — same engine and variable context
 * as fenced Templates — with optional `lang` syntax highlighting. Mounted
 * into the `<codeinline id>` placeholders the pipeline leaves in the content
 * HTML.
 */
export default function CodeInline({
  templateId,
  compiledTemplates,
  lang,
  host,
  cname,
  sudoEnabled = false,
  httpsEnabled = true,
  globals,
}: CodeInlineProps) {
  const rendered = renderTemplate(
    compiledTemplates[templateId],
    { globals },
    { host, cname, sudoEnabled, httpsEnabled },
  );
  return (
    <code
      className={lang ? `language-${lang}` : undefined}
      dangerouslySetInnerHTML={{ __html: highlightCode(rendered, lang) ?? rendered }}
    />
  );
}
