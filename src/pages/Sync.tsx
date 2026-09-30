import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMirrors } from '@/lib/client/mirrors';
import { deriveSyncRow, mirrorHref, sortRows, sortRowsByAge } from '@/lib/sync';
import { readPalette, type ChartPalette } from '@/lib/chart-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/i18n';
import SyncTimeline from '@/components/sync/SyncTimeline';
import AgeBars from '@/components/sync/AgeBars';

const TICK_MS = 60_000; // Q8: 60 s heartbeat for the now-line and running bars

function useNowTick(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setNow(Math.floor(Date.now() / 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * The palette must be read *after* ThemeProvider writes `data-theme` to
 * <html> (its effect runs after this component's), so read again on the next
 * frame and whenever the theme changes.
 */
function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  const [palette, setPalette] = useState<ChartPalette>(() => readPalette());
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPalette(readPalette()));
    return () => cancelAnimationFrame(raf);
  }, [theme]);
  return palette;
}

/** Sync page: the downloads page layout, one chart per tab. */
export default function Sync() {
  const { tab } = useParams();
  const activeTab = tab === 'age' ? 'age' : 'timeline';
  const { data: mirrors, error, isLoading } = useMirrors();
  const { t } = useTranslation();
  const now = useNowTick();
  const palette = useChartPalette();

  const rows = useMemo(
    () => (mirrors ? sortRows(mirrors.map((m) => deriveSyncRow(m, now))) : []),
    [mirrors, now],
  );
  // The age chart orders purely by age (Q11, amended).
  const ageRows = useMemo(() => sortRowsByAge(rows), [rows]);

  const openMirror = (name: string) => window.location.assign(mirrorHref(name));

  const head = (
    <header className="page-head">
      <h1 className="tagline">{t('sync.title')}</h1>
      <p className="tagline-sub">{t('sync.subtitle')}</p>
      <div className="category-tabs">
        <Link to="/sync/timeline" className={activeTab === 'timeline' ? 'active' : ''}>
          <h2>{t('sync.timelineTitle')}</h2>
        </Link>
        <Link to="/sync/age" className={activeTab === 'age' ? 'active' : ''}>
          <h2>{t('sync.ageTitle')}</h2>
        </Link>
      </div>
    </header>
  );

  if (error) {
    return (
      <div className="sync">
        <div className="page-head">{t('sync.error')}</div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="sync">
        <div className="page-head">{t('sync.loading')}</div>
      </div>
    );
  }

  return (
    <div className="sync">
      {head}
      <div className="sync-body">
        {activeTab === 'timeline' ? (
          <>
            <div className="chart-legend">
              <span><i className="legend-swatch run" />{t('sync.legendRun')}</span>
              <span><i className="legend-swatch dot" />{t('sync.legendUpdate')}</span>
              <span><i className="legend-swatch tick" />{t('sync.legendNext')}</span>
              <span><i className="legend-swatch now" />{t('sync.legendNow')}</span>
            </div>
            <section className="chart-card">
              <SyncTimeline rows={rows} now={now} palette={palette} onRowClick={openMirror} />
            </section>
          </>
        ) : (
          <section className="chart-card">
            <AgeBars rows={ageRows} palette={palette} onRowClick={openMirror} />
          </section>
        )}
      </div>
    </div>
  );
}
