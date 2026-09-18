import { useParams, Link } from 'react-router';
import { useState, useEffect } from 'react';

interface HelpPageData {
  toc: Array<{ url: string; content: string; depth: number }>;
  content: string;
  meta: { title: string; cname: string };
  compiledTemplates: Record<string, string>;
}

export default function Help() {
  const { '*': splat } = useParams();
  const [data, setData] = useState<HelpPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!splat) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/help/${splat}.json`)
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

  if (!splat) {
    return <HelpIndex />;
  }

  if (loading) {
    return (
      <div className="help-page">
        <div className="help-loading">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="help-page">
        <div className="help-error">
          <p>Page not found: {splat}</p>
          <Link to="/help/">← Back to help index</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="help-page">
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
      <article className="help-content">
        <Link to="/help/" className="help-back">← Help index</Link>
        <h1>{data.meta.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: data.content }} />
      </article>
    </div>
  );
}

function HelpIndex() {
  const [routes, setRoutes] = useState<Record<string, { title: string; cname: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/help/routes.json')
      .then((res) => (res.ok ? res.json() : {}))
      .then((r) => {
        setRoutes(r);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="help-page"><div className="help-loading">Loading...</div></div>;

  const entries = Object.entries(routes).sort((a, b) => a[1].title.localeCompare(b[1].title));

  return (
    <div className="help-page">
      <div className="help-index">
        <h1>Help Documentation</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Configuration guides for each mirror.
        </p>
        {entries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            No help docs available. Run <code>npm run build:help</code> to generate them.
          </p>
        ) : (
          <ul className="help-index-list">
            {entries.map(([href, meta]) => (
              <li key={href}>
                <Link to={href}>{meta.title}</Link>
                <span className="help-index-cname">{meta.cname}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}