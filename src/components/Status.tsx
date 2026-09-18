import { relativeTime } from '@/lib/client/utils';

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

export function Summary({ statuses }: { statuses: string[] }) {
  const counts: Record<string, number> = {};
  for (const s of statuses) {
    const cls = STATUS_CLASS[s] || 'unknown';
    counts[cls] = (counts[cls] || 0) + 1;
  }
  return (
    <h2 className="summary">
      {MAIN_STATUSES.map((s) => {
        const cls = STATUS_CLASS[s] || 'unknown';
        const count = counts[cls] || 0;
        if (count === 0) return null;
        const icon = STATUS_ICON[s] || 'info';
        return (
          <span className={cls} key={s}>
            {count}
            <span className="material-icons" style={{ fontSize: 14 }}>{icon}</span>
          </span>
        );
      })}
    </h2>
  );
}

export function StatusList({ status, lastUpdateTs }: { status: string; lastUpdateTs: number }) {
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