import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useMirrors, useHelpRoutes } from '@/lib/client/mirrors';
import { groupBy } from '@/lib/client/utils';
import { Summary } from '@/components/Status';
import { useTranslation } from '@/i18n';
import type { MirrorEntry } from '@/lib/client/types';

interface MirrorGroup {
  name: string;
  entries: MirrorEntry[];
}

type HelpRoutes = Record<string, { title: string; cname: string }>;

function formatRFC3339(ts: number): string {
  if (ts <= 0) return '-';
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = d.getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
}

function GroupCard({
  group,
  expanded,
  onToggle,
  helpRoutes,
}: {
  group: MirrorGroup;
  expanded: boolean;
  onToggle: () => void;
  helpRoutes: HelpRoutes;
}) {
  const { t } = useTranslation();
  const statuses = group.entries.map((e) => e.status);
  const lastUpdateTs = Math.max(0, ...group.entries.map((e) => e.last_update_ts));
  const isGit = group.name.endsWith('.git');
  const href = isGit ? `/git/${group.name}/` : `/${group.name}/`;
  const helpTo = useMemo(() => {
    const key = Object.keys(helpRoutes).find((k) => helpRoutes[k]?.cname === group.name);
    return key ?? null;
  }, [helpRoutes, group.name]);
  return (
    <div className={`group${expanded ? ' group-expanded' : ''}`}>
      <div className="group-header" onClick={onToggle}>
        <h2 className="heading">
          <span className="material-icons">
            {expanded ? 'expand_more' : 'chevron_right'}
          </span>
          <a href={href}>{group.name}</a>
          {helpTo && (
            <Link to={helpTo} className="help-link" title="Help">
              <span className="material-icons">help_outline</span>
            </Link>
          )}
        </h2>
        <Summary statuses={statuses} lastUpdateTs={lastUpdateTs} />
      </div>
      <div className="group-items">
        {expanded &&
          group.entries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((entry) => (
              <div key={entry.name}>
                {entry.upstream && (
                  <div className="upstream">
                    <span className="material-icons">outbound</span>
                    {entry.upstream}
                  </div>
                )}
                <div className="timestamps">
                  <span className="material-icons">schedule</span>
                  <div className="timestamps-list">
                    <div><span className="ts-label">{t('home.lastUpdate')}</span> {formatRFC3339(entry.last_update_ts)}</div>
                    <div><span className="ts-label">{t('home.lastStarted')}</span> {formatRFC3339(entry.last_started_ts)}</div>
                    <div><span className="ts-label">{t('home.lastEnded')}</span> {formatRFC3339(entry.last_ended_ts)}</div>
                    <div><span className="ts-label">{t('home.nextSchedule')}</span> {formatRFC3339(entry.next_schedule_ts)}</div>
                  </div>
                </div>
                {entry.size && (
                  <div className="size">
                    <span className="material-icons">save</span>
                    {entry.size}
                  </div>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}

export default function Mirrors() {
  const { data: mirrors, error, isLoading } = useMirrors();
  const { data: helpRoutes } = useHelpRoutes();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [columnCount, setColumnCount] = useState(1);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const mirrorsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        filterInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleGroup = useCallback((name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const groups = useMemo(() => {
    if (!mirrors) return [];
    const grouped = groupBy(mirrors, (m) => m.name);
    return Object.entries(grouped)
      .map(([name, entries]) => ({
        name,
        entries,
        sortKey: name.toLowerCase(),
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [mirrors]);

  const regex = useMemo(() => {
    if (!filter) return null;
    try {
      return new RegExp(filter, 'i');
    } catch {
      return null;
    }
  }, [filter]);

  const filtered = useMemo(() => {
    if (!regex) return groups.map((g) => ({ ...g, filtered: false }));
    return groups
      .map((g) => {
        const match = regex.exec(g.name);
        return { ...g, filtered: match === null, index: match?.index ?? 1e15 };
      })
      .sort((a, b) => {
        if (a.index === b.index) return a.sortKey.localeCompare(b.sortKey);
        return (a.index ?? 0) - (b.index ?? 0);
      });
  }, [groups, regex]);

  useLayoutEffect(() => {
    const el = mirrorsRef.current;
    if (!el) return;

    const update = () => {
      const style = getComputedStyle(el);
      const width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setColumnCount(Math.max(1, Math.floor((width + 36) / (380 + 36))));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered]);

  const shownCount = filtered.filter((g) => !g.filtered).length;

  const visibleGroups = filtered.filter((g) => !g.filtered);
  const columns: typeof visibleGroups[] = Array.from({ length: columnCount }, () => []);
  visibleGroups.forEach((group, index) => columns[index % columnCount]?.push(group));

  if (error) return <div className="mirrorz"><div className="toolbar">{t('home.error')}</div></div>;
  if (isLoading) return <div className="mirrorz"><div className="toolbar">{t('home.loading')}</div></div>;

  return (
    <div className="mirrorz">
      <div className="toolbar">
        <div className="search">
          <span className={`search-leading${filter ? '' : ' empty'}`}>
            <span className="material-icons" aria-hidden="true">search</span>
          </span>
          <input
            ref={filterInputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('home.filterPlaceholder')}
          />
          <button
            type="button"
            className="search-clear"
            onClick={() => setFilter('')}
            disabled={!filter}
            title={t('home.clearFilter')}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <span className="result-count">
          {t('home.mirrorCount', { shown: shownCount, total: groups.length })}
        </span>
      </div>
      <div className="mirrors" ref={mirrorsRef}>
        {columns.map((column, columnIndex) => (
          <div className="mirror-column" key={columnIndex}>
            {column.map((group) => (
              <GroupCard
                key={group.name}
                group={group}
                expanded={expandedGroups.has(group.name)}
                onToggle={() => toggleGroup(group.name)}
                helpRoutes={helpRoutes ?? {}}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}