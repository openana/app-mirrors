import { useCallback, useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { useChart } from './useChart';
import { buildTimelineOption, chartHeight, type TimelineLabels } from './options';
import { escapeHtml, type SyncRow } from '@/lib/sync';
import { formatRFC3339 } from '@/lib/client/utils';
import type { ChartPalette } from '@/lib/chart-theme';
import { useTranslation } from '@/i18n';
import { useLocalizedTime } from '@/i18n/localized-time';

interface Props {
  rows: SyncRow[];
  now: number;
  palette: ChartPalette;
  onRowClick?: (name: string) => void;
}

export default function SyncTimeline({ rows, now, palette, onRowClick }: Props) {
  const { t } = useTranslation();
  const { relativeTime } = useLocalizedTime();

  const handleClick = useCallback(
    (params: unknown) => {
      const index = (params as { dataIndex?: number } | undefined)?.dataIndex;
      const row = index !== undefined ? rows[index] : undefined;
      if (row) onRowClick?.(row.name);
    },
    [rows, onRowClick],
  );

  const option = useMemo<EChartsCoreOption | null>(() => {
    if (rows.length === 0) return null;
    const labels: TimelineLabels = {
      now: t('sync.now'),
      duration: t('sync.duration'),
      lastUpdate: t('home.lastUpdate'),
      lastStarted: t('home.lastStarted'),
      lastEnded: t('home.lastEnded'),
      nextSchedule: t('home.nextSchedule'),
      unscheduled: t('sync.unscheduled'),
      running: (x) => t('sync.running', { x }),
      overdue: (x) => t('sync.overdue', { x }),
      timestamp: (v) =>
        v > 0
          ? `${escapeHtml(formatRFC3339(v))} <span style="opacity:.7">(${escapeHtml(relativeTime(v))})</span>`
          : '-',
    };
    return buildTimelineOption(rows, now, palette, labels);
  }, [rows, now, palette, t, relativeTime]);

  const ref = useChart(option, handleClick);

  return (
    <div
      ref={ref}
      className="chart"
      role="img"
      aria-label={t('sync.timelineTitle')}
      style={{ height: chartHeight(rows.length) }}
    />
  );
}
