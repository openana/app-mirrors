import type { MirrorEntry } from './client/types';

/**
 * Pure sync-state derivations from a Mirror Entry snapshot (see
 * reference/mirrors.json and CONTEXT.md: Status, Sync Run, Staleness).
 * No echarts imports — this stays testable and framework-free.
 */

/** Triage severity order (Q11): problems first. */
export const SEVERITY_ORDER = [
  'failed',
  'pre-syncing',
  'syncing',
  'unknown',
  'paused',
  'proxy',
  'success',
] as const;

const SEVERITY_RANK: Record<string, number> = Object.fromEntries(
  SEVERITY_ORDER.map((s, i) => [s, i]),
);
const FALLBACK_RANK: number = SEVERITY_ORDER.indexOf('unknown');

export function severityRank(status: string): number {
  return SEVERITY_RANK[status] ?? FALLBACK_RANK;
}

export interface SyncRow {
  /** cname — the chart row identity (Q2). */
  name: string;
  status: string;
  severity: number;
  /** Last update timestamp, 0 = missing. */
  lastUpdateTs: number;
  /** Sync Run start timestamp, 0 = missing. */
  startedTs: number;
  /** Sync Run end timestamp, 0 = missing. */
  endedTs: number;
  /** A Sync Run without an end yet is still running (CONTEXT.md). */
  running: boolean;
  /** Sync Run duration in seconds, null when unknown. */
  durationS: number | null;
  /** Age in seconds, null when the mirror never updated. */
  ageS: number | null;
  /** Next scheduled sync, null = unscheduled. */
  nextTs: number | null;
  /** Schedule time has passed without a refetch yet (Q15). */
  overdue: boolean;
}

export function deriveSyncRow(entry: MirrorEntry, now: number): SyncRow {
  const status = entry.status || 'unknown';
  const startedTs = entry.last_started_ts > 0 ? entry.last_started_ts : 0;
  const endedTs = entry.last_ended_ts > 0 ? entry.last_ended_ts : 0;
  const lastUpdateTs = entry.last_update_ts > 0 ? entry.last_update_ts : 0;

  // Running: a start without an end, or an end older than the start (the feed
  // keeps the *previous* run's end while a sync is running — `rosdistro.git`).
  const running =
    (status === 'syncing' || status === 'pre-syncing') &&
    startedTs > 0 &&
    (endedTs === 0 || endedTs < startedTs);

  let durationS: number | null = null;
  if (startedTs > 0) {
    if (running) durationS = Math.max(0, now - startedTs);
    else if (endedTs >= startedTs) durationS = endedTs - startedTs;
  }

  return {
    name: entry.name,
    status,
    severity: severityRank(status),
    lastUpdateTs,
    startedTs,
    endedTs,
    running,
    durationS,
    ageS: lastUpdateTs > 0 ? Math.max(0, now - lastUpdateTs) : null,
    nextTs: entry.next_schedule_ts > 0 ? entry.next_schedule_ts : null,
    overdue: entry.next_schedule_ts > 0 && entry.next_schedule_ts < now,
  };
}

/** Q11: severity first, then age descending, then name. */
export function sortRows(rows: SyncRow[]): SyncRow[] {
  return [...rows].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity - b.severity;
    return compareByAge(a, b);
  });
}

/**
 * Q11 (amended): the age chart orders purely by age descending — no grouping
 * by Status. A missing last update is infinitely old.
 */
export function sortRowsByAge(rows: SyncRow[]): SyncRow[] {
  return [...rows].sort(compareByAge);
}

function compareByAge(a: SyncRow, b: SyncRow): number {
  const ageA = a.ageS ?? Number.POSITIVE_INFINITY;
  const ageB = b.ageS ?? Number.POSITIVE_INFINITY;
  if (ageA !== ageB) return ageB - ageA;
  return a.name.localeCompare(b.name);
}

/** Link target for a mirror, git-aware like the Mirrors page (Q9). */
export function mirrorHref(name: string): string {
  return name.endsWith('.git') ? `/git/${name}/` : `/${name}/`;
}

/** Duration like `28m`, `2h 5m`, `3d 4h` (language-neutral units). */
export function formatDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = s / 60;
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) {
    const hh = Math.floor(h);
    const mm = Math.round(m - 60 * hh);
    return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
  }
  const d = h / 24;
  if (d < 30) {
    const dd = Math.floor(d);
    const hh = Math.round(h - 24 * dd);
    return hh > 0 ? `${dd}d ${hh}h` : `${dd}d`;
  }
  return `${Math.round(d / 30)}mo`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
