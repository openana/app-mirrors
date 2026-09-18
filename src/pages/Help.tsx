import { useParams } from 'react-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import CodeBlock from '@/components/help/CodeBlock';
import HelpNav from '@/components/help/HelpNav';
import {
  HelpSettingsProvider,
  useHelpSettings,
} from '@/contexts/HelpSettingsContext';
import { mirrorSites } from '@/config/mirror-sites';
import type { InputType } from '@/lib/help/types';

interface HelpPageData {
  toc: Array<{ url: string; content: string; depth: number }>;
  content: string;
  meta: { title: string; cname: string };
  compiledTemplates: Record<string, string>;
  codeBlocks: Array<{
    id: string;
    menus: InputType[];
    lang?: string;
    filepath?: string;
  }>;
}

/**
 * Splits HTML content at <codeblock id="..." /> tags and returns an array
 * of segments: { type: 'html', content } or { type: 'codeblock', id }.
 */
function splitContentAtCodeblocks(html: string) {
  const parts: Array<
    | { type: 'html'; content: string }
    | { type: 'codeblock'; id: string }
  > = [];

  const regex = /<codeblock\s+id="([^"]+)"\s*\/>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    if (match[1]) parts.push({ type: 'codeblock', id: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < html.length) {
    parts.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return parts;
}

function HelpSettingsBar() {
  const {
    selectedSite,
    sudoEnabled,
    httpsEnabled,
    setSelectedSiteId,
    setSudoEnabled,
    setHttpsEnabled,
  } = useHelpSettings();

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
          Domain
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
          checked={httpsEnabled}
          onChange={useCallback(() => setHttpsEnabled((v) => !v), [setHttpsEnabled])}
        />
        <span>HTTPS</span>
      </label>
    </div>
  );
}

function HelpContent({
  data,
}: {
  data: HelpPageData;
}) {
  const { selectedSite, sudoEnabled, httpsEnabled } = useHelpSettings();

  const codeBlockMap = useMemo(() => {
    const map = new Map<string, (typeof data.codeBlocks)[0]>();
    for (const cb of data.codeBlocks) {
      map.set(cb.id, cb);
    }
    return map;
  }, [data.codeBlocks]);

  const segments = useMemo(
    () => splitContentAtCodeblocks(data.content),
    [data.content],
  );

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return (
            <div
              key={`html-${i}`}
              dangerouslySetInnerHTML={{ __html: seg.content }}
            />
          );
        }
        const cb = codeBlockMap.get(seg.id);
        if (!cb) return null;
        return (
          <CodeBlock
            key={cb.id}
            templateId={cb.id}
            compiledTemplates={data.compiledTemplates}
            menus={cb.menus}
            lang={cb.lang}
            filepath={cb.filepath}
            mirrorUrl={selectedSite.endpoint}
            cname={data.meta.cname}
            sudoEnabled={sudoEnabled}
            httpsEnabled={httpsEnabled}
          />
        );
      })}
    </>
  );
}

function HelpPage() {
  const { '*': splat } = useParams();
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

  const content = (() => {
    if (!splat) {
      return (
        <div className="help-placeholder">
          <span className="material-icons" style={{ fontSize: 40, color: 'var(--text-faint)' }}>menu_book</span>
          <p>Select a page from the sidebar to get started.</p>
        </div>
      );
    }
    if (loading) {
      return <div className="help-loading">Loading...</div>;
    }
    if (error || !data) {
      return (
        <div className="help-error">
          <p>Page not found: {splat}</p>
        </div>
      );
    }
    return (
      <HelpSettingsProvider>
        <h1>{data.meta.title}</h1>
        <HelpSettingsBar />
        <HelpContent data={data} />
      </HelpSettingsProvider>
    );
  })();

  const toc = data ? (
    <aside className="help-toc">
      <div className="help-toc-header">
        <span className="material-icons" style={{ fontSize: 20 }}>toc</span>
        <span className="help-toc-title">On this page</span>
      </div>
      <nav className="help-toc-list">
        {data.toc.map((heading, i) => (
          <a
            key={`${heading.url}-${i}`}
            href={heading.url}
            className={`help-toc-item${heading.depth === 3 ? ' deep' : ''}`}
          >
            {heading.content}
          </a>
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
