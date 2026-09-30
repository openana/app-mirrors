/* Headless smoke test: run the sync chart option builders through echarts'
   SSR renderer so `renderItem` and the axes actually execute. */
import { readFileSync } from 'node:fs';
import * as echarts from 'echarts';
import {
  deriveSyncRow,
  sortRows,
  sortRowsByAge,
  type SyncRow,
} from '../../src/lib/sync';
import type { MirrorEntry } from '../../src/lib/client/types';
import type { ChartPalette } from '../../src/lib/chart-theme';
import {
  buildTimelineOption,
  buildAgeOption,
  chartHeight,
  type TimelineLabels,
  type AgeLabels,
} from '../../src/components/sync/options';

const palette: ChartPalette = {
  text: '#1d2429',
  textMuted: '#5f6c76',
  textFaint: '#8b969e',
  border: '#e2e5e9',
  bg: '#ffffff',
  bgSubtle: '#f5f6f7',
  status: {
    success: '#1a7f37',
    syncing: '#0969da',
    'pre-syncing': '#0e7f8c',
    failed: '#c9392e',
    paused: '#6e7781',
    proxy: '#9a6700',
    unknown: '#6e7781',
  },
};

const ts = (v: number) => (v > 0 ? new Date(v * 1000).toISOString() : '-');
const timelineLabels: TimelineLabels = {
  now: 'now',
  duration: 'Duration:',
  lastUpdate: 'Last update:',
  lastStarted: 'Last started:',
  lastEnded: 'Last ended:',
  nextSchedule: 'Next schedule:',
  unscheduled: 'unscheduled',
  running: (x) => `running for ${x}`,
  overdue: (x) => `overdue by ${x}`,
  timestamp: ts,
};
const stalenessLabels: AgeLabels = {
  lastUpdate: 'Last update:',
  age: (x) => `${x} since last update`,
  timestamp: ts,
};

function render(name: string, option: object, rows: number) {
  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: 1200,
    height: chartHeight(rows),
  });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  const shapes = (svg.match(/<(rect|circle|line|text|path)\b/g) ?? []).length;
  console.log(`${name}: ok, svg ${svg.length} bytes, ${shapes} shape elements`);
  chart.dispose();
  return svg;
}

const entries = JSON.parse(
  readFileSync('/home/user2/Devel/app-mirrors-2/reference/mirrors.json', 'utf8'),
) as MirrorEntry[];
const now = Math.max(...entries.flatMap((e) => [e.last_update_ts, e.last_started_ts, e.last_ended_ts])) + 60;
const rows = sortRows(entries.map((e) => deriveSyncRow(e, now)));

const timelineOpt = buildTimelineOption(rows, now, palette, timelineLabels);
const timelineSvg = render('timeline', timelineOpt, rows.length);
if (!timelineSvg.includes('alpine')) throw new Error('timeline missing row labels');
// Day boundaries must render as dates (MM-DD), not echarts' "30"/"Oct".
if (!/>\d{2}-\d{2}</.test(timelineSvg)) throw new Error('timeline missing MM-DD date tick labels');

const stalenessOpt = buildAgeOption(sortRowsByAge(rows), palette, stalenessLabels);
if (!stalenessOpt) throw new Error('staleness option is null');
console.log(
  'age order (first 5):',
  sortRowsByAge(rows).slice(0, 5).map((r) => `${r.name}[${r.ageS === null ? 'null' : Math.round(r.ageS / 3600)}h]`).join(' '),
);
render('staleness', stalenessOpt, rows.length);

// Edge cases: running with end < start, clamped marks, missing fields, odd statuses.
const edgeRows: SyncRow[] = sortRows([
  deriveSyncRow(
    { name: 'running.git', status: 'syncing', upstream: '', size: '', is_master: true,
      last_update_ts: now - 3600, last_started_ts: now - 1800, last_ended_ts: now - 7200,
      next_schedule_ts: 0 },
    now,
  ),
  deriveSyncRow(
    { name: 'ancient', status: 'failed', upstream: '', size: '', is_master: true,
      last_update_ts: now - 80 * 86400, last_started_ts: now - 80 * 86400,
      last_ended_ts: now - 80 * 86400 + 60, next_schedule_ts: now - 3600 },
    now,
  ),
  deriveSyncRow(
    { name: 'paused-mirror', status: 'paused', upstream: '', size: '', is_master: true,
      last_update_ts: 0, last_started_ts: 0, last_ended_ts: 0, next_schedule_ts: 0 },
    now,
  ),
  deriveSyncRow(
    { name: 'proxy-mirror', status: 'proxy', upstream: '', size: '', is_master: true,
      last_update_ts: now - 60, last_started_ts: 0, last_ended_ts: 0,
      next_schedule_ts: now + 7200 },
    now,
  ),
]);
console.log(
  'edge rows:',
  edgeRows.map((r) => `${r.name}[${r.status},running=${r.running},overdue=${r.overdue},dur=${r.durationS}]`).join(' '),
);
render('timeline (edge cases)', buildTimelineOption(edgeRows, now, palette, timelineLabels), edgeRows.length);
const edgeStale = buildAgeOption(sortRowsByAge(edgeRows), palette, stalenessLabels);
if (!edgeStale) throw new Error('edge staleness option is null');
render('staleness (edge cases)', edgeStale, edgeRows.length);
console.log('ALL OK');
