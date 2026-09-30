/**
 * Chart palette read from the design tokens (Q12). Status colors must match
 * the Status badges (`--st-*` via src/styles/_color.scss); everything else
 * only needs dark-mode correctness — echarts owns the rest of its chrome.
 */

export interface ChartPalette {
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  bg: string;
  bgSubtle: string;
  status: Record<string, string>;
}

/**
 * Status → CSS custom property, mirroring STATUS_CLASS in Status.tsx and the
 * class → `--c` mapping in src/styles/_color.scss.
 */
const STATUS_VAR: Record<string, string> = {
  success: '--st-success',
  syncing: '--st-syncing',
  'pre-syncing': '--st-pending',
  failed: '--st-failed',
  paused: '--st-unknown',
  proxy: '--st-cache',
  unknown: '--st-unknown',
};

const UNKNOWN_COLOR = '#6e7781';

const FALLBACK: ChartPalette = {
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
    paused: UNKNOWN_COLOR,
    proxy: '#9a6700',
    unknown: UNKNOWN_COLOR,
  },
};

export function readPalette(): ChartPalette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const status: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(STATUS_VAR)) {
    status[key] = v(cssVar, FALLBACK.status[key] ?? UNKNOWN_COLOR);
  }
  return {
    text: v('--text', FALLBACK.text),
    textMuted: v('--text-muted', FALLBACK.textMuted),
    textFaint: v('--text-faint', FALLBACK.textFaint),
    border: v('--border', FALLBACK.border),
    bg: v('--bg', FALLBACK.bg),
    bgSubtle: v('--bg-subtle', FALLBACK.bgSubtle),
    status,
  };
}

export function statusColor(palette: ChartPalette, status: string): string {
  return palette.status[status] ?? palette.status['unknown'] ?? UNKNOWN_COLOR;
}
