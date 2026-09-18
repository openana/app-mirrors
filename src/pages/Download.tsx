import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useDownloadList } from '@/lib/client/downloads';
import { useTranslation } from '@/i18n';

function priority(c: string): number {
  if (c === 'os') return 0;
  if (c === 'app') return 1;
  if (c === 'font') return 2;
  return 100;
}

export default function Download() {
  const { category = 'os', distro } = useParams();
  const navigate = useNavigate();
  const { data: siteData, error, isLoading } = useDownloadList();
  const { t } = useTranslation();
  const [distroFilter, setDistroFilter] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        filterInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { allCat, allDistro, matchingUrls } = useMemo(() => {
    if (!siteData) return { allCat: new Set<string>(), allDistro: {} as Record<string, string>, matchingUrls: [] as { name: string; url: string }[] };

    const allCat = new Set<string>();
    const allDistro: Record<string, string> = {};
    const matchingUrls: { name: string; url: string }[] = [];

    for (const entry of siteData) {
      allCat.add(entry.category);
      allDistro[entry.distro] = entry.category;
      if (
        entry.category.replace(/\s/g, '') === category &&
        entry.distro.replace(/\s/g, '') === (distro || '')
      ) {
        matchingUrls.push(...entry.urls);
      }
    }

    return { allCat, allDistro, matchingUrls };
  }, [siteData, category, distro]);

  // Default redirect: /download -> /download/os/ubuntu
  useEffect(() => {
    if (!distro && allCat.has(category) && siteData) {
      const firstDistro = Object.entries(allDistro)
        .filter(([, c]) => c.replace(/\s/g, '') === category)
        .sort((a, b) => a[0].localeCompare(b[0]))[0];
      if (firstDistro) {
        navigate(`/download/${category}/${firstDistro[0].replace(/\s/g, '')}`, { replace: true });
      }
    }
  }, [category, distro, allCat, allDistro, siteData, navigate]);

  if (error) return <div className="download-page"><div className="page-head">{t('download.error')}</div></div>;
  if (isLoading) return <div className="download-page"><div className="page-head">{t('download.loading')}</div></div>;
  if (!allCat.has(category)) return <div className="download-page"><div className="page-head">{t('download.categoryNotFound')}</div></div>;

  const categories = Array.from(allCat).sort((a, b) => priority(a) - priority(b));
  const distros = Object.entries(allDistro)
    .filter(([, c]) => c.replace(/\s/g, '') === category)
    .filter(([d]) => !distroFilter || d.toLowerCase().includes(distroFilter.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="download-page">
      <header className="page-head">
        <h1 className="tagline">{t('download.title')}</h1>
        <p className="tagline-sub">{t('download.subtitle')}</p>
        <div className="category-tabs">
          {categories.map((c) => (
            <Link
              key={c}
              to={`/download/${c.replace(/\s/g, '')}`}
              className={c.replace(/\s/g, '') === category ? 'active' : ''}
            >
              <h2>{c === 'os' ? t('download.operatingSystems') : c === 'app' ? t('download.apps') : c === 'font' ? t('download.fonts') : c}</h2>
            </Link>
          ))}
        </div>
      </header>
      <div className="distro-urls-container">
        <div className="distro-panel">
          <div className="mini-search">
            <span className="material-icons" style={{ fontSize: 16 }}>search</span>
            <input
              ref={filterInputRef}
              value={distroFilter}
              onChange={(e) => setDistroFilter(e.target.value)}
              placeholder={t('download.filterPlaceholder')}
            />
          </div>
          <div className="distro-list">
            {distros.map(([d, c]) => {
              const nc = c.replace(/\s/g, '');
              const nd = d.replace(/\s/g, '');
              return (
                <Link
                  key={nd}
                  to={`/download/${nc}/${nd}`}
                  className={nd === distro ? 'active' : ''}
                >
                  <h3>{d}</h3>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="urls">
          {matchingUrls.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-muted)' }}>
              {distro ? t('download.noDownloads', { distro }) : t('download.selectDistro')}
            </div>
          ) : (
            <ul>
              {matchingUrls.map(({ name, url }, idx) => (
                <li key={`${name}-${idx}`}>
                  <a href={url} target="_blank" rel="noopener">{name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}