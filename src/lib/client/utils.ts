export function groupBy<T, K extends string>(
  list: T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  return list.reduce(
    (acc, item) => {
      const key = getKey(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

const TIME_SCALES: [number, string][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [30, 'day'],
  [365, 'month'],
  [1e15, 'year'],
];

export function relativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const dateValue = timestamp * 1000;
  const isPast = now > dateValue;
  let offset = Math.abs(now - dateValue) / 1000;

  for (const [scale, unit] of TIME_SCALES) {
    if (offset < scale) {
      const n = Math.round(offset);
      const label = n === 1 ? unit : `${unit}s`;
      return isPast ? `${n} ${label} ago` : `in ${n} ${label}`;
    }
    offset /= scale;
  }
  return '';
}

export function absoluteTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}