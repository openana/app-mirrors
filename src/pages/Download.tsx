import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useDownloadList } from '@/lib/client/downloads';

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
  const [distroFilter, setDistroFilter] = useState('');

  const { allCat, allDistro, urls } = useMemo(() => {
    if (!siteData) return { allCat: new Set<string>(), allDistro: {} as Record<string, string>, urls: [] as { site: string; urls: { name: string; url: string }[] }[] };

    const allCat = new Set<string>();
    const allDistro: Record<string, string> = {};
    const urlMap: Record<string, { name: string; url: string }[]> = {};

    for (const site of siteData) {
      for (const info of site.info) {
        allCat.add(info.category);
        allDistro[info.distro] = info.category;
        if (
          info.category.replace(/\s/g, '') === category &&
          info.distro.replace(/\s/g, '') === (distro || '')
        ) {
          const key = site.site.abbr;
          if (!urlMap[key]) urlMap[key] = [];
          urlMap[key].push(...info.urls);
        }
      }
    }

    const urls = Object.entries(urlMap).map(([site, urls]) => ({ site, urls }));
    return { allCat, allDistro, urls };
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

  if (error) return <div className="download-page"><div className="page-head">Failed to load downloads</div></div>;
  if (isLoading) return <div className="download-page"><div className="page-head">Loading...</div></div>;
  if (!allCat.has(category)) return <div className="download-page"><div className="page-head">Category not found</div></div>;

  const categories = Array.from(allCat).sort((a, b) => priority(a) - priority(b));
  const distros = Object.entries(allDistro)
    .filter(([, c]) => c.replace(/\s/g, '') === category)
    .filter(([d]) => !distroFilter || d.toLowerCase().includes(distroFilter.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="download-page">
      <header className="page-head">
        <h1 className="tagline">Download Browser</h1>
        <p className="tagline-sub">Browse available mirrors by category and distribution</p>
        <div className="category-tabs">
          {categories.map((c) => (
            <Link
              key={c}
              to={`/download/${c.replace(/\s/g, '')}`}
              className={c.replace(/\s/g, '') === category ? 'active' : ''}
            >
              <h2>{c === 'os' ? 'Operating Systems' : c}</h2>
            </Link>
          ))}
        </div>
      </header>
      <div className="distro-urls-container">
        <div className="distro-panel">
          <div className="mini-search">
            <span className="material-icons" style={{ fontSize: 16 }}>search</span>
            <input
              value={distroFilter}
              onChange={(e) => setDistroFilter(e.target.value)}
              placeholder="Filter..."
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
          {urls.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-muted)' }}>
              {distro ? `No downloads found for "${distro}"` : 'Select a distribution'}
            </div>
          ) : (
            urls.map(({ site, urls: siteUrls }) => (
              <div key={site}>
                <h3>{site}</h3>
                <ul>
                  {siteUrls.map(({ name, url }, idx) => (
                    <li key={`${site}-${name}-${idx}`}>
                      <a href={url} target="_blank" rel="noopener">{name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}