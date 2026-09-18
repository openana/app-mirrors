import { useCallback } from 'react';
import { useTranslation } from './I18nContext';

const TIME_SCALES: [number, string][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [30, 'day'],
  [365, 'month'],
  [1e15, 'year'],
];

export function useLocalizedTime() {
  const { t } = useTranslation();

  const relativeTime = useCallback(
    (timestamp: number): string => {
      if (!timestamp) return '';
      const now = Date.now();
      const dateValue = timestamp * 1000;
      const isPast = now > dateValue;
      let offset = Math.abs(now - dateValue) / 1000;

      for (const [scale, unit] of TIME_SCALES) {
        if (offset < scale) {
          const n = Math.round(offset);
          if (isPast) {
            if (n === 0) return t('time.justNow');
            return t(`time.${unit === 'second' ? 'secondsAgo' : n === 1 ? `${unit}Ago` : `${unit}sAgo`}`, { n });
          }
          return t(`time.in${unit.charAt(0).toUpperCase() + unit.slice(1)}${n === 1 ? '' : 's'}`, { n });
        }
        offset /= scale;
      }
      return '';
    },
    [t],
  );

  const absoluteTime = useCallback(
    (timestamp: number): string => {
      if (!timestamp) return '';
      const d = new Date(timestamp * 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    [],
  );

  return { relativeTime, absoluteTime };
}