import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { useMirrors } from '@/lib/client/mirrors';
import { useTranslation } from '@/i18n';

interface HelpNavProps {
  /** Current active help page href, e.g. "/help/AOSP/" */
  activeHref?: string;
}

export default function HelpNav({ activeHref }: HelpNavProps) {
  const { data: mirrors } = useMirrors();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<Record<string, { title: string; cname: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/help/routes.json')
      .then((res) => (res.ok ? res.json() : {}))
      .then((r) => {
        setRoutes(r);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        filterRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const mirrorNames = useMemo(() => {
    if (!mirrors) return new Set<string>();
    return new Set(mirrors.map((m) => m.name));
  }, [mirrors]);

  const entries = useMemo(() => {
    return Object.entries(routes)
      .filter(([, meta]) => mirrorNames.has(meta.cname))
      .sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [routes, mirrorNames]);

  const regex = useMemo(() => {
    if (!filter) return null;
    try {
      return new RegExp(filter, 'i');
    } catch {
      return null;
    }
  }, [filter]);

  const filtered = useMemo(() => {
    if (!regex) return entries;
    return entries.filter(
      ([, meta]) => regex.test(meta.title) || regex.test(meta.cname),
    );
  }, [entries, regex]);

  if (loading) return <aside className="help-nav"><div className="help-loading">{t('help.loading')}</div></aside>;

  return (
    <aside className="help-nav">
      <div className="mini-search">
        <span className="material-icons" style={{ fontSize: 16 }}>search</span>
        <input
          ref={filterRef}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('help.filterPlaceholder')}
        />
      </div>
      <div className="help-nav-list">
        {filtered.length === 0 ? (
          <div className="help-nav-empty">{t('help.noMatches')}</div>
        ) : (
          filtered.map(([href, meta]) => (
            <Link
              key={href}
              to={href}
              className={href === activeHref ? 'active' : ''}
            >
              <h3>{meta.title}</h3>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}