import { useCallback, useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { useChart } from './useChart';
import { buildAgeOption, chartHeight, type AgeLabels } from './options';
import { escapeHtml, type SyncRow } from '@/lib/sync';
import { formatRFC3339 } from '@/lib/client/utils';
import type { ChartPalette } from '@/lib/chart-theme';
import { useTranslation } from '@/i18n';
import { useLocalizedTime } from '@/i18n/localized-time';

interface Props {
  rows: SyncRow[];
  palette: ChartPalette;
  onRowClick?: (name: string) => void;
}

export default function AgeBars({ rows, palette, onRowClick }: Props) {
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
    const labels: AgeLabels = {
      lastUpdate: t('home.lastUpdate'),
      age: (x) => t('sync.ageValue', { x }),
      timestamp: (v) =>
        v > 0
          ? `${escapeHtml(formatRFC3339(v))} <span style="opacity:.7">(${escapeHtml(relativeTime(v))})</span>`
          : '-',
    };
    return buildAgeOption(rows, palette, labels);
  }, [rows, palette, t, relativeTime]);

  const ref = useChart(option, handleClick);

  return (
    <div
      ref={ref}
      className="chart"
      role="img"
      aria-label={t('sync.ageTitle')}
      style={{ height: chartHeight(rows.length) }}
    />
  );
}
