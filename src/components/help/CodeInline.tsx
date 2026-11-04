import { renderTemplate } from '@/lib/help/template-render';
import type { TemplateRenderContext } from '@/lib/help/template-render';
import { highlightCode } from '@/lib/help/highlight';

export interface CodeInlineProps extends TemplateRenderContext {
  templateId: string;
  lang?: string;
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
  forcedScheme,
  globals,
}: CodeInlineProps) {
  const rendered = renderTemplate(
    compiledTemplates[templateId],
    { globals },
    { host, cname, sudoEnabled, httpsEnabled, forcedScheme },
  );
  return (
    <code
      className={lang ? `language-${lang}` : undefined}
      dangerouslySetInnerHTML={{ __html: highlightCode(rendered, lang) ?? rendered }}
    />
  );
}
