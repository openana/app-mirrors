import { Link, useLocation, useParams } from 'react-router';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import CodeBlock from '@/components/help/CodeBlock';
import InputMenu from '@/components/help/InputMenu';
import CodeInline from '@/components/help/CodeInline';
import HelpNav from '@/components/help/HelpNav';
import {
  HelpSettingsProvider,
  useHelpSettings,
} from '@/contexts/HelpSettingsContext';
import { mirrorSites } from '@/config/mirror-sites';
import { useTranslation } from '@/i18n';
import type { HelpPageData, InlineTemplate, MenuValue } from '@/lib/help/types';
import { createInitialState } from '@/lib/help/template-render';
import type { TemplateRenderContext } from '@/lib/help/template-render';

type ContentSegment =
  | { type: 'html'; content: string }
  | { type: 'codeblock'; id: string }
  | { type: 'globalmenu'; id: string };

/**
 * Splits HTML content at <codeblock id="..." /> and <globalmenu id="..." />
 * tags and returns an array of segments: { type: 'html', content } or
 * { type: 'codeblock' | 'globalmenu', id }.
 */
function splitContentAtPlaceholders(html: string): ContentSegment[] {
  const parts: ContentSegment[] = [];

  const regex = /<(codeblock|globalmenu)\s+id="([^"]+)"\s*\/>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      parts.push({ type: match[1] as 'codeblock' | 'globalmenu', id: match[2] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < html.length) {
    parts.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return parts;
}

/**
 * HashRouter keeps the route in the URL fragment, so a bare "#anchor" href
 * replaces the whole hash route and drops the user back to the root page.
 * In-page anchors must therefore carry the route path:
 * "#anchor" → "#/help/debian#anchor".
 */
function anchorHref(pathname: string, anchor: string) {
  return `#${pathname}#${anchor.replace(/^#/, '')}`;
}

/** Rewrites in-page anchors in rendered HTML so they survive HashRouter. */
function rewriteAnchorLinks(html: string, pathname: string) {
  return html.replace(
    /href="#([^"]*)"/g,
    (_m, anchor: string) => `href="${anchorHref(pathname, anchor)}"`,
  );
}

/**
 * One content HTML segment. Inline Templates sit inside prose (list items,
 * table cells), so unlike block placeholders they must not split the segment
 * apart: their `<codeinline id>` targets are mounted via portals instead,
 * keeping the surrounding HTML structure intact. The wrapper div is
 * `display: contents` so the segment lays out exactly as the raw HTML would.
 */
function ContentHtml({
  html,
  inlineTemplates,
  ...render
}: {
  html: string;
  inlineTemplates: Map<string, InlineTemplate>;
} & TemplateRenderContext) {
  const ref = useRef<HTMLDivElement>(null);
  const [targets, setTargets] = useState<
    Array<{ id: string; node: HTMLElement }>
  >([]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    setTargets(
      Array.from(root.querySelectorAll<HTMLElement>('codeinline[id]')).map(
        (node) => ({ id: node.getAttribute('id')!, node }),
      ),
    );
  }, [html]);

  return (
    <div ref={ref} style={{ display: 'contents' }}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {targets.map(({ id, node }) => {
        const entry = inlineTemplates.get(id);
        if (!entry) return null;
        return createPortal(
          <CodeInline key={id} templateId={id} lang={entry.lang} {...render} />,
          node,
        );
      })}
    </div>
  );
}

function HelpSettingsBar({ forcedScheme }: { forcedScheme?: string }) {
  const {
    selectedSite,
    sudoEnabled,
    httpsEnabled,
    setSelectedSiteId,
    setSudoEnabled,
    setHttpsEnabled,
  } = useHelpSettings();
  const { t } = useTranslation();

  const handleSiteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedSiteId(e.target.value);
    },
    [setSelectedSiteId],
  );

  return (
    <div className="help-settings-bar">
      <div className="help-setting">
        <label className="help-setting-label" htmlFor="help-site-select">
          {t('help.domain')}
        </label>
        <select
          id="help-site-select"
          className="help-site-select"
          value={selectedSite.id}
          onChange={handleSiteChange}
        >
          {mirrorSites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>
      <div className="help-setting-separator" />
      <label className="help-toggle">
        <input
          type="checkbox"
          checked={sudoEnabled}
          onChange={useCallback(() => setSudoEnabled((v) => !v), [setSudoEnabled])}
        />
        <span>sudo</span>
      </label>
      <label className="help-toggle">
        <input
          type="checkbox"
          checked={forcedScheme ? forcedScheme === 'https' : httpsEnabled}
          disabled={Boolean(forcedScheme)}
          onChange={useCallback(() => setHttpsEnabled((v) => !v), [setHttpsEnabled])}
        />
        <span>HTTPS</span>
      </label>
      {/* Spec "Protocol enforcement" (story 14): a filtered page disables the toggle with a hint. */}
      {forcedScheme && (
        <span className="help-toggle-hint">{t('help.httpsOnlyHint')}</span>
      )}
    </div>
  );
}

function HelpContent({
  data,
}: {
  data: HelpPageData;
}) {
  const { selectedSite, sudoEnabled, httpsEnabled } = useHelpSettings();
  const { pathname } = useLocation();

  const codeBlockMap = useMemo(() => {
    const map = new Map<string, (typeof data.codeBlocks)[0]>();
    for (const cb of data.codeBlocks) {
      map.set(cb.id, cb);
    }
    return map;
  }, [data.codeBlocks]);

  const globalFormMap = useMemo(() => {
    const map = new Map<string, (typeof data.globalForms)[0]>();
    for (const form of data.globalForms ?? []) {
      map.set(form.id, form);
    }
    return map;
  }, [data.globalForms]);

  const inlineTemplateMap = useMemo(() => {
    const map = new Map<string, InlineTemplate>();
    for (const tpl of data.inlineTemplates ?? []) {
      map.set(tpl.id, tpl);
    }
    return map;
  }, [data.inlineTemplates]);

  // One page-level selection store drives every Template on the page
  // (ADR 0007); initial values come from the forms' defaults.
  const [globalState, setGlobalState] = useState<Record<string, MenuValue>>(
    () =>
      Object.fromEntries(
        (data.globalForms ?? []).map((form) => [
          form.id,
          createInitialState(form.menus),
        ]),
      ),
  );

  const segments = useMemo(
    () => splitContentAtPlaceholders(rewriteAnchorLinks(data.content, pathname)),
    [data.content, pathname],
  );

  // One render context drives every Template on the page: the compiled
  // templates, the page-level Global Input store and the built-in settings
  // spelled out once (ADR 0007).
  const render: TemplateRenderContext = useMemo(
    () => ({
      compiledTemplates: data.compiledTemplates,
      host: selectedSite.host,
      cname: data.meta.cname,
      sudoEnabled,
      httpsEnabled,
      forcedScheme: data.meta.filter?.scheme,
      globals: globalState,
    }),
    [
      data.compiledTemplates,
      data.meta.cname,
      data.meta.filter?.scheme,
      selectedSite.host,
      sudoEnabled,
      httpsEnabled,
      globalState,
    ],
  );

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return (
            <ContentHtml
              key={`html-${i}`}
              html={seg.content}
              inlineTemplates={inlineTemplateMap}
              {...render}
            />
          );
        }
        if (seg.type === 'globalmenu') {
          // A Global Input form renders where its global="true" Template
          // sits; its body was ignored by the pipeline.
          const form = globalFormMap.get(seg.id);
          if (!form) return null;
          return (
            <InputMenu
              key={seg.id}
              menus={form.menus}
              state={globalState[seg.id] ?? {}}
              onChange={(newState) =>
                setGlobalState((prev) => ({ ...prev, [seg.id]: newState }))
              }
            />
          );
        }
        const cb = codeBlockMap.get(seg.id);
        if (!cb) return null;
        return (
          <CodeBlock
            key={cb.id}
            templateId={cb.id}
            menus={cb.menus}
            lang={cb.lang}
            filepath={cb.filepath}
            {...render}
          />
        );
      })}
    </>
  );
}

function HelpPage() {
  const { '*': splat } = useParams();
  const location = useLocation();
  const { t } = useTranslation();
  const [data, setData] = useState<HelpPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalise to href form: "/help/AOSP/"
  const activeHref = splat ? `/help/${splat.replace(/\/$/, '')}/` : undefined;

  useEffect(() => {
    if (!splat) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/help/${splat.replace(/\/$/, '')}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Page not found: ${splat}`);
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [splat]);

  // The browser cannot resolve in-page anchors nested inside the HashRouter
  // fragment, so scroll to the target ourselves.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id || !data) return;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location, data]);

  const content = (() => {
    if (!splat) {
      return (
        <div className="help-placeholder">
          <span className="material-icons" style={{ fontSize: 40, color: 'var(--text-faint)' }}>menu_book</span>
          <p>{t('help.selectPage')}</p>
        </div>
      );
    }
    if (loading) {
      return <div className="help-loading">{t('help.loading')}</div>;
    }
    if (error || !data) {
      return (
        <div className="help-error">
          <p>{t('help.pageNotFound', { page: splat })}</p>
        </div>
      );
    }
    return (
      <HelpSettingsProvider>
        <h1>{data.meta.title}</h1>
        <HelpSettingsBar forcedScheme={data.meta.filter?.scheme} />
        {/* key: per-page state reset — the selection stores belong to one Help Doc */}
        <HelpContent key={data.meta.cname} data={data} />
      </HelpSettingsProvider>
    );
  })();

  const toc = data ? (
    <aside className="help-toc">
      <div className="help-toc-header">
        <span className="material-icons" style={{ fontSize: 20 }}>toc</span>
        <span className="help-toc-title">{t('help.tocTitle')}</span>
      </div>
      <nav className="help-toc-list">
        {data.toc.map((heading, i) => (
          <Link
            key={`${heading.url}-${i}`}
            to={{ pathname: location.pathname, hash: heading.url }}
            className={`help-toc-item${heading.depth === 3 ? ' deep' : ''}`}
          >
            {heading.content}
          </Link>
        ))}
      </nav>
    </aside>
  ) : null;

  return (
    <div className="help-page">
      <HelpNav activeHref={activeHref} />
      <article className="help-content">
        {content}
      </article>
      {toc}
    </div>
  );
}

export default function Help() {
  return <HelpPage />;
}
