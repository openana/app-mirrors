import { useState, useMemo, useCallback } from 'react';
import type { InputType, MenuValue } from '@/lib/help/types';
import { createInitialState, renderTemplate } from '@/lib/help/template-render';
import type { TemplateRenderContext } from '@/lib/help/template-render';
import { highlightCode } from '@/lib/help/highlight';
import InputMenu from './InputMenu';

/** One fenced Template's UI: its input form plus the rendered code. */
export interface CodeBlockProps extends TemplateRenderContext {
  templateId: string;
  menus?: InputType[];
  lang?: string;
  filepath?: string;
}

export default function CodeBlock({
  templateId,
  compiledTemplates,
  menus = [],
  lang,
  filepath,
  host,
  cname,
  sudoEnabled = false,
  httpsEnabled = true,
  forcedScheme,
  globals,
}: CodeBlockProps) {
  const [menuState, setMenuState] = useState<MenuValue>(() =>
    createInitialState(menus),
  );
  const [copied, setCopied] = useState(false);

  const renderedCode = useMemo(
    () =>
      renderTemplate(
        compiledTemplates[templateId],
        { block: menuState, globals },
        {
          host,
          cname,
          sudoEnabled,
          httpsEnabled,
          forcedScheme,
        },
      ),
    [templateId, compiledTemplates, menuState, globals, host, cname, sudoEnabled, httpsEnabled, forcedScheme],
  );

  const highlightedCode = useMemo(() => highlightCode(renderedCode, lang), [renderedCode, lang]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(renderedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [renderedCode]);

  return (
    <div className="codeblock-container">
      {menus.length > 0 && (
        <InputMenu
          menus={menus}
          state={menuState}
          onChange={setMenuState}
        />
      )}
      <div className="codeblock-wrapper">
        <div className="codeblock-header">
          {lang && <span className="codeblock-lang">{lang}</span>}
          {filepath && <span className="codeblock-filepath">{filepath}</span>}
          <button
            className="codeblock-copy"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <pre className={`codeblock-pre${lang ? ` language-${lang}` : ''}`}>
          <code
            dangerouslySetInnerHTML={{
              __html: highlightedCode || renderedCode,
            }}
          />
        </pre>
      </div>
    </div>
  );
}
