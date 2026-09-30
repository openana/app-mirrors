import type { EChartsCoreOption } from 'echarts/core';
import { escapeHtml, formatDuration, type SyncRow } from '@/lib/sync';
import { statusColor, type ChartPalette } from '@/lib/chart-theme';

/**
 * Pure echarts option builders for the sync page charts. No React, no
 * echarts runtime — so the options (including `renderItem`) can be smoke-
 * tested headlessly (see .scratch/sync-state/).
 */

/** Shared chart geometry: one row per Mirror Entry, fixed row height. */
export const CHART_ROW_H = 26;
export const CHART_GRID_TOP = 12;
export const CHART_GRID_BOTTOM = 26;
export const CHART_GRID_LEFT = 110;
export const CHART_GRID_RIGHT = 18;

export function chartHeight(rowCount: number): number {
  return rowCount * CHART_ROW_H + CHART_GRID_TOP + CHART_GRID_BOTTOM;
}

const MIN_BAR_W = 4; // Q14: duration is hover detail; keep tiny runs visible
const WINDOW_BACK_S = 24 * 3600; // Q6: fixed relative window
const WINDOW_FWD_S = 12 * 3600;

const LOG_MIN = 2.5; // log10 seconds ≈ 5 minutes
const TICK_STEP = 0.5; // half a decade
const MIN_BAR_L = 0.015; // decades — keep just-updated mirrors visible

export interface TimelineLabels {
  now: string;
  duration: string;
  lastUpdate: string;
  lastStarted: string;
  lastEnded: string;
  nextSchedule: string;
  unscheduled: string;
  /** "running for {x}" */
  running: (duration: string) => string;
  /** "overdue by {x}" */
  overdue: (duration: string) => string;
  /** Absolute + relative timestamp as HTML, or `-`. */
  timestamp: (ts: number) => string;
}

export interface AgeLabels {
  lastUpdate: string;
  /** "{x} since last update" */
  age: (duration: string) => string;
  timestamp: (ts: number) => string;
}

interface RenderApi {
  value: (i: number) => number | string | null;
  coord: (point: (number | string | null)[]) => [number, number];
  size: (size: number[]) => [number, number];
}

interface TooltipParams {
  dataIndex: number;
}

/**
 * Gantt-style sync timeline (the primary chart). One row per Mirror Entry:
 * a bar for the latest Sync Run (to the now-line while running), a dot at the
 * last update, a tick at the next schedule, and a dashed now-line. Marks older
 * than the window clamp to the left edge behind a "«" marker (Q6).
 */
export function buildTimelineOption(
  rows: SyncRow[],
  now: number,
  palette: ChartPalette,
  labels: TimelineLabels,
): EChartsCoreOption {
  const nowMs = now * 1000;
  const windowMin = (now - WINDOW_BACK_S) * 1000;
  const windowMax = (now + WINDOW_FWD_S) * 1000;

  const renderItem = (_params: unknown, api: RenderApi) => {
    // renderItem params carry no data item (only dataIndex*), so look the
    // row up by its encoded index.
    const row = rows[Number(api.value(0))];
    if (!row) return { type: 'group', children: [] };
    const rowIndex = Number(api.value(0));
    const [, y] = api.coord([windowMin, rowIndex]);
    const rowH = api.size([0, 1])[1];
    const barH = Math.max(8, rowH * 0.55);
    const color = statusColor(palette, row.status);
    const children: Record<string, unknown>[] = [];
    let clamped = false;

    // Row hit band: the full row strip is hoverable/clickable (tooltip and
    // click anywhere in the row, not just on the marks). Every row gets one;
    // odd rows carry the zebra fill, even rows stay transparent so the grid
    // guides remain visible — zrender hit-tests by bounding rect, so a
    // transparent fill is still interactive while painting nothing.
    {
      const [bx0] = api.coord([windowMin, rowIndex]);
      const [bx1] = api.coord([windowMax, rowIndex]);
      const zebra = rowIndex % 2 === 1;
      const bandFill = zebra ? palette.bgSubtle : 'transparent';
      children.push({
        type: 'rect',
        shape: { x: bx0, y: y - rowH / 2, width: bx1 - bx0, height: rowH },
        style: { fill: bandFill, cursor: 'pointer' },
        // Hover should *fade* the band so the time guides show through, not
        // trigger echarts' default lift-color brightening. Pinning `fill` in
        // the emphasis style suppresses the default color lift; the zebra
        // rows drop to 35% opacity, transparent rows stay invisible.
        emphasis: {
          style: { fill: bandFill, opacity: zebra ? 0.35 : 1 },
        },
      });
    }

    // Sync Run interval; running syncs extend to the now-line (Q7).
    const startMs = row.startedTs > 0 ? row.startedTs * 1000 : null;
    const endMs = row.running ? nowMs : row.endedTs > 0 ? row.endedTs * 1000 : null;
    if (startMs !== null) {
      if (startMs < windowMin || (endMs !== null && endMs < windowMin)) clamped = true;
      const x0 = Math.max(startMs, windowMin);
      const [px0] = api.coord([x0, rowIndex]);
      const [px1] = api.coord([Math.max(endMs ?? x0, x0), rowIndex]);
      children.push({
        type: 'rect',
        shape: { x: px0, y: y - barH / 2, width: Math.max(MIN_BAR_W, px1 - px0), height: barH, r: 2 },
        style: {
          fill: color,
          opacity: row.running ? 0.45 : 0.85,
          stroke: row.running ? color : undefined,
          lineDash: row.running ? [4, 3] : undefined,
          lineWidth: row.running ? 1 : 0,
          cursor: 'pointer',
        },
      });
    }

    // Last update marker.
    if (row.lastUpdateTs > 0) {
      const rawMs = row.lastUpdateTs * 1000;
      if (rawMs < windowMin) clamped = true;
      const [x] = api.coord([Math.max(rawMs, windowMin), rowIndex]);
      children.push({
        type: 'circle',
        shape: { cx: x, cy: y, r: 3.5 },
        style: { fill: color, stroke: palette.bg, lineWidth: 1, cursor: 'pointer' },
      });
    }

    // Next schedule tick (Q15: geometry only — past the now-line means
    // overdue; color stays reserved for Status).
    if (row.nextTs !== null && row.nextTs * 1000 <= windowMax) {
      const [x] = api.coord([row.nextTs * 1000, rowIndex]);
      children.push({
        type: 'line',
        shape: { x1: x, y1: y - barH / 2 - 2, x2: x, y2: y + barH / 2 + 2 },
        style: { stroke: palette.textFaint, lineWidth: 2, cursor: 'pointer' },
      });
    }

    if (clamped) {
      const [x] = api.coord([windowMin, rowIndex]);
      children.push({
        type: 'text',
        style: {
          x: x + 3,
          y: y - barH / 2 - 3,
          text: '«',
          fill: palette.textMuted,
          fontSize: 11,
          textVerticalAlign: 'bottom',
        },
      });
    }

    return { type: 'group', children };
  };

  const tooltipFormatter = (params: TooltipParams) => {
    const row = rows[params.dataIndex];
    if (!row) return '';
    const line = (label: string, value: string) =>
      `<div style="display:flex;gap:14px;justify-content:space-between"><span style="opacity:.75">${label}</span><span>${value}</span></div>`;
    const next = row.nextTs
      ? `${labels.timestamp(row.nextTs)}${
          row.overdue
            ? ` <span style="opacity:.7">(${escapeHtml(labels.overdue(formatDuration(Math.max(0, now - row.nextTs))))})</span>`
            : ''
        }`
      : escapeHtml(labels.unscheduled);
    const ended = row.running
      ? escapeHtml(labels.running(formatDuration(Math.max(0, now - row.startedTs))))
      : labels.timestamp(row.endedTs);
    const duration =
      row.durationS !== null ? escapeHtml(formatDuration(row.durationS)) : '-';
    return (
      `<div style="font-weight:700">${escapeHtml(row.name)}</div>` +
      `<div style="display:flex;align-items:center;gap:6px;margin:2px 0 6px">` +
      `<span style="width:8px;height:8px;border-radius:50%;background:${statusColor(palette, row.status)}"></span>` +
      `${escapeHtml(row.status)}</div>` +
      line(labels.lastUpdate, labels.timestamp(row.lastUpdateTs)) +
      line(labels.lastStarted, labels.timestamp(row.startedTs)) +
      line(labels.lastEnded, ended) +
      line(labels.nextSchedule, next) +
      line(labels.duration, duration)
    );
  };

  return {
    grid: {
      top: CHART_GRID_TOP,
      bottom: CHART_GRID_BOTTOM,
      left: CHART_GRID_LEFT,
      right: CHART_GRID_RIGHT,
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      textStyle: { color: palette.text, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: 'time',
      min: windowMin,
      max: windowMax,
      axisLabel: {
        color: palette.textMuted,
        fontSize: 11,
        // ECharts' default time-axis labels mangle day boundaries ("30",
        // "Oct"); show a date at midnight, HH:mm otherwise.
        formatter: (value: number) => {
          const d = new Date(value);
          const pad = (n: number) => String(n).padStart(2, '0');
          return d.getHours() === 0 && d.getMinutes() === 0
            ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
      },
      axisLine: { lineStyle: { color: palette.border } },
      splitLine: { show: true, lineStyle: { color: palette.border, opacity: 0.6 } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((r) => r.name),
      axisLabel: { color: palette.textMuted, fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: palette.border } },
    },
    series: [
      {
        type: 'custom',
        encode: { x: [1, 2, 3, 4], y: 0 },
        clip: true,
        renderItem,
        data: rows.map((row, index) => [
          index,
          row.startedTs > 0 ? row.startedTs * 1000 : null,
          row.running ? nowMs : row.endedTs > 0 ? row.endedTs * 1000 : null,
          row.lastUpdateTs > 0 ? row.lastUpdateTs * 1000 : null,
          row.nextTs !== null ? row.nextTs * 1000 : null,
        ]),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: palette.textMuted, type: 'dashed', width: 1 },
          label: {
            show: true,
            // 'insideStartBottom': with the inverse y-axis the line's start
            // is the visual top.
            position: 'insideStartBottom',
            rotate: 0,
            formatter: labels.now,
            color: palette.textMuted,
            fontSize: 11,
          },
          data: [{ xAxis: nowMs }],
        },
      },
    ],
  };
}

/** Round a tick value to a readable duration: 5m, 15m, 1h, 1d, ... */
function humanNice(seconds: number): string {
  const NICE = [1, 2, 5, 10, 15, 30];
  const pick = (v: number) => NICE.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  if (seconds < 60) return `${pick(seconds)}s`;
  if (seconds < 3600) return `${pick(seconds / 60)}m`;
  if (seconds < 86400) return `${pick(seconds / 3600)}h`;
  if (seconds < 2592000) return `${pick(seconds / 86400)}d`;
  return `${pick(seconds / 2592000)}mo`;
}

/**
 * Age chart (the secondary chart): one row per Mirror Entry, bar = time since
 * the last update on a log axis (Q5), colored by Status. Rows are expected
 * pre-sorted by age descending (Q11, amended — no grouping by Status here,
 * unlike the timeline).
 */
export function buildAgeOption(
  rows: SyncRow[],
  palette: ChartPalette,
  labels: AgeLabels,
): EChartsCoreOption | null {
  const stale = rows.filter((r) => r.ageS !== null);
  if (stale.length === 0) return null;
  const maxAge = Math.max(...stale.map((r) => r.ageS as number));

  const tooltipFormatter = (params: TooltipParams) => {
    const row = rows[params.dataIndex];
    if (!row) return '';
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor(palette, row.status)}"></span>`;
    return (
      `<div style="font-weight:700">${escapeHtml(row.name)}</div>` +
      `<div style="margin:2px 0 6px">${dot} ${escapeHtml(row.status)}</div>` +
      `<div>${escapeHtml(labels.age(formatDuration(row.ageS ?? 0)))}</div>` +
      `<div style="opacity:.75">${labels.lastUpdate} ${labels.timestamp(row.lastUpdateTs)}</div>`
    );
  };

  return {
    grid: {
      top: CHART_GRID_TOP,
      bottom: CHART_GRID_BOTTOM,
      left: CHART_GRID_LEFT,
      right: CHART_GRID_RIGHT,
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      textStyle: { color: palette.text, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: 'value',
      min: LOG_MIN,
      max: Math.max(7, Math.ceil(Math.log10(maxAge))),
      interval: TICK_STEP,
      axisLabel: {
        color: palette.textMuted,
        fontSize: 11,
        formatter: (v: number) => humanNice(10 ** v),
      },
      axisLine: { lineStyle: { color: palette.border } },
      splitLine: { show: true, lineStyle: { color: palette.border, opacity: 0.6 } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((r) => r.name),
      axisLabel: { color: palette.textMuted, fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: palette.border } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 12,
        data: rows.map((row) =>
          row.ageS === null
            ? null
            : {
                value: Math.max(LOG_MIN + MIN_BAR_L, Math.log10(Math.max(row.ageS, 60))),
                itemStyle: { color: statusColor(palette, row.status), opacity: 0.85 },
              },
        ),
      },
    ],
  };
}
