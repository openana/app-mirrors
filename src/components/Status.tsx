import { useLocalizedTime } from '@/i18n/localized-time';

const STATUS_CLASS: Record<string, string> = {
  success: 'success',
  syncing: 'syncing',
  failed: 'failed',
  'pre-syncing': 'pending',
  paused: 'pause',
  proxy: 'proxy',
  unknown: 'unknown',
};

const STATUS_ICON: Record<string, string> = {
  success: 'done',
  syncing: 'sync',
  failed: 'error',
  'pre-syncing': 'pending',
  paused: 'pause',
  proxy: 'cached',
  unknown: 'info',
};

const MAIN_STATUSES = ['success', 'syncing', 'failed', 'pre-syncing', 'paused', 'proxy', 'unknown'];

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] || 'unknown';
  const icon = STATUS_ICON[status] || 'info';
  return (
    <span className={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="material-icons" style={{ fontSize: 14 }}>{icon}</span>
      {status}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] || 'unknown';
  return <span className={`status-dot ${cls}`} />;
}

export function Summary({ statuses, lastUpdateTs }: { statuses: string[]; lastUpdateTs: number }) {
  const { relativeTime } = useLocalizedTime();
  const present = new Set(statuses.map((s) => STATUS_CLASS[s] || 'unknown'));
  return (
    <h2 className="summary">
      {MAIN_STATUSES.filter((s) => present.has(STATUS_CLASS[s] || 'unknown')).map((s) => {
        const cls = STATUS_CLASS[s] || 'unknown';
        const icon = STATUS_ICON[s] || 'info';
        return (
          <span className={cls} key={s}>
            <span className="material-icons" style={{ fontSize: 14 }}>{icon}</span>
            {lastUpdateTs > 0 && relativeTime(lastUpdateTs)}
          </span>
        );
      })}
    </h2>
  );
}

export function StatusList({ status, lastUpdateTs }: { status: string; lastUpdateTs: number }) {
  const { relativeTime } = useLocalizedTime();
  const cls = STATUS_CLASS[status] || 'unknown';
  const icon = STATUS_ICON[status] || 'info';
  return (
    <div className={`status ${cls}`}>
      <span className="material-icons">{icon}</span>
      <div>{status}</div>
      {lastUpdateTs > 0 && (
        <div className="status-time">{relativeTime(lastUpdateTs)}</div>
      )}
    </div>
  );
}